import Tesseract from 'tesseract.js';

const KUTRIM_API_KEY = import.meta.env.VITE_KUTRIM_API_KEY;
const KUTRIM_API_URL = "/api/krutrim/v1/chat/completions";

/**
 * UTILITY: Extracts text from an image URL using Tesseract.js
 */
const extractTextFromEvidence = async (imageUrl) => {
    try {
        console.log("Analyzing Image Evidence:", imageUrl);
        const { data: { text } } = await Tesseract.recognize(imageUrl, 'eng', {
            logger: m => console.log(m)
        });
        return text;
    } catch (error) {
        console.error("OCR Failed for image:", error);
        return "[Image Analysis Failed]";
    }
};

/**
 * UTILITY: Calls the Krutrim AI API to analyze the dispute.
 */
export const analyzeDispute = async (disputeId, description, messages, evidenceUrls = []) => {
    // Input Validation / Defaults
    const safeDesc = description || "No description provided.";
    const safeMessages = Array.isArray(messages) ? messages : [];

    console.log("Analyzing dispute with Krutrim...", { disputeId, evidenceCount: evidenceUrls.length });

    // 1. Process Evidence (OCR)
    let evidenceText = "";
    if (evidenceUrls && evidenceUrls.length > 0) {
        try {
            const ocrResults = await Promise.all(evidenceUrls.map(url => extractTextFromEvidence(url)));
            evidenceText = ocrResults.map((text, i) => `Evidence ${i + 1} Content:\n${text}`).join("\n\n");
        } catch (e) {
            console.error("Evidence processing failed", e);
            evidenceText = "Evidence analysis failed.";
        }
    }

    // Fallback mock response if API fails or Key is missing
    const fallbackResponse = {
        summary: "Unable to reach AI service. Showing cached analysis: The dispute centers around a disagreement regarding service delivery.",
        sentiment: "Neutral",
        suggestions: [
            "Review the original agreement.",
            "Discuss timelines openly.",
            "Check payment terms.",
            "Schedule a formal mediation session.",
            "Consult a legal expert if necessary."
        ],
        abusiveLanguageDetected: false,
        evidenceAnalysis: "Evidence not analyzed."
    };

    if (!KUTRIM_API_KEY) {
        console.warn("Kutrim API Key is missing. Check .env file.");
        return {
            ...fallbackResponse,
            summary: "⚠️ SYSTEM ERROR: The VITE_KUTRIM_API_KEY is missing. Please check your .env file and restart the server.",
            suggestions: ["Check .env file", "Restart Server", "Verify API Key"]
        };
    }

    // Construct the prompt
    const messageHistory = safeMessages.map(m => `${m.sender}: ${m.content}`).join("\n");

    // Robust System Prompt
    const systemPrompt = `You are a specialized Legal Dispute Mediator AI. Your ONLY job is to output a VALID JSON object. Do not include markdown formatting or conversational text.
    
    GUIDELINES:
    1. Analyze the dispute impartially.
    2. Provide **5 to 7** distinct resolution suggestions.
    3. Each suggestion MUST be **detailed and actionable** (approx 2-3 sentences each). Explain strictly "What to do" and "Why it helps".
    
    REQUIRED JSON STRUCTURE:
    {
      "summary": "A concise 2-sentence summary of the core conflict.",
      "sentiment": "One word: Neutral, Tense, Hostile, or Cooperative.",
      "suggestions": [
        "Suggestion 1: [Action]... [Reasoning]...",
        "Suggestion 2: [Action]... [Reasoning]...",
        "Suggestion 3: [Action]... [Reasoning]...",
        "Suggestion 4: [Action]... [Reasoning]...",
        "Suggestion 5: [Action]... [Reasoning]..."
      ],
      "abusiveLanguageDetected": boolean,
      "evidenceAnalysis": "A short analysis of the provided evidence text (if any)."
    }`;

    const userPrompt = `Dispute Description: "${safeDesc}"
    
    Chat History: 
    ${messageHistory}
    
    Evidence Text:
    ${evidenceText}
    
    Analyze the above and return the JSON object.`;

    console.log("Sending Prompt to AI:", userPrompt);

    try {
        const response = await fetch(KUTRIM_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${KUTRIM_API_KEY}`
            },
            body: JSON.stringify({
                model: "Krutrim-spectre-v2",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                max_tokens: 1500,
                temperature: 0.2
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        const aiContent = data.choices[0].message.content;

        // --- ROBUST PARSING LOGIC ---
        let finalParsed = {};

        try {
            // 1. Clean wrappers
            let cleanJson = aiContent.replace(/```json/gi, '').replace(/```/g, '').trim();

            // 2. Extract outer bracket
            const firstBrace = cleanJson.indexOf('{');
            const lastBrace = cleanJson.lastIndexOf('}');

            if (firstBrace !== -1 && lastBrace !== -1) {
                cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
            }

            // 3. Attempt Parse
            finalParsed = JSON.parse(cleanJson);

            // 4. Validate Fields
            if (!finalParsed.summary && (!finalParsed.suggestions || finalParsed.suggestions.length === 0)) {
                throw new Error("Missing key fields in JSON response");
            }

        } catch (parseError) {
            console.warn("Standard JSON parsing failed. Attempting regex extraction...", parseError);
            console.log("Raw Content:", aiContent);

            // Fallback Regex Extraction
            const summaryMatch = aiContent.match(/"summary"\s*:\s*"([\s\S]*?)"/) || aiContent.match(/summary:\s*(.*?)(?=\n|")/i);
            finalParsed.summary = summaryMatch ? summaryMatch[1] : null;

            const sentimentMatch = aiContent.match(/"sentiment"\s*:\s*"([^"]*)"/i);
            finalParsed.sentiment = sentimentMatch ? sentimentMatch[1] : "Neutral";

            const evidenceMatch = aiContent.match(/"evidenceAnalysis"\s*:\s*"([\s\S]*?)"/);
            finalParsed.evidenceAnalysis = evidenceMatch ? evidenceMatch[1] : "Analysis unavailable";

            const suggestionsMatch = aiContent.match(/"suggestions"\s*:\s*\[([\s\S]*?)\]/);

            // Parse suggestions array manually if found
            let extractedSuggestions = [];
            if (suggestionsMatch && suggestionsMatch[1]) {
                const itemMatches = suggestionsMatch[1].match(/"([^"\\]*(?:\\.[^"\\]*)*)"/g);
                if (itemMatches) {
                    extractedSuggestions = itemMatches.map(s => s.replace(/^"|"$/g, '').replace(/\\"/g, '"'));
                }
            }

            // FALLBACK: Text-based List Parsing (if JSON-like extraction failed)
            if (extractedSuggestions.length === 0) {
                // Look for lines starting with - or * or 1. after "Suggestions"
                const suggestionsBlockMatch = aiContent.match(/Suggestions:?([\s\S]*?)(?:$|Abusive|Evidence)/i);
                if (suggestionsBlockMatch && suggestionsBlockMatch[1]) {
                    const lines = suggestionsBlockMatch[1].split('\n');
                    extractedSuggestions = lines
                        .map(line => line.trim())
                        .filter(line => line.match(/^[-*•]|\d+\./)) // Filter lines that look like list items
                        .map(line => line.replace(/^[-*•]|\d+\.\s*/, '').trim()); // Clean bullets
                }
            }

            finalParsed.suggestions = extractedSuggestions;

            // Check if we got anything useful
            if (!finalParsed.summary && extractedSuggestions.length === 0) {
                return {
                    summary: "AI Response format was invalid. Please try regenerating.",
                    sentiment: "Unknown",
                    suggestions: [],
                    abusiveLanguageDetected: false,
                    evidenceAnalysis: "Parsing completely failed."
                };
            }
        }

        // 5. Return Valid Data
        return {
            summary: finalParsed.summary || "Summary unavailable.",
            sentiment: finalParsed.sentiment || "Neutral",
            suggestions: (Array.isArray(finalParsed.suggestions) && finalParsed.suggestions.length > 0)
                ? finalParsed.suggestions
                : ["Unable to parse suggestions. Please try regenerating."],
            abusiveLanguageDetected: !!finalParsed.abusiveLanguageDetected,
            evidenceAnalysis: finalParsed.evidenceAnalysis || "Evidence analysis unavailable."
        };

    } catch (error) {
        console.error("Krutrim AI Analysis Failed:", error);
        return {
            ...fallbackResponse,
            summary: `FAILED: ${error.message}`,
            suggestions: []
        };
    }
};

/**
 * Detects toxic language in a message before sending.
 */
export const validateMessage = async (content) => {
    // Simple local check for efficiency, but could be enhanced with AI
    const toxicWords = ['scam', 'fraud', 'idiot', 'steal', 'shut up', 'hate'];
    const hasToxicWord = toxicWords.some(word => content.toLowerCase().includes(word));

    return !hasToxicWord;
};
