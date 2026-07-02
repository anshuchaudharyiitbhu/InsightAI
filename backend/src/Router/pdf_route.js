import express from "express";
import upload from "../middleware/upload.js";
import pdf from "pdf-parse";
import client from "../utils/groq.js";

const pdf_route = express.Router();

pdf_route.post(
    "/pdf",
    upload.single("file"),
    async (req, res) => {
        try {

            if (!req.file) {
                return res.status(400).json({
                    message: "Please upload a PDF."
                });
            }

            const data = await pdf(req.file.buffer);

            const prompt = `
You are an expert AI assistant.

Summarize the following PDF.

Rules:
- Keep the summary between 100 and 150 words.
- Use simple English.
- Mention only the important points.
- Do not repeat information.

PDF:

${data.text}
`;

            const completion =
                await client.chat.completions.create({

                    model: "llama-3.3-70b-versatile",

                    messages: [
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],

                    temperature: 0.3,
                });

            const summary =
                completion.choices[0].message.content;

            res.json({
                summary,
            });

        } catch (error) {

            console.log(error);

            res.status(500).json({
                message: error.message,
            });

        }
    }
);

export default pdf_route;