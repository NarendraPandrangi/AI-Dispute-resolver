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
        console.warn("Kutrim API Key is missing.");
        return {
            ...fallbackResponse,
            summary: "⚠️ AI SERVICE UNAVAILABLE: The Kutrim API Key is missing in the environment variables. Using static fallback data."
        };
    }

    // Construct the prompt
    const messageHistory = messages.map(m => `${m.sender}: ${m.content}`).join("\n");

    // Updated System Prompt with One-Shot Example to prevent empty JSON
    const systemPrompt = `You are a strict JSON-only API. You must not generate any conversational text, formatting, or markdown. Output ONLY valid JSON.

RESPONSE FORMAT:
{
  "summary": "The buyer claims the item was damaged, while the seller provides proof of safe packaging.",
  "sentiment": "Tense",
  "suggestions": [
    "Buyer should upload photos of the damage.",
    "Seller should share shipping insurance details.",
    "Both parties should discuss a partial refund.",
    "Review platform refund policies.",
    "Agree on a return shipping method.",
    "Consult consumer protection agency.",
    "Offer store credit as alternative.",
    "Escalate to platform support team.",
    "Mediation via third-party service.",
    "Check credit card chargeback options."
  ],
  "abusiveLanguageDetected": false,
  "evidenceAnalysis": "The provided receipt shows a date of Dec 20, matching the shipping claim."
}`;

    const userPrompt = `TASK: Analyze the dispute below and provide the requested JSON output (summary, sentiment, suggestions, abusiveLanguageDetected, evidenceAnalysis).

--- INPUT DATA START ---
Dispute Description:
${description}

Message History:
${messageHistory}

Evidence Analysis (OCR):
${evidenceText || "No readable text found."}
--- INPUT DATA END ---

[System Note: ${new Date().toISOString()}]

REMINDER: Return ONLY the specific analysis JSON object defined in the System Prompt. Do not just convert the input data into JSON.`;

    console.log("Sending Prompt to AI:", userPrompt); // DEBUG: Ensure inputs are not empty

    try {
        const response = await fetch(KUTRIM_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${KUTRIM_API_KEY}`
            },
            body: JSON.stringify({
                model: "Krutrim-spectre-v2", // Using Krutrim's model
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                max_tokens: 1500, // Increased for evidence
                temperature: 0.3 // Lower temperature for more deterministic JSON
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        const aiContent = data.choices[0].message.content;

        // Parse the JSON content
        try {
            // Remove code blocks if present (case insensitive)
            const cleanJson = aiContent.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

            // Attempt to find the first '{' and last '}' to extract JSON if there's intro text
            const firstBrace = cleanJson.indexOf('{');
            const lastBrace = cleanJson.lastIndexOf('}');
            const jsonString = (firstBrace !== -1 && lastBrace !== -1)
                ? cleanJson.substring(firstBrace, lastBrace + 1)
                : cleanJson;

            const parsed = JSON.parse(jsonString);

            // Validation: Check if the AI returned an error object or missing fields
            if (!parsed.summary && !parsed.suggestions) {
                console.warn("AI returned JSON but missing expected fields:", parsed);
                return {
                    summary: typeof parsed === 'string' ? parsed : JSON.stringify(parsed), // DEBUG: Show what we got
                    sentiment: "Neutral",
                    suggestions: [],
                    abusiveLanguageDetected: false,
                    evidenceAnalysis: "Structure error in AI response."
                };
            }

            // Responsive Validation
            let finalSuggestions = [];
            if (Array.isArray(parsed.suggestions)) {
                finalSuggestions = parsed.suggestions;
            } else if (typeof parsed.suggestions === 'string') {
                // Try to split logic if AI returned a string list
                finalSuggestions = parsed.suggestions.split(/\n/).filter(s => s.trim().length > 0);
            }

            const debugSummarySuffix = (finalSuggestions.length === 0)
                ? `\n\n[DEBUG: Suggestions missing. Raw AI response: ${JSON.stringify(parsed)}]`
                : "";

            // Validate and Merge with default if fields are missing
            return {
                summary: (parsed.summary || "AI Analysis summary missing.") + debugSummarySuffix,
                sentiment: parsed.sentiment || "Neutral",
                suggestions: finalSuggestions.length > 0 ? finalSuggestions.slice(0, 5) : [],
                abusiveLanguageDetected: parsed.abusiveLanguageDetected || false,
                evidenceAnalysis: parsed.evidenceAnalysis || "No specific evidence analysis provided."
            };
        } catch (e) {
            console.error("Failed to parse AI response as JSON", e);
            console.log("Raw AI Content:", aiContent);
            return {
                summary: aiContent.substring(0, 300) + "...", // Show raw content preview
                sentiment: "Unknown",
                suggestions: [],
                abusiveLanguageDetected: false,
                evidenceAnalysis: "Parsing failed - Raw response received."
            };
        }

    } catch (error) {
        console.error("Krutrim AI Analysis Failed:", error);
        return {
            ...fallbackResponse,
            summary: `FAILED: ${error.message}`,
            suggestions: [] // Ensure we don't show static suggestions on error
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
