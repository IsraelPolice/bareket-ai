import React, { useState, useEffect } from "react";
import { auth, db, storage } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import "../styles/GeneratorStyles.css";

const VideoGenerator = () => {
  // State for video generation parameters
  const [prompt, setPrompt] = useState(
    "a portrait photo of a woman underwater with flowing hair"
  );
  const [negativePrompt, setNegativePrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [startImage, setStartImage] = useState("");
  const [referenceImages, setReferenceImages] = useState([]);
  const [cfgScale, setCfgScale] = useState(0.5);
  const [duration, setDuration] = useState(5);

  // State for UI and data
  const [currentVideo, setCurrentVideo] = useState("");
  const [error, setError] = useState("");
  const [previousVideos, setPreviousVideos] = useState([]);
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) {
        setError("Please sign in to access your data.");
        return;
      }
      const userId = user.uid;
      console.log("Current user UID:", userId);
      try {
        const creditsRef = doc(db, "users", userId, "credits", "current");
        console.log("Fetching credits from:", creditsRef.path);
        const creditsSnap = await getDoc(creditsRef);
        if (creditsSnap.exists()) {
          const currentCredits = creditsSnap.data().value;
          setCredits(currentCredits);
          console.log("Loaded credits:", currentCredits);
        } else {
          console.log("No credits found, initializing with 10");
          await setDoc(creditsRef, { value: 10 });
          setCredits(10);
        }

        const videosRef = doc(db, "users", userId, "videos", "list");
        console.log("Fetching videos from:", videosRef.path);
        const videosSnap = await getDoc(videosRef);
        if (videosSnap.exists()) {
          const videosData = videosSnap.data().list || [];
          setPreviousVideos(videosData);
          console.log("Loaded previous videos:", videosData);
        } else {
          console.log("No videos found, initializing empty list");
          await setDoc(videosRef, { list: [] }, { merge: true });
          setPreviousVideos([]);
        }
      } catch (err) {
        setError("Error fetching user data: " + err.message);
        console.error("Firestore error:", err);
      }
    };
    fetchUserData();
  }, []);

  // Function to generate video
  const generateVideo = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt!");
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      setError("Please sign in to generate videos.");
      return;
    }
    if (credits === null || credits <= 0) {
      setError("No credits left or data not loaded! Please recharge or wait.");
      return;
    }
    setLoading(true);
    setError("");
    setCurrentVideo("");
    try {
      const response = await fetch("http://localhost:3001/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          negative_prompt: negativePrompt,
          aspect_ratio: aspectRatio,
          start_image: startImage,
          reference_images: referenceImages,
          cfg_scale: cfgScale,
          duration,
        }),
      });
      if (!response.ok) throw new Error("Error generating video. Try again!");
      const data = await response.json();
      console.log("Replicate video response:", data);
      const videoUrl = data.video;

      const videoResponse = await fetch(videoUrl);
      const videoBlob = await videoResponse.blob();

      const userId = user.uid;
      const storageRef = ref(
        storage,
        `users/${userId}/videos/${Date.now()}.mp4`
      );
      console.log("Uploading to Storage:", storageRef.fullPath);
      await uploadBytes(storageRef, videoBlob);
      const savedVideoUrl = await getDownloadURL(storageRef);
      console.log("Generated video URL:", savedVideoUrl);

      setCurrentVideo(savedVideoUrl);

      const newCredits = credits - 1;
      setCredits(newCredits);
      const creditsRef = doc(db, "users", userId, "credits", "current");
      await setDoc(creditsRef, { value: newCredits });

      const newVideo = {
        src: savedVideoUrl,
        alt: prompt,
        timestamp: new Date(),
      };
      const updatedVideos = [newVideo, ...previousVideos];
      setPreviousVideos(updatedVideos);
      const videosRef = doc(db, "users", userId, "videos", "list");
      await setDoc(videosRef, { list: updatedVideos }, { merge: true });
    } catch (error) {
      setError(`Error generating video: ${error.message}`);
      console.error("Error details:", error);
    } finally {
      setLoading(false);
    }
  };

  // Function to recharge credits
  const rechargeCredits = async () => {
    const user = auth.currentUser;
    if (!user) {
      setError("Please sign in to recharge credits.");
      return;
    }
    const userId = user.uid;
    const newCredits = (credits || 0) + 10;
    setCredits(newCredits);
    const creditsRef = doc(db, "users", userId, "credits", "current");
    await setDoc(creditsRef, { value: newCredits });
    setError("");
    alert("Credits recharged! +10 credits.");
  };

  // JSX rendering
  return (
    <div className="generator-wrapper">
      {/* Sidebar for inputs */}
      <div className="sidebar">
        <h2>Saturn AI Video Generator</h2>
        <div className="credits-section">
          <span>Credits: {credits !== null ? credits : "Loading..."}</span>
          <button
            className="recharge-btn"
            onClick={rechargeCredits}
            disabled={loading || credits === null}
          >
            Recharge (+10)
          </button>
        </div>

        {/* Prompt Input */}
        <div className="input-group">
          <label>Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter a prompt (e.g., 'a woman underwater with flowing hair')"
            disabled={credits === null || credits <= 0}
          />
        </div>

        {/* Negative Prompt */}
        <div className="input-group">
          <label>Negative Prompt</label>
          <textarea
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="Things you don't want (e.g., 'blurry')"
            disabled={credits === null || credits <= 0}
          />
        </div>

        {/* Aspect Ratio */}
        <div className="input-group">
          <label>Aspect Ratio</label>
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            disabled={credits === null || credits <= 0}
          >
            <option value="16:9">16:9</option>
            <option value="4:4">4:3</option>
            <option value="1:1">1:1</option>
          </select>
        </div>

        {/* Start Image URL */}
        <div className="input-group">
          <label>Start Image URL</label>
          <input
            type="text"
            value={startImage}
            onChange={(e) => setStartImage(e.target.value)}
            placeholder="Enter start image URL (optional)"
            disabled={credits === null || credits <= 0}
          />
        </div>

        {/* Reference Images */}
        <div className="input-group">
          <label>Reference Images (URLs, comma-separated)</label>
          <input
            type="text"
            value={referenceImages.join(",")}
            onChange={(e) =>
              setReferenceImages(
                e.target.value.split(",").map((url) => url.trim())
              )
            }
            placeholder="Enter reference image URLs (e.g., 'url1,url2')"
            disabled={credits === null || credits <= 0}
          />
        </div>

        {/* CFG Scale */}
        <div className="input-group">
          <label>CFG Scale (0-1)</label>
          <input
            type="number"
            value={cfgScale}
            onChange={(e) =>
              setCfgScale(Math.min(1, Math.max(0, e.target.value)))
            }
            step="0.1"
            min="0"
            max="1"
            disabled={credits === null || credits <= 0}
          />
        </div>

        {/* Duration */}
        <div className="input-group">
          <label>Duration (seconds)</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(Math.max(1, e.target.value))}
            min="1"
            disabled={credits === null || credits <= 0}
          />
        </div>

        {/* Generate Button */}
        <button
          onClick={generateVideo}
          className="generate-btn"
          disabled={loading || credits === null || credits <= 0}
        >
          Generate Video
        </button>

        {/* Error Message */}
        {error && <div className="error-message">{error}</div>}
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Preview Section */}
        <div className="preview-section">
          {loading && <p className="loading-text">Generating...</p>}
          {currentVideo && !loading && (
            <video controls className="preview-media">
              <source src={currentVideo} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          )}
        </div>

        {/* Previous Videos Section */}
        <div className="previous-section">
          <h2>Previous Videos</h2>
          <div className="media-grid">
            {previousVideos.map((vid, index) => (
              <div key={index} className="media-item">
                <video controls>
                  <source src={vid.src} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoGenerator;
