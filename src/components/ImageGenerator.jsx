import React, { useState, useEffect, useCallback, useRef } from "react";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "./firebase";
import "../styles/GeneratorStyles.css";

const ImageGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const [startImage, setStartImage] = useState("");
  const [currentImage, setCurrentImage] = useState("");
  const [error, setError] = useState("");
  const [previousImages, setPreviousImages] = useState([]);
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeJobs, setActiveJobs] = useState(() => {
    const savedJobs = localStorage.getItem("activeJobs");
    return savedJobs ? JSON.parse(savedJobs) : [];
  });
  const [showCreditOptions, setShowCreditOptions] = useState(false);
  const startRef = useRef(null);

  // Calculate credits cost (1 credit per image)
  const calculateCreditsCost = () => 1;
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
            `https://saturn-backend-sdht.onrender.com/check-status/${predictionId}`,
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
          if (status === "succeeded" && data.imageUrl) {
            setCurrentImage(data.imageUrl); // עדכון תמונה
            setLoading(false);
            setActiveJobs((prevJobs) =>
              prevJobs.filter((job) => job.predictionId !== predictionId)
            );
            break;
          } else if (status === "failed" || status === "canceled") {
            setError(data.error || "Image generation failed");
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

    const imagesRef = doc(db, "users", userId, "images", "list");
    const unsubscribeImages = onSnapshot(
      imagesRef,
      (doc) => {
        if (doc.exists()) {
          setPreviousImages(doc.data().list || []);
        } else {
          setDoc(imagesRef, { list: [] }, { merge: true });
        }
      },
      (error) => {
        console.error("Error listening to images:", error.message);
        setError("Failed to load previous images");
      }
    );

    const savedJobs = JSON.parse(localStorage.getItem("activeJobs") || "[]");
    if (savedJobs.length > 0) {
      savedJobs.forEach((job) => checkJobStatus(job.predictionId));
    }

    return () => {
      unsubscribeCredits();
      unsubscribeImages();
    };
  }, [auth, db, checkJobStatus]);

  const generateImage = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt!");
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      setError("Please sign in to generate images.");
      return;
    }
    if (credits === null || credits < creditsCost) {
      setError(`Not enough credits. Required: ${creditsCost}`);
      return;
    }

    setLoading(true);
    setError("");
    setCurrentImage("");

    try {
      const userId = user.uid;
      const payload = {
        model:
          "stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
        prompt,
        width: 768,
        height: 768,
        refine: "expert_ensemble_refiner",
        apply_watermark: false,
        num_inference_steps: 25,
        ...(startImage ? { image: startImage } : {}),
      };
      console.log("Sending payload to generate-image:", payload);
      const response = await fetch(
        "https://saturn-backend-sdht.onrender.com/generate-image", // נתיב חדש ליצירת תמונות
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "user-id": userId },
          body: JSON.stringify(payload),
        }
      );

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
      console.error("Error generating image:", error.message);
      setError(`Error generating image: ${error.message}`);
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.size <= 5 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result;
        const user = auth.currentUser;
        if (user) {
          const userId = user.uid;
          const storageRef = ref(
            storage,
            `users/${userId}/images/${Date.now()}.png`
          );
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          await uploadBytes(storageRef, blob);
          const imageUrl = await getDownloadURL(storageRef);
          setStartImage(imageUrl);
        }
      };
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
      reader.onloadend = async () => {
        const dataUrl = reader.result;
        const user = auth.currentUser;
        if (user) {
          const userId = user.uid;
          const storageRef = ref(
            storage,
            `users/${userId}/images/${Date.now()}.png`
          );
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          await uploadBytes(storageRef, blob);
          const imageUrl = await getDownloadURL(storageRef);
          setStartImage(imageUrl);
        }
      };
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
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      }
    } catch (error) {
      setError(`Error initiating payment: ${error.message}`);
    }
  };

  return (
    <div className="generator-wrapper">
      {loading && (
        <div className="loading-modal">
          <p className="loading-text">Generating...</p>
        </div>
      )}
      <div className="sidebar">
        <div className="sidebar-content">
          <h2>Saturn AI Image Generator</h2>
          <div className="credits-section">
            <span>Credits: {credits !== null ? credits : "Loading..."}</span>
            <button
              className="recharge-btn"
              onClick={handleBuyCredits}
              disabled={loading || credits === null}
            >
              Buy Credits
            </button>
            {showCreditOptions && (
              <div className="credit-options">
                <button
                  onClick={() => initiatePayPalPayment(6.99, 72)}
                  className="credit-option-btn"
                >
                  72 Credits for $6.99
                </button>
                <button
                  onClick={() => initiatePayPalPayment(13.99, 150)}
                  className="credit-option-btn"
                >
                  150 Credits for $13.99
                </button>
                <button
                  onClick={() => initiatePayPalPayment(25.99, 300)}
                  className="credit-option-btn"
                >
                  300 Credits for $25.99
                </button>
              </div>
            )}
          </div>
          <div className="input-group">
            <label>Prompt</label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter a prompt (e.g., 'sun')"
              disabled={loading || credits === null || credits < creditsCost}
            />
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
          {error && <div className="error-message">{error}</div>}
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
            onClick={generateImage}
            className="generate-btn"
            disabled={loading || credits === null || credits < creditsCost}
          >
            Generate Image ({creditsCost} Credit)
          </button>
        </div>
      </div>
      <div className="main-content">
        <div className="preview-section">
          {currentImage && !loading && (
            <img src={currentImage} alt={prompt} className="preview-media" />
          )}
        </div>
        <div className="previous-section">
          <h2>Previous Images</h2>
          <div className="media-grid">
            {previousImages.map((img, index) => (
              <div key={index} className="media-item">
                <img src={img.src} alt={img.alt} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageGenerator;
