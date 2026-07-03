import express from "express";
import upload from "../middleware/upload.js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import client from "../utils/groq.js";

const pdf_route = express.Router();

pdf_route.post("/pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Please upload a PDF.",
      });
    }

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(req.file.buffer),
    });

    const pdf = await loadingTask.promise;

    let text = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      text += content.items.map((item) => item.str).join(" ") + "\n";
    }

    const prompt = `
You are an expert AI assistant.

Summarize the following PDF.

Rules:
- Keep the summary between 100 and 150 words.
- Use simple English.
- Mention only the important points.
- Do not repeat information.

PDF:

${text}
`;

    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
    });

    res.json({
      summary: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message,
    });
  }
});

export default pdf_route;