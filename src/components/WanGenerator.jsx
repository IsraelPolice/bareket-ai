import React, { useState, useEffect, useRef, useCallback } from "react";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
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
  const [showCreditOptions, setShowCreditOptions] = useState(false);
  const startRef = useRef(null);

  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();

  const calculateCreditsCost = () => {
    let baseCredits = 8;
    if (duration === "10") baseCredits *= 2;
    return baseCredits;
  };

  const creditsCost = calculateCreditsCost();

  useEffect(() => {
    localStorage.setItem("activeJobs", JSON.stringify(activeJobs));
  }, [activeJobs]);

  const saveVideoToStorage = async (videoUrl, userId, prompt) => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const fileName = `users/${userId}/videos/video-${Date.now()}.mp4`;
      const storageRef = storageRef(storage, fileName);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (error) {
      console.error("Error saving video to Storage:", error.message);
      return videoUrl;
    }
  };

  const checkJobStatus = useCallback(
    async (predictionId) => {
      try {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");
        const userId = user.uid;
        let status = "processing";
        while (status === "processing") {
          const response = await fetch(
            `https://saturn-backend-sdht.onrender.com/check-status/${predictionId}`,
            { headers: { "user-id": userId } }
          );
          if (!response.ok) throw new Error(await response.text());
          const data = await response.json();
          status = data.status;
          if (status === "succeeded" && data.videoUrl) {
            const savedUrl = await saveVideoToStorage(
              data.videoUrl,
              userId,
              prompt
            );
            setCurrentVideo(savedUrl);
            if (data.value !== undefined) setCredits(data.value); // עדכון הקרדיטים מהשרת
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
        setLoading(false);
      }
    },
    [auth, prompt, saveVideoToStorage]
  );

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setError("Please sign in.");
      return;
    }
    const userId = user.uid;

    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get("payment");
    const urlUserId = urlParams.get("userId");
    const creditsAdded = urlParams.get("credits");

    if (paymentStatus === "success" && urlUserId === userId && creditsAdded) {
      setError(`Payment successful! Added ${creditsAdded} credits.`);
      const creditsRef = doc(db, "users", userId, "credits", "current");
      getDoc(creditsRef).then((snap) => {
        const currentCredits = snap.exists() ? snap.data().value : 0;
        const newCredits = currentCredits + parseInt(creditsAdded);
        setDoc(creditsRef, { value: newCredits }, { merge: true });
        setCredits(newCredits);
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentStatus === "cancel") {
      setError("Payment canceled.");
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentStatus === "success" && urlUserId !== userId) {
      setError("Payment successful, but user ID mismatch. Credits not added.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const creditsRef = doc(db, "users", userId, "credits", "current");
    const unsubscribeCredits = onSnapshot(
      creditsRef,
      (doc) => {
        if (doc.exists()) {
          setCredits(doc.data().value);
        } else {
          setDoc(creditsRef, { value: 10 }).then(() => setCredits(10));
        }
      },
      (error) => {
        console.error("Error listening to credits:", error.message);
        setError("Failed to load credits");
      }
    );

    const videosRef = doc(db, "users", userId, "videos", "list");
    const unsubscribeVideos = onSnapshot(
      videosRef,
      (doc) => {
        if (doc.exists()) {
          setPreviousVideos(doc.data().list || []);
        } else {
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
    if (credits === null || credits < creditsCost) {
      setError(`Not enough credits. Required: ${creditsCost}`);
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
    setLoading(true);
    setError("");
    setCurrentVideo("");
    try {
      const userId = user.uid;
      const response = await fetch(
        "https://saturn-backend-sdht.onrender.com/generate-video",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "user-id": userId },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error: ${response.status}`);
      }
      const data = await response.json();
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

  const handleBuyCredits = () => {
    setShowCreditOptions(!showCreditOptions);
  };

  const initiatePayPalPayment = async (amount, creditsToAdd) => {
    const user = auth.currentUser;
    if (!user) {
      setError("Please sign in.");
      return;
    }
    const userId = user.uid;
    try {
      const response = await fetch(
        "https://saturn-backend-sdht.onrender.com/create-paypal-payment",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "user-id": userId },
          body: JSON.stringify({ amount, credits: creditsToAdd }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error: ${response.status}`);
      }
      const data = await response.json();
      if (data.paymentUrl) window.location.href = data.paymentUrl;
    } catch (error) {
      console.error("Error initiating PayPal payment:", error.message);
      setError(`Error initiating payment: ${error.message}`);
    }
  };

  const handleDeleteVideo = async (index) => {
    const userId = auth.currentUser.uid;
    const videoToDelete = previousVideos[index];
    const updatedVideos = previousVideos.filter((_, i) => i !== index);
    setPreviousVideos(updatedVideos);

    try {
      const videosRef = doc(db, "users", userId, "videos", "list");
      const snap = await getDoc(videosRef);
      if (snap.exists()) {
        const updatedList = snap
          .data()
          .list.filter((item) => item.src !== videoToDelete.src);
        await setDoc(videosRef, { list: updatedList }, { merge: true });
      }
    } catch (error) {
      console.error("Error deleting video:", error.message);
      setError("Failed to delete video");
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
              onClick={handleBuyCredits}
              disabled={loading || credits === null}
            >
              Buy Credits
            </button>
          </div>
          {showCreditOptions && (
            <div className="credit-options">
              <button
                onClick={() => initiatePayPalPayment(6.99, 72)}
                className="credit-option-btn"
              >
                72 Credits for $6.99 (12 Basic Videos)
              </button>
              <button
                onClick={() => initiatePayPalPayment(13.99, 150)}
                className="credit-option-btn"
              >
                150 Credits for $13.99 (24 Basic Videos)
              </button>
              <button
                onClick={() => initiatePayPalPayment(25.99, 300)}
                className="credit-option-btn"
              >
                300 Credits for $25.99 (36 Basic Videos)
              </button>
            </div>
          )}
          <div className="input-group">
            <label>Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter a prompt (e.g., 'A cat diving')"
              disabled={loading || credits === null || credits < creditsCost}
            />
          </div>
          <div className="input-group">
            <label>Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              disabled={loading || credits === null || credits < creditsCost}
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
            disabled={loading || credits === null || credits < creditsCost}
          >
            Generate Video ({creditsCost} Credits)
          </button>
        </div>
      </div>
      <div className="content-wrapper">
        <div className="preview-section">
          {currentVideo && !loading && (
            <video
              controls
              className="preview-media"
              style={{ maxWidth: "300px", maxHeight: "200px" }}
            >
              <source src={currentVideo} type="video/mp4" />
            </video>
          )}
        </div>
        <div className="previous-section">
          <h2>Previous Videos</h2>
          <div className="media-grid">
            {previousVideos.map((vid, index) => (
              <div key={index} className="media-item">
                <video
                  controls
                  style={{ maxWidth: "300px", maxHeight: "200px" }}
                >
                  <source src={vid.src} type="video/mp4" />
                </video>
                <div className="media-details">
                  <p>Prompt: {vid.prompt || "No prompt"}</p>
                  <button
                    className="download-btn"
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = vid.src;
                      link.download = `video-${Date.now()}.mp4`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                  >
                    Download
                  </button>
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteVideo(index)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WanGenerator;
