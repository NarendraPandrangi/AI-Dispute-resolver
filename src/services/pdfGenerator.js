import { jsPDF } from "jspdf";

export const generateResolutionPDF = (dispute, resolutionText) => {
    const doc = new jsPDF();
    const lineHeight = 10;

    // Add Logo (Simulated for robustness)
    doc.setFillColor(37, 99, 235); // Blue-600
    doc.circle(25, 20, 10, 'F');
    doc.setTextColor(255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("ADR", 25, 21.5, { align: 'center' });

    let y = 40;

    // Title
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 185); // Blue
    doc.text("Dispute Resolution Agreement", 105, 25, { align: "center" });

    // Header Info
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, 40);
    doc.text(`Dispute ID: ${dispute.id}`, 150, 45);
    y += 15;

    // Helper function for adding sections
    const addSection = (title, content) => {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        doc.text(title, 20, y);
        y += 7;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(50);

        const splitText = doc.splitTextToSize(content || "N/A", 170);
        doc.text(splitText, 20, y);
        y += (splitText.length * 7) + 10;
    };

    // Parties
    addSection("Parties Involved:", dispute.participants.join(", "));

    // Title & Description
    addSection("Dispute Title:", dispute.title);
    addSection("Dispute Description:", dispute.description);

    // Dynamic Resolution Box
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont("helvetica", "italic");
    const resolutionLines = doc.splitTextToSize(resolutionText, 160);
    const boxHeight = (resolutionLines.length * 7) + 25; // Dynamic height calculation

    doc.setDrawColor(39, 174, 96); // Green border
    doc.setLineWidth(0.5);
    doc.setFillColor(240, 253, 244); // Very light green bg
    doc.rect(15, y, 180, boxHeight, 'FD'); // Box for resolution

    doc.setFontSize(14);
    doc.setTextColor(39, 174, 96);
    doc.setFont("helvetica", "bold");
    doc.text("Agreed Resolution", 105, y + 10, { align: "center" });

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont("helvetica", "italic");
    doc.text(resolutionLines, 105, y + 20, { align: "center" });

    y += boxHeight + 20;

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text("This document confirms that all parties have digitally agreed to the resolution above via the AI Dispute Resolver platform.", 105, y, { align: "center" });

    // Save
    doc.save(`Resolution_Agreement_${dispute.id}.pdf`);
};
