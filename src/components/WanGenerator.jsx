import React, { useState, useEffect, useRef, useCallback } from "react";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import "../styles/GeneratorStyles.css";

const WanGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const [startImage, setStartImage] = useState("");
  const [duration, setDuration] = useState("5");
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

  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();

  useEffect(() => {
    localStorage.setItem("activeJobs", JSON.stringify(activeJobs));
  }, [activeJobs]);

  const checkJobStatus = useCallback(
    async (predictionId) => {
      try {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");
        const userId = user.uid;
        let status = "processing";
        while (status === "processing") {
          console.log(`Checking status for prediction: ${predictionId}`);
          const response = await fetch(
            `http://localhost:3001/check-status/${predictionId}`,
            {
              headers: { "user-id": userId },
            }
          );
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.error || `HTTP error: ${response.status}`
            );
          }
          const data = await response.json();
          console.log("Status response:", data);
          status = data.status;
          if (status === "succeeded" && data.videoUrl) {
            setCurrentVideo(data.videoUrl);
            setLoading(false);
            setActiveJobs((prevJobs) =>
              prevJobs.filter((job) => job.predictionId !== predictionId)
            );
            break;
          } else if (status === "failed" || status === "canceled") {
            setError(data.error || "Video generation failed");
            setActiveJobs((prevJobs) =>
              prevJobs.filter((job) => job.predictionId !== predictionId)
            );
            setLoading(false);
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      } catch (error) {
        console.error("Error in checkJobStatus:", error.message);
        setError(`Error checking job: ${error.message}`);
        setActiveJobs((prevJobs) =>
          prevJobs.filter((job) => job.predictionId !== predictionId)
        );
        setLoading(false);
      }
    },
    [auth]
  );

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setError("Please sign in.");
      return;
    }
    const userId = user.uid;
    console.log("Initializing Firestore listeners for user:", userId);

    // Listen to credits
    const creditsRef = doc(db, "users", userId, "credits", "current");
    const unsubscribeCredits = onSnapshot(
      creditsRef,
      (doc) => {
        if (doc.exists()) {
          console.log("Credits updated:", doc.data().value);
          setCredits(doc.data().value);
        } else {
          console.log("Credits document does not exist, creating...");
          setDoc(creditsRef, { value: 10 }).then(() => setCredits(10));
        }
      },
      (error) => {
        console.error("Error listening to credits:", error.message);
        setError("Failed to load credits");
      }
    );

    // Listen to videos
    const videosRef = doc(db, "users", userId, "videos", "list");
    const unsubscribeVideos = onSnapshot(
      videosRef,
      (doc) => {
        if (doc.exists()) {
          console.log("Videos updated:", doc.data().list);
          setPreviousVideos(doc.data().list || []);
        } else {
          console.log("Videos document does not exist, creating...");
          setDoc(videosRef, { list: [] }, { merge: true }).then(() =>
            setPreviousVideos([])
          );
        }
      },
      (error) => {
        console.error("Error listening to videos:", error.message);
        setError("Failed to load previous videos");
      }
    );

    // Check active jobs
    const savedJobs = JSON.parse(localStorage.getItem("activeJobs") || "[]");
    if (savedJobs.length > 0) {
      savedJobs.forEach((job) => checkJobStatus(job.predictionId));
    }

    return () => {
      unsubscribeCredits();
      unsubscribeVideos();
    };
  }, [auth, db, checkJobStatus]);

  const generateVideo = async () => {
    if (!prompt.trim()) {
      setError("Prompt is required.");
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      setError("Please sign in.");
      return;
    }
    if (credits === null || credits < 1) {
      setError("Not enough credits.");
      return;
    }
    const model = startImage
      ? "wavespeedai/wan-2.1-i2v-480p"
      : "wavespeedai/wan-2.1-t2v-480p";
    const payload = {
      model,
      prompt,
      duration: parseInt(duration),
      ...(startImage ? { image: startImage } : {}),
    };
    console.log("Sending payload:", payload);
    setLoading(true);
    setError("");
    setCurrentVideo("");
    try {
      const userId = user.uid;
      console.log("Generating video for user:", userId);
      const response = await fetch("http://localhost:3001/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json", "user-id": userId },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error: ${response.status}`);
      }
      const data = await response.json();
      console.log("Generate response:", data);
      if (!data.predictionId) {
        throw new Error("No prediction ID returned from server.");
      }
      setActiveJobs((prevJobs) => [
        ...prevJobs,
        { predictionId: data.predictionId, prompt, createdAt: Date.now() },
      ]);
      await checkJobStatus(data.predictionId);
    } catch (error) {
      console.error("Error generating video:", error.message);
      setError(`Error generating video: ${error.message}`);
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.size <= 5 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onloadend = () => setStartImage(reader.result);
      reader.readAsDataURL(file);
    } else {
      setError("Image must be under 5MB.");
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (
      file &&
      file.type.startsWith("image/") &&
      file.size <= 5 * 1024 * 1024
    ) {
      const reader = new FileReader();
      reader.onloadend = () => setStartImage(reader.result);
      reader.readAsDataURL(file);
    } else {
      setError("Invalid file type or size. Image must be under 5MB.");
    }
  };

  const rechargeCredits = async () => {
    const user = auth.currentUser;
    if (!user) {
      setError("Please sign in.");
      return;
    }
    const userId = user.uid;
    try {
      const creditsRef = doc(db, "users", userId, "credits", "current");
      const creditsSnap = await getDoc(creditsRef);
      const currentCredits = creditsSnap.exists()
        ? creditsSnap.data().value
        : 0;
      const newCredits = currentCredits + 10;
      await setDoc(creditsRef, { value: newCredits });
      console.log("Credits recharged to:", newCredits);
      setError("");
      alert("Credits recharged: +10!");
    } catch (error) {
      console.error("Error recharging credits:", error.message);
      setError(`Failed to recharge credits: ${error.message}`);
    }
  };

  return (
    <div className="generator-wrapper">
      {loading && (
        <div className="loading-modal">
          <video autoPlay loop muted className="loading-animation">
            <source src="/loading-animation.mp4" type="video/mp4" />
          </video>
        </div>
      )}
      <div className="sidebar">
        <div className="sidebar-content">
          <h2>Wan 2.1 Video Generator</h2>
          <div className="credits-box">
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
            <label>Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter a prompt (e.g., 'A cat diving')"
              disabled={loading || credits === null || credits <= 0}
            />
          </div>
          <div className="input-group">
            <label>Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              disabled={loading || credits === null || credits <= 0}
            >
              <option value="5">5 seconds</option>
              <option value="10">10 seconds</option>
            </select>
          </div>
          <div className="input-group">
            <label>Start Image (Optional)</label>
            <div
              ref={startRef}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              style={{
                border: "2px dashed var(--text-color)",
                padding: "10px",
                textAlign: "center",
                borderRadius: "5px",
                backgroundColor: startImage ? "var(--input-bg)" : undefined,
              }}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: "none" }}
                id="start-upload"
              />
              <label htmlFor="start-upload" style={{ cursor: "pointer" }}>
                {startImage ? "Image Loaded" : "Click or Drop Image Here"}
              </label>
            </div>
          </div>
          {error && (
            <div className="error-message">
              <span>{error}</span>
            </div>
          )}
          {activeJobs.length > 0 && (
            <div className="status-message">
              {activeJobs.map((job) => (
                <div key={job.predictionId}>Generating: {job.prompt}...</div>
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
      <div className="content-wrapper">
        <div className="preview-section">
          {currentVideo && !loading && (
            <video controls className="preview-media">
              <source src={currentVideo} type="video/mp4" />
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
                </video>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WanGenerator;
