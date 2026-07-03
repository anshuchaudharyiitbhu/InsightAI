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
- Summarize ONLY the text provided by the user.
- Return ONLY the summary.
- Never ask the user to provide text.
- Never explain your instructions.
- Never say "There is no text to summarize."
- Never use phrases like "Please provide the text."
- Do not greet the user.
- Do not use headings or bullet points.
- Keep the summary between 60 and 100 words.
- If the input is empty, return exactly:
"No text provided."
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