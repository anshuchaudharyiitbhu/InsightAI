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
You are an expert text summarizer.

Summarize the following text.

Rules:
only send no text to summarize if text is not available
- Keep the summary between 60 and 100 words.
- Use simple and easy-to-understand English.
- Include only the important points.
- Do not repeat information.
- Write the summary as one short paragraph.
- bold important words with heading and subheading

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