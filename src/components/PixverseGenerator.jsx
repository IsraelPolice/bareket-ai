import React, { useState, useEffect, useCallback } from "react";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import "../styles/GeneratorStyles.css";

const PixverseGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const [quality, setQuality] = useState("720p");
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

  const auth = getAuth();
  const db = getFirestore();

  // Calculate credits cost based on duration and quality
  const calculateCreditsCost = () => {
    let baseCredits;
    if (quality === "540p") baseCredits = 6; // Lowest quality
    else if (quality === "720p") baseCredits = 9; // Medium quality
    else if (quality === "1080p") baseCredits = 12; // Highest quality
    if (duration === "10") {
      baseCredits *= 2; // Double the cost for 10 seconds
    }
    return baseCredits;
  };

  const creditsCost = calculateCreditsCost();

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
            const errorText = await response.text();
            throw new Error(`Failed to check status: ${errorText}`);
          }
          const data = await response.json();
          console.log("Status response:", data);
          status = data.status;
          if (status === "succeeded" && data.videoUrl) {
            setCurrentVideo(data.videoUrl);
            setCredits(data.value);
            const creditsRef = doc(db, "users", userId, "credits", "current");
            const creditsSnap = await getDoc(creditsRef);
            if (creditsSnap.exists()) setCredits(creditsSnap.data().value);
            const videosRef = doc(db, "users", userId, "videos", "list");
            const videosSnap = await getDoc(videosRef);
            if (videosSnap.exists())
              setPreviousVideos(videosSnap.data().list || []);
            setActiveJobs((prevJobs) =>
              prevJobs.filter((job) => job.predictionId !== predictionId)
            );
            break;
          } else if (status === "failed" || status === "canceled") {
            setError(data.error || "Unknown error");
            setActiveJobs((prevJobs) =>
              prevJobs.filter((job) => job.predictionId !== predictionId)
            );
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
      } finally {
        setLoading(false);
      }
    },
    [auth, db]
  );

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setError("Please sign in.");
      return;
    }
    const userId = user.uid;

    // Check for payment status in URL
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get("payment");
    const urlUserId = urlParams.get("userId");
    const creditsAdded = urlParams.get("credits");
    console.log("URL Parameters after payment:", {
      paymentStatus,
      urlUserId,
      creditsAdded,
    });

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
        }
        const savedJobs = JSON.parse(
          localStorage.getItem("activeJobs") || "[]"
        );
        if (savedJobs.length > 0) {
          savedJobs.forEach((job) => checkJobStatus(job.predictionId));
        }
      } catch (err) {
        console.error("Error loading initial data:", err.message);
        setError(`Error fetching data: ${err.message}`);
      }
    };
    loadInitialData();
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
    const payload = {
      model: "pixverse/pixverse-v4.5",
      prompt,
      quality,
      duration: parseInt(duration),
    };
    console.log("Sending payload:", payload);
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
        throw new Error(errorText);
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
        "http://localhost:3001/create-paypal-payment",
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
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      }
    } catch (error) {
      console.error("Error initiating PayPal payment:", error.message);
      setError(`Error initiating payment: ${error.message}`);
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
          <h2>Pixverse 4.5 Video Generator</h2>
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
              placeholder="Enter a prompt (e.g., 'Snow leopard walking in snowy landscape')"
              disabled={credits === null || credits < creditsCost}
            />
          </div>
          <div className="input-group">
            <label>Quality</label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              disabled={credits === null || credits < creditsCost}
            >
              <option value="540p">540p</option>
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
            </select>
          </div>
          <div className="input-group">
            <label>Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              disabled={credits === null || credits < creditsCost}
            >
              <option value="5">5 seconds</option>
              <option value="10">10 seconds</option>
            </select>
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

export default PixverseGenerator;
