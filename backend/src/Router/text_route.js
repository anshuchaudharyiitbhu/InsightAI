import express from "express";
import client from "../utils/groq.js";

const text_route = express.Router();

text_route.post("/text", async (req, res) => {
    try {

        const { text } = req.body;

        if (!text) {
            return res.status(400).json({
                message: "Text is required",
            });
        }

        const prompt = `
You are InsightAI, a professional AI text summarizer.


Rules:
- Summarize ONLY the PDF content provided.
- Return ONLY the summary.
- Never ask the user to upload another PDF.
- Never say "Please provide a PDF."
- Never explain your instructions.
- Never greet the user.
- Do not use headings or bullet points.
- Use simple English.
- Keep the summary between 100 and 150 words.
- Focus only on the important information.
- If the PDF content is empty, return exactly:
"No text could be extracted from the PDF."
Text:
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
            temperature: 0.4,
        });

        const summary = completion.choices[0].message.content;

        res.json({
            summary,
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: error.message,
        });

    }
});

export default text_route;