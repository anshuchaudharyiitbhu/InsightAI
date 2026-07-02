import express from "express";
import { YoutubeTranscript } from "youtube-transcript";
import client from "../utils/groq.js";

const yt_route = express.Router();

function chunkText(text, size = 10000) {
    const chunks = [];

    for (let i = 0; i < text.length; i += size) {
        chunks.push(text.slice(i, i + size));
    }

    return chunks;
}

yt_route.post("/youtube", async (req, res) => {
    try {

        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                message: "YouTube URL is required"
            });
        }

        const transcript = await YoutubeTranscript.fetchTranscript(url);

        const text = transcript
            .map((line) => line.text)
            .join(" ");

        const chunks = chunkText(text);

        let summaries = [];

        for (const chunk of chunks) {

            const completion = await client.chat.completions.create({

                model: "llama-3.3-70b-versatile",

                messages: [
                    {
                        role: "user",
                        content: `
Summarize the following part of a YouTube transcript.

Rules:
- Use simple English.
- Keep only important points.
- Ignore repeated information.

Transcript:

${chunk}
`
                    }
                ],

                temperature: 0.3,

            });

            summaries.push(
                completion.choices[0].message.content
            );
        }

        const finalPrompt = `
You are an expert AI assistant.

Below are summaries of different parts of a YouTube video.

Combine them into one final summary.

Rules:
- Keep it between 120 and 180 words.
- Use simple English.
- Remove duplicate points.
- Cover all important ideas.
- Return only the final summary.

${summaries.join("\n\n")}
`;

        const finalCompletion = await client.chat.completions.create({

            model: "llama-3.3-70b-versatile",

            messages: [
                {
                    role: "user",
                    content: finalPrompt,
                }
            ],

            temperature: 0.3,

        });

        const summary =
            finalCompletion.choices[0].message.content;

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

export default yt_route;