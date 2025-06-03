import React, { useState, useEffect, useRef } from "react";
import { auth, db, storage } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import "../styles/GeneratorStyles.css";

const VideoGenerator = () => {
  const [model, setModel] = useState("kwaivgi/kling-v1.6-standard");
  const [prompt, setPrompt] = useState(
    "a portrait photo of a woman underwater with flowing hair"
  );
  const [negativePrompt, setNegativePrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [startImage, setStartImage] = useState("");
  const [endImage, setEndImage] = useState("");
  const [referenceImages, setReferenceImages] = useState([]);
  const [cfgScale, setCfgScale] = useState(0.5);
  const [duration, setDuration] = useState(5);
  const [currentVideo, setCurrentVideo] = useState("");
  const [error, setError] = useState("");
  const [previousVideos, setPreviousVideos] = useState([]);
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(false);

  const startRef = useRef(null);
  const endRef = useRef(null);
  const refImagesRef = useRef(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) {
        setError("Please sign in to access your data.");
        return;
      }
      const userId = user.uid;
      try {
        const creditsRef = doc(db, "users", userId, "credits", "current");
        const creditsSnap = await getDoc(creditsRef);
        if (creditsSnap.exists()) {
          setCredits(creditsSnap.data().value);
        } else {
          await setDoc(creditsRef, { value: 10 });
          setCredits(10);
        }

        const videosRef = doc(db, "users", userId, "videos", "list");
        const videosSnap = await getDoc(videosRef);
        if (videosSnap.exists()) {
          setPreviousVideos(videosSnap.data().list || []);
        } else {
          await setDoc(videosRef, { list: [] }, { merge: true });
          setPreviousVideos([]);
        }
      } catch (err) {
        setError("Error fetching user data: " + err.message);
      }
    };
    fetchUserData();
  }, []);

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
    const creditCost = model === "kwaivgi/kling-v1.6-pro" ? 2 : 1;
    const durationCost = duration === 10 ? 2 : 1;
    const totalCost = creditCost * durationCost;
    if (credits === null || credits < totalCost) {
      setError(`Not enough credits! Requires ${totalCost} credits.`);
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
          model,
          prompt,
          negative_prompt: negativePrompt,
          aspect_ratio: aspectRatio,
          start_image: startImage,
          end_image: endImage,
          reference_images: referenceImages,
          cfg_scale: cfgScale,
          duration,
        }),
      });
      if (!response.ok) throw new Error("Error generating video. Try again!");
      const data = await response.json();
      const videoUrl = data.video;

      const videoResponse = await fetch(videoUrl);
      const videoBlob = await videoResponse.blob();

      const userId = user.uid;
      const storageRef = ref(
        storage,
        `users/${userId}/videos/${Date.now()}.mp4`
      );
      await uploadBytes(storageRef, videoBlob);
      const savedVideoUrl = await getDownloadURL(storageRef);

      setCurrentVideo(savedVideoUrl);

      const newCredits = credits - totalCost;
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
    } finally {
      setLoading(false);
    }
  };

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

  const handleFileUpload = (e, setter) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, setter) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="generator-wrapper">
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
        <div className="input-group">
          <label>Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={credits === null || credits <= 0}
          >
            <option value="kwaivgi/kling-v1.6-standard">
              Kling 1.6 Standard (1 credit)
            </option>
            <option value="kwaivgi/kling-v1.6-pro">
              Kling 1.6 Pro (2 credits)
            </option>
          </select>
        </div>
        <div className="input-group">
          <label>Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter a prompt (e.g., 'a woman underwater with flowing hair')"
            disabled={credits === null || credits <= 0}
          />
        </div>
        <div className="input-group">
          <label>Negative Prompt</label>
          <textarea
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="Things you don't want (e.g., 'blurry')"
            disabled={credits === null || credits <= 0}
          />
        </div>
        <div className="input-group">
          <label>Aspect Ratio</label>
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            disabled={credits === null || credits <= 0}
          >
            <option value="16:9">16:9</option>
            <option value="4:3">4:3</option>
            <option value="1:1">1:1</option>
          </select>
        </div>
        <div className="input-group">
          <label>Start Image</label>
          <div
            ref={startRef}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, setStartImage)}
            style={{
              border: "2px dashed var(--border-color)",
              padding: "10px",
              textAlign: "center",
              borderRadius: "6px",
              backgroundColor: startImage ? "var(--input-bg)" : "transparent",
            }}
          >
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, setStartImage)}
              style={{ display: "none" }}
              id="start-upload"
            />
            <label htmlFor="start-upload" style={{ cursor: "pointer" }}>
              {startImage ? "Image loaded" : "Click / Drop / Paste"}
            </label>
          </div>
        </div>
        <div className="input-group">
          <label>End Image</label>
          <div
            ref={endRef}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, setEndImage)}
            style={{
              border: "2px dashed var(--border-color)",
              padding: "10px",
              textAlign: "center",
              borderRadius: "6px",
              backgroundColor: endImage ? "var(--input-bg)" : "transparent",
            }}
          >
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, setEndImage)}
              style={{ display: "none" }}
              id="end-upload"
            />
            <label htmlFor="end-upload" style={{ cursor: "pointer" }}>
              {endImage ? "Image loaded" : "Click / Drop / Paste"}
            </label>
          </div>
        </div>
        <div className="input-group">
          <label>Reference Images (up to 4)</label>
          <div
            ref={refImagesRef}
            onDragOver={handleDragOver}
            onDrop={(e) => {
              e.preventDefault();
              const files = Array.from(e.dataTransfer.files).slice(
                0,
                4 - referenceImages.length
              );
              const readers = files.map((file) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                return new Promise(
                  (resolve) => (reader.onloadend = () => resolve(reader.result))
                );
              });
              Promise.all(readers).then((results) =>
                setReferenceImages([...referenceImages, ...results].slice(0, 4))
              );
            }}
            style={{
              border: "2px dashed var(--border-color)",
              padding: "10px",
              textAlign: "center",
              borderRadius: "6px",
              backgroundColor: referenceImages.length
                ? "var(--input-bg)"
                : "transparent",
            }}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files).slice(
                  0,
                  4 - referenceImages.length
                );
                const readers = files.map((file) => {
                  const reader = new FileReader();
                  reader.readAsDataURL(file);
                  return new Promise(
                    (resolve) =>
                      (reader.onloadend = () => resolve(reader.result))
                  );
                });
                Promise.all(readers).then((results) =>
                  setReferenceImages(
                    [...referenceImages, ...results].slice(0, 4)
                  )
                );
              }}
              style={{ display: "none" }}
              id="ref-upload"
            />
            <label htmlFor="ref-upload" style={{ cursor: "pointer" }}>
              {referenceImages.length
                ? `${referenceImages.length} images loaded`
                : "Click / Drop / Paste"}
            </label>
          </div>
        </div>
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
        <div className="input-group">
          <label>Duration (seconds)</label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            disabled={credits === null || credits <= 0}
          >
            <option value="5">5s (1 credit)</option>
            <option value="10">10s (2 credits)</option>
          </select>
        </div>
        <button
          onClick={generateVideo}
          className="generate-btn"
          disabled={loading || credits === null || credits <= 0}
        >
          Generate Video
        </button>
        {error && <div className="error-message">{error}</div>}
      </div>
      <div className="main-content">
        <div className="preview-section">
          {loading && <p className="loading-text">Generating...</p>}
          {currentVideo && !loading && (
            <video controls className="preview-media">
              <source src={currentVideo} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          )}
        </div>
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
