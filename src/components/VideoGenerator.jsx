import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  auth,
  db,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  getDocs,
  onSnapshot,
} from "./firebase";
import "../styles/GeneratorStyles.css";

const VideoGenerator = () => {
  const [model, setModel] = useState("kwaivgi/kling-v1-6-standard");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [startImage, setStartImage] = useState(null); // חזרה ל-null כברירת מחדל
  const [endImage, setEndImage] = useState(null);
  const [referenceImages, setReferenceImages] = useState([]);
  const [cfgScale, setCfgScale] = useState(0.5);
  const [duration, setDuration] = useState(5);
  const [currentVideo, setCurrentVideo] = useState("");
  const [error, setError] = useState("");
  const [previousVideos, setPreviousVideos] = useState([]);
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeJobs, setActiveJobs] = useState(() => {
    const savedJobs = localStorage.getItem("activeJobs");
    return savedJobs ? JSON.parse(savedJobs) : [];
  });

  const startRef = useRef(null);
  const endRef = useRef(null);
  const refImagesRef = useRef(null);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (loading) {
        event.preventDefault();
        event.returnValue =
          "Changes you made may not be saved. Are you sure you want to leave?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    const handleRouteChange = () => {
      if (loading) {
        if (
          !window.confirm(
            "Changes you made may not be saved. Are you sure you want to leave?"
          )
        ) {
          throw new Error("Navigation prevented by loading state");
        }
      }
    };

    window.addEventListener("popstate", handleRouteChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handleRouteChange);
    };
  }, [loading]);

  useEffect(() => {
    localStorage.setItem("activeJobs", JSON.stringify(activeJobs));
  }, [activeJobs]);

  const checkJobStatus = useCallback(async (predictionId) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const userId = user.uid;

      let status = "processing";
      while (status === "processing") {
        const response = await fetch(
          `http://localhost:3001/check-status/${predictionId}`,
          {
            headers: { "user-id": userId },
          }
        );
        if (!response.ok) {
          throw new Error(`Failed to check status: ${response.status}`);
        }
        const data = await response.json();
        console.log(`Job status for ${predictionId}:`, data);

        status = data.status;
        if (data.status === "succeeded" && data.videoUrl) {
          setCurrentVideo(data.videoUrl);
          setCredits(data.credits); // עדכון קרדיטים מהשרת

          const videosRef = doc(db, "users", userId, "videos", "list");
          const videosSnap = await getDoc(videosRef);
          if (videosSnap.exists()) {
            setPreviousVideos(videosSnap.data().list || []);
          }

          setActiveJobs((prevJobs) =>
            prevJobs.filter((job) => job.predictionId !== predictionId)
          );
          break;
        } else if (data.status === "failed" || data.status === "canceled") {
          setError(
            "Video generation failed: " + (data.error || "Unknown error")
          );
          setActiveJobs((prevJobs) =>
            prevJobs.filter((job) => job.predictionId !== predictionId)
          );
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 5000)); // חכה 5 שניות לפני בדיקה חוזרת
      }
    } catch (error) {
      console.error(`Error checking job status for ${predictionId}:`, error);
      setError(`Error checking job status: ${error.message}`);
      setActiveJobs((prevJobs) =>
        prevJobs.filter((job) => job.predictionId !== predictionId)
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setError("Please sign in to access your data.");
      return;
    }
    const userId = user.uid;

    const loadInitialData = async () => {
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

        const savedJobs = JSON.parse(
          localStorage.getItem("activeJobs") || "[]"
        );
        if (savedJobs.length > 0) {
          savedJobs.forEach((job) => checkJobStatus(job.predictionId));
        }
      } catch (err) {
        setError("Error fetching user data: " + err.message);
      }
    };
    loadInitialData();

    const activeJobsRef = doc(db, "users", userId, "activeJobs", "list");
    const unsubscribeActiveJobs = onSnapshot(
      activeJobsRef,
      (doc) => {
        if (doc.exists()) {
          const activeJobsList = doc.data().jobs || [];
          setActiveJobs(activeJobsList);
          console.log("Active jobs updated:", activeJobsList);
          activeJobsList.forEach((job) => {
            checkJobStatus(job.predictionId);
          });
        } else {
          setActiveJobs([]);
        }
      },
      (error) => {
        console.error("Error listening to activeJobs:", error);
        setError("Error listening to active jobs: " + error.message);
      }
    );

    return () => {
      unsubscribeActiveJobs();
    };
  }, [checkJobStatus]);

  const generateVideo = async () => {
    if (!prompt.trim()) {
      setError("Prompt is required!");
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

    const payload = {
      model,
      prompt,
      negative_prompt: negativePrompt,
      aspect_ratio: aspectRatio,
      start_image: startImage || undefined,
      end_image:
        endImage &&
        typeof endImage === "string" &&
        endImage.startsWith("data:image")
          ? endImage
          : undefined,
      reference_images:
        referenceImages.length > 0 ? referenceImages : undefined,
      cfg_scale: cfgScale,
      duration,
    };

    console.log("Payload being sent to server:", payload);

    const payloadSize = new TextEncoder().encode(
      JSON.stringify(payload)
    ).length;
    const maxPayloadSize = 10 * 1024 * 1024; // 10MB
    if (payloadSize > maxPayloadSize) {
      setError("Request size too large. Try reducing the size of images.");
      return;
    }

    setLoading(true);
    setError("");
    setCurrentVideo("");
    try {
      const userId = user.uid;
      const response = await fetch("http://localhost:3001/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json", "user-id": userId },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server response error:", errorText);
        if (errorText.includes("Queue is full")) {
          setError(
            "Sorry, the video generation queue is full on Replicate's side. Please try again later."
          );
          return;
        } else {
          throw new Error(
            `HTTP error! status: ${response.status}, message: ${errorText}`
          );
        }
      }

      const data = await response.json();
      console.log("Full response from /generate-video:", data);

      if (data.video) {
        setCurrentVideo(data.video);
        const videosRef = doc(db, "users", userId, "videos", "list");
        const videosSnap = await getDoc(videosRef);
        let videosList = [];
        if (videosSnap.exists()) {
          videosList = videosSnap.data().list || [];
        }
        videosList.push({
          src: data.video,
          alt: prompt,
          timestamp: Date.now(),
        });
        await setDoc(videosRef, { list: videosList }, { merge: true });
        setPreviousVideos(videosList);
        setLoading(false);
        return;
      }

      if (!data.predictionId) {
        throw new Error(
          "No prediction ID received from the server. Response: " +
            JSON.stringify(data)
        );
      }

      setActiveJobs((prevJobs) => [
        ...prevJobs,
        {
          predictionId: data.predictionId,
          prompt,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Error in generateVideo:", error);
      setError(`Error generating video: ${error.message}`);
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
    alert("Credits recharged: +10 credits!");
  };

  const handleFileUpload = (e, setter) => {
    const file = e.target.files[0];
    if (file) {
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setError("File too large. Please upload an image smaller than 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log(
          "Uploaded image Data URL:",
          reader.result.slice(0, 50) + "..."
        );
        setter(reader.result);
      };
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
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setError("File too large. Please upload an image smaller than 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log("Dropped image:", reader.result.slice(0, 50) + "...");
        setter(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRefImagesDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).slice(
      0,
      4 - referenceImages.length
    );
    const maxSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = files.filter((file) => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      setError(
        "One or more files are too large. Each image must be under 5MB."
      );
      return;
    }
    const readers = files.map((file) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      return new Promise(
        (resolve) => (reader.onloadend = () => resolve(reader.result))
      );
    });
    Promise.all(readers).then((results) => {
      console.log(
        "Dropped reference images:",
        results.map((r) => r.slice(0, 50) + "...")
      );
      setReferenceImages([...referenceImages, ...results].slice(0, 4));
    });
  };

  const handleRefImagesUpload = (e) => {
    const files = Array.from(e.target.files).slice(
      0,
      4 - referenceImages.length
    );
    const maxSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = files.filter((file) => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      setError(
        "One or more files are too large. Each image must be under 5MB."
      );
      return;
    }
    const readers = files.map((file) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      return new Promise(
        (resolve) => (reader.onloadend = () => resolve(reader.result))
      );
    });
    Promise.all(readers).then((results) => {
      console.log(
        "Uploaded reference images:",
        results.map((r) => r.slice(0, 50) + "...")
      );
      setReferenceImages([...referenceImages, ...results].slice(0, 4));
    });
  };

  return (
    <div className="generator-wrapper">
      {loading && (
        <div className="loading-modal">
          <video autoPlay loop muted className="loading-animation">
            <source src="/loading-animation.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      )}

      <div className="sidebar">
        <div className="sidebar-content">
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
              <option value="kwaivgi/kling-v1-6-standard">
                Kling 1.6 Standard (1 credit)
              </option>
              <option value="kwaivgi/kling-v1.6-pro">
                Kling Pro (2 credits)
              </option>
            </select>
          </div>
          <div className="input-group">
            <label>Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter a prompt (e.g., 'a futuristic cityscape with flying cars at sunset')"
            />
          </div>
          <div className="input-group">
            <label>Negative Prompt</label>
            <textarea
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="Things you don't want (e.g., 'blurry')"
            />
          </div>
          <div className="input-group">
            <label>Aspect Ratio</label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
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
                {startImage ? "Image loaded" : "Click / Drop / Paste here"}
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
                {endImage ? "Image loaded" : "Click / Drop / Paste here"}
              </label>
            </div>
          </div>
          <div className="input-group">
            <label>Reference Images (up to 4)</label>
            <div
              ref={refImagesRef}
              onDragOver={handleDragOver}
              onDrop={handleRefImagesDrop}
              style={{
                border: "2px dashed var(--border-color)",
                padding: "10px",
                textAlign: "center",
                borderRadius: "6px",
                backgroundColor:
                  referenceImages.length > 0
                    ? "var(--input-bg)"
                    : "transparent",
              }}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleRefImagesUpload}
                style={{ display: "none" }}
                id="ref-upload"
              />
              <label htmlFor="ref-upload" style={{ cursor: "pointer" }}>
                {referenceImages.length > 0
                  ? `${referenceImages.length} images loaded`
                  : "Click / Drop / Paste here"}
              </label>
            </div>
          </div>
          <div className="input-group">
            <label>CFG Scale</label>
            <input
              type="number"
              value={cfgScale}
              onChange={(e) =>
                setCfgScale(Math.min(1, Math.max(0, Number(e.target.value))))
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
          {error && <div className="error-message">{error}</div>}
          {activeJobs.length > 0 && (
            <div className="status-message">
              {activeJobs.map((job) => (
                <div key={job.predictionId}>
                  Generating video for: {job.prompt}...
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="generate-btn-container">
          <button
            onClick={generateVideo}
            className="generate-btn"
            disabled={loading || credits === null || credits <= 0}
          >
            Generate Video
          </button>
        </div>
      </div>
      <div className="main-content">
        <div className="preview-section">
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
