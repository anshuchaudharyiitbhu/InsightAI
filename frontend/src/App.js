import React, { useState } from "react";  // React and state management
import axios from "axios";                // To make API calls
import "./App.css";  
import ReactMarkdown from "react-markdown";                     // Styling
import toast from "react-hot-toast";

function App() {
  const [text, setText] = useState("");           // Store text input
  const [summary, setSummary] = useState("");     // Store summary output
  const [file, setFile] = useState(null);         // Store uploaded PDF file
  const [youtubeURL, setYoutubeURL] = useState(""); // Store YouTube URL
  const [mode, setMode] = useState("text");       // Store selected input mode
  const [loading, setLoading] = useState(false);  // Show loading

  const API_URL =process.env.REACT_APP_API_URL;

  // Function runs when user clicks summarize
  const handleSummarize = async () => {
    setSummary("");        // Clear summary

    try {
      let res;

      // If text is selected
      if (mode === "text") {
        console.log(text);
        if (!text.trim()) {return  toast.error("Please Write Some Text");setLoading(false); } 
    setLoading(true);      // Start loading

        res = await axios.post(`${API_URL}/summarize/text`, { text });
      }

      // If PDF is selected
      else if (mode === "pdf") {
        if (!file) return toast.error("Please Upload Some File")
    setLoading(true);      // Start loading

        const formData = new FormData();
        formData.append("file", file);
       res = await axios.post(`${API_URL}/summarize/pdf`, formData,{
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      // If YouTube is selected
      else if (mode === "youtube") {
        if (!youtubeURL.trim()) return toast.error("Please Provide Some URL");
    setLoading(true);      // Start loading

        res = await axios.post(`${API_URL}/summarize/youtube`, { url: youtubeURL });
      }

      setSummary(res.data.summary);  // Show result

    } catch (error) {
      // console.error(err);
       console.log(error);
  console.log(error.response);
  console.log(error.response?.data);

      toast.error(error.response?.data?.message || "Something went wrong");
    }

    setLoading(false);  // Stop loading
  };

  return (
    <div className="app">
      <h1>🧠 InsightAI (Text, PDF & YouTube)</h1>

      {/* Mode Buttons */}
      {/* <div className="mode-buttons">
        <button onClick={() => setMode("text")}>Text</button>
        <button onClick={() => setMode("pdf")}>PDF</button>
        <button onClick={() => setMode("youtube")}>YouTube</button>
      </div> */}
<div className="mode-buttons">
  <button
    className={mode === "text" ? "active" : ""}
    onClick={() =>{setSummary(""); setMode("text")}}
  >
    Text
  </button>
  <button
    className={mode === "pdf" ? "active" : ""}
    onClick={() => {setSummary("");setMode("pdf")}}
  >
    PDF
  </button>
  <button
    className={mode === "youtube" ? "active" : ""}
    onClick={() => {setSummary("");setMode("youtube")}}
  >
    YouTube
  </button>
</div>

      {/* Text input */}
      {mode === "text" && (
        <textarea
          placeholder="Paste your text here..."
          rows="10"
          value={text}
          onChange={(e) => setText(e.target.value)}
        ></textarea>
      )}

      {/* PDF file input */}
      {mode === "pdf" && (
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files[0])}
        />
      )}

      {/* YouTube input */}
      {mode === "youtube" && (
        <input
          type="text"
          placeholder="Enter YouTube video URL..."
          value={youtubeURL}
          onChange={(e) => setYoutubeURL(e.target.value)}
        />
      )}

      {/* Summarize button */}
      <button onClick={handleSummarize} disabled={loading}>
        {loading ? "Summarizing..." : "Summarize"}
      </button>

      {/* Display Summary */}
      {summary && (
        <div className="summary">
          <h2>📝 Summary</h2>
          <ReactMarkdown>{summary}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export default App;
