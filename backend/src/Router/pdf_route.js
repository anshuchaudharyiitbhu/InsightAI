import express from "express";
import upload from "../middleware/upload.js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "canvas";
import Tesseract from "tesseract.js";
import client from "../utils/groq.js";

const pdf_route = express.Router();

// If average extracted chars per page is below this, treat it as scanned
const MIN_CHARS_PER_PAGE = 50;

async function extractTextLayer(buffer) {
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
    let text = "";
    let totalChars = 0;

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item) => item.str).join(" ");
        text += pageText + "\n";
        totalChars += pageText.trim().length;
    }

    return {
        pdf,
        text,
        avgCharsPerPage: pdf.numPages > 0 ? totalChars / pdf.numPages : 0,
    };
}

async function extractViaOCR(pdf) {
    let text = "";

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);

        // scale: 2.0 renders at double resolution — better OCR accuracy
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext("2d");

        await page.render({ canvasContext: context, viewport }).promise;

        const { data: { text: pageText } } = await Tesseract.recognize(
            canvas.toBuffer("image/png"),
            "eng"
        );

        text += pageText + "\n";
    }

    return text;
}

pdf_route.post("/pdf", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Please upload a PDF." });
        }

        // Step 1 — try native text extraction
        const { pdf, text: layerText, avgCharsPerPage } = await extractTextLayer(req.file.buffer);

        // Step 2 — fall back to OCR if text layer is sparse or empty
        let finalText = layerText;
        if (avgCharsPerPage < MIN_CHARS_PER_PAGE) {
            finalText = await extractViaOCR(pdf);
        }

        finalText = finalText.trim();

        if (!finalText) {
            return res.status(422).json({
                message: "Could not extract text. The PDF may be encrypted or corrupted.",
            });
        }

        const prompt = `
You are an expert AI assistant.

Summarize the following PDF.

Rules:
- only send no pdf to summarize if pdf is not available
- Keep the summary between 100 and 150 words.
- Use simple English.
- Mention only the important points.
- Do not repeat information.

PDF:

${finalText}
`;

        const completion = await client.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
        });

        res.json({ summary: completion.choices[0].message.content });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
});

export default pdf_route;