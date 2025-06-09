import React, { useState, useEffect } from "react";
import { auth, db, storage } from "./firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import "../styles/GeneratorStyles.css";

const ImageGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const [currentImage, setCurrentImage] = useState("");
  const [error, setError] = useState("");
  const [previousImages, setPreviousImages] = useState([]);
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCreditOptions, setShowCreditOptions] = useState(false);

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
    getDoc(imagesRef).then((docSnap) => {
      if (docSnap.exists()) {
        setPreviousImages(docSnap.data().list || []);
      } else {
        setDoc(imagesRef, { list: [] }, { merge: true });
      }
    });

    return () => {
      unsubscribeCredits();
    };
  }, []);

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
    if (credits === null || credits <= 0) {
      setError("No credits left! Please purchase more.");
      return;
    }

    setLoading(true);
    setError("");
    setCurrentImage("");

    try {
      const response = await fetch(
        "https://saturn-backend-sdht.onrender.com/generate-image",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, width: 768, height: 768 }),
        }
      );
      if (!response.ok) throw new Error("Error generating image. Try again!");
      const data = await response.json();
      const imageUrl = data.image;

      const imageResponse = await fetch(imageUrl);
      const imageBlob = await imageResponse.blob();

      const userId = user.uid;
      const storageRef = ref(
        storage,
        `users/${userId}/images/${Date.now()}.png`
      );
      await uploadBytes(storageRef, imageBlob);
      const imageUrlSaved = await getDownloadURL(storageRef);
      setCurrentImage(imageUrlSaved);

      const newCredits = credits - 1;
      setCredits(newCredits);
      const creditsRef = doc(db, "users", userId, "credits", "current");
      await setDoc(creditsRef, { value: newCredits });

      const newImage = {
        src: imageUrlSaved,
        alt: prompt,
        timestamp: new Date(),
      };
      const updatedImages = [newImage, ...previousImages];
      setPreviousImages(updatedImages);
      const imagesRef = doc(db, "users", userId, "images", "list");
      await setDoc(imagesRef, { list: updatedImages }, { merge: true });
    } catch (error) {
      setError(`Error generating image: ${error.message}`);
    } finally {
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
              disabled={credits === null || credits <= 0}
            />
          </div>
          {error && <div className="error-message">{error}</div>}
        </div>
        <div className="generate-btn-container">
          <button
            onClick={generateImage}
            className="generate-btn"
            disabled={loading || credits === null || credits <= 0}
          >
            Generate Image
          </button>
        </div>
      </div>
      <div className="main-content">
        <div className="preview-section">
          {loading && <p className="loading-text">Generating...</p>}
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
