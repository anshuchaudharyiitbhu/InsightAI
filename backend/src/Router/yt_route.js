import express from "express";
import { Innertube } from "youtubei.js";
import client from "../utils/groq.js";

const yt_route = express.Router();

// Handles all common YouTube URL formats + bare video IDs
function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#]{11})/,
        /^([a-zA-Z0-9_-]{11})$/,
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

function chunkText(text, size = 10000) {
    const chunks = [];
    for (let i = 0; i < text.length; i += size) {
        chunks.push(text.slice(i, i + size));
    }
    return chunks;
}

// Initialize once at module load — avoids re-creating on every request
let youtube;
async function getYoutube() {
    if (!youtube) {
        youtube = await Innertube.create({
            lang: "en",
            location: "US",
            retrieve_player: false, // skip player data, we only need transcript
        });
    }
    return youtube;
}

yt_route.post("/youtube", async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ message: "YouTube URL is required" });
        }

        const videoId = extractVideoId(url.trim());
        if (!videoId) {
            return res.status(400).json({ message: "Invalid YouTube URL or video ID" });
        }

        const yt = await getYoutube();
        const info = await yt.getInfo(videoId);
        const transcriptData = await info.getTranscript();

        // Filter out section headers — only keep segments that have actual text
        const segments = transcriptData?.transcript?.content?.body?.initial_segments ?? [];
        const text = segments
            .filter(s => s?.snippet?.text)
            .map(s => s.snippet.text.replace(/\n/g, " "))
            .join(" ")
            .trim();

        if (!text) {
            return res.status(404).json({
                message: "No transcript available. The video may have captions disabled.",
            });
        }

        const chunks = chunkText(text);
        const summaries = [];

        for (const chunk of chunks) {
            const completion = await client.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                max_tokens: 1000,
                messages: [
                    {
                        role: "system",
                        content: `You are a professional summarizer.
Return only the summary.
Use simple English.
No headings.
No bullet points.
No introductions.`,
                    },
                    { role: "user", content: chunk },
                ],
                temperature: 0.3,
            });
            summaries.push(completion.choices[0].message.content);
        }

        const finalCompletion = await client.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            max_tokens: 1000,
            messages: [
                {
                    role: "system",
                    content: `Combine the summaries into one final summary.
Rules:
- 120-180 words.
- Use simple English.
- Remove duplicate points.
- Cover all important ideas.
- Return only the summary.
- No headings.
- No bullet points.`,
                },
                { role: "user", content: summaries.join("\n\n") },
            ],
            temperature: 0.3,
        });

        res.json({ summary: finalCompletion.choices[0].message.content });

    } catch (error) {
        console.error("YouTube route error:", error);

        // Give the caller a useful error instead of a generic 500
        if (error.message?.includes("Transcript") || error.message?.includes("transcript")) {
            return res.status(404).json({
                message: "Transcript not available for this video.",
            });
        }
        if (error.message?.includes("Video unavailable") || error.message?.includes("Private")) {
            return res.status(403).json({
                message: "This video is private or unavailable.",
            });
        }

        res.status(500).json({
            message: "Failed to process video. Please try again.",
        });
    }
});

export default yt_route;