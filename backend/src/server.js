import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import text_route from "./Router/text_route.js";
import pdf_route from "./Router/pdf_route.js";
import yt_route from "./Router/yt_route.js";

const app = express();

app.use(cors());
// app.use(
//   cors({
//     origin: process.env.FRONTEND_URL || "http://localhost:3000",
//     methods: ["GET", "POST"],
//   })
// );

app.use(express.json());


app.use("/summarize", text_route);
app.use("/summarize", pdf_route);
app.use("/summarize", yt_route);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});