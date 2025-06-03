import React, { useState, useEffect } from "react";
import { auth, db, storage } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import "../styles/GeneratorStyles.css";

const ImageGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const [currentImage, setCurrentImage] = useState("");
  const [error, setError] = useState("");
  const [previousImages, setPreviousImages] = useState([]);
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(false);

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

        const imagesRef = doc(db, "users", userId, "images", "list");
        console.log("Fetching images from:", imagesRef.path);
        const imagesSnap = await getDoc(imagesRef);
        if (imagesSnap.exists()) {
          const imagesData = imagesSnap.data().list || [];
          setPreviousImages(imagesData);
          console.log("Loaded previous images:", imagesData);
        } else {
          console.log("No images found, initializing empty list");
          await setDoc(imagesRef, { list: [] }, { merge: true });
          setPreviousImages([]);
        }
      } catch (err) {
        setError("Error fetching user data: " + err.message);
        console.error("Firestore error:", err);
      }
    };
    fetchUserData();
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
      setError("No credits left or data not loaded! Please recharge or wait.");
      return;
    }
    setLoading(true);
    setError("");
    setCurrentImage("");
    try {
      const response = await fetch("http://localhost:3001/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, width: 768, height: 768 }),
      });
      if (!response.ok) throw new Error("Error generating image. Try again!");
      const data = await response.json();
      console.log("Replicate response:", data);
      const base64Image = data.image;

      const userId = user.uid;
      const storageRef = ref(
        storage,
        `users/${userId}/images/${Date.now()}.png`
      );
      console.log("Uploading to Storage:", storageRef.fullPath);
      console.log("User authenticated:", !!auth.currentUser);
      console.log("User token:", await auth.currentUser.getIdToken());
      await uploadString(storageRef, base64Image, "data_url");
      const imageUrl = await getDownloadURL(storageRef);
      console.log("Generated image URL:", imageUrl);

      setCurrentImage(imageUrl);

      const newCredits = credits - 1;
      setCredits(newCredits);
      const creditsRef = doc(db, "users", userId, "credits", "current");
      console.log("Updating credits to:", newCredits);
      await setDoc(creditsRef, { value: newCredits });

      const newImage = { src: imageUrl, alt: prompt, timestamp: new Date() };
      const updatedImages = [newImage, ...previousImages];
      setPreviousImages(updatedImages);
      const imagesRef = doc(db, "users", userId, "images", "list");
      console.log("Saving images to:", imagesRef.path);
      await setDoc(imagesRef, { list: updatedImages }, { merge: true });
    } catch (error) {
      setError(`Error generating image: ${error.message}`);
      console.error("Error details:", error);
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
    console.log("Recharging credits to:", newCredits);
    await setDoc(creditsRef, { value: newCredits });
    setError("");
    alert("Credits recharged! +10 credits.");
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
              onClick={rechargeCredits}
              disabled={loading || credits === null}
            >
              Recharge (+10)
            </button>
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
