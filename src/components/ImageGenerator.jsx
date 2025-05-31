import React, { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const ImageGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const [currentImage, setCurrentImage] = useState("");
  const [previousImages, setPreviousImages] = useState([]);
  const [credits, setCredits] = useState(10);
  const [loading, setLoading] = useState(false);

  // טעינת נתונים של המשתמש מ-Firestore בעת טעינת הקומפוננטה
  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const userId = user.uid;

        // טעינת קרדיטים מתת-קולקציה 'credits'
        const creditsRef = doc(db, "users", userId, "credits", "current");
        const creditsSnap = await getDoc(creditsRef);
        if (creditsSnap.exists()) {
          setCredits(creditsSnap.data().value);
        } else {
          // אם אין קרדיטים, הגדר 10 כברירת מחדל
          await setDoc(creditsRef, { value: 10 });
          setCredits(10);
        }

        // טעינת תמונות קודמות מתת-קולקציה 'images'
        const imagesRef = doc(db, "users", userId, "images", "list");
        const imagesSnap = await getDoc(imagesRef);
        if (imagesSnap.exists()) {
          const imagesData = imagesSnap.data().list || [];
          setPreviousImages(imagesData);
          console.log("Loaded previous images:", imagesData); // בדיקה
        } else {
          console.log("No previous images found, initializing empty list");
          setPreviousImages([]);
        }
      }
    };

    fetchUserData();
  }, []);

  const generateImage = async () => {
    if (!prompt.trim()) return alert("Please enter a prompt!");
    if (credits <= 0) return alert("No credits left! Please recharge.");
    setLoading(true);
    setCurrentImage("Generating...");
    try {
      const response = await fetch("http://localhost:3001/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, width: 768, height: 768 }),
      });
      if (!response.ok) throw new Error("Error generating image. Try again!");
      const data = await response.json();
      const base64Image = data.image;
      setCurrentImage(base64Image);

      // עדכון קרדיטים
      const user = auth.currentUser;
      const userId = user.uid;
      const newCredits = credits - 1;
      setCredits(newCredits);
      const creditsRef = doc(db, "users", userId, "credits", "current");
      await setDoc(creditsRef, { value: newCredits });

      // עדכון תמונות קודמות
      const newImage = { src: base64Image, alt: prompt };
      const updatedImages = [newImage, ...previousImages].slice(0, 10);
      setPreviousImages(updatedImages);
      const imagesRef = doc(db, "users", userId, "images", "list");
      await setDoc(imagesRef, { list: updatedImages }, { merge: true });
      console.log("Saved images to Firestore:", updatedImages); // בדיקה
    } catch (error) {
      setCurrentImage("Error generating image. Try again!");
      console.error("Error generating image:", error);
    } finally {
      setLoading(false);
    }
  };

  const rechargeCredits = async () => {
    const user = auth.currentUser;
    if (user) {
      const userId = user.uid;
      const newCredits = credits + 10;
      setCredits(newCredits);
      const creditsRef = doc(db, "users", userId, "credits", "current");
      await setDoc(creditsRef, { value: newCredits });
      alert("Credits recharged! +10 credits.");
    }
  };

  return (
    <div className="container mt-4">
      <h1 className="text-center mb-4">Bareket AI Image Generator</h1>
      <div className="alert alert-info mb-3">
        Credits left: {credits}
        <button
          className="btn btn-success ms-2"
          onClick={rechargeCredits}
          disabled={loading}
        >
          Recharge (+10)
        </button>
      </div>
      <div className="mb-3">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter a prompt (e.g., 'sun')"
          className="form-control"
        />
        <button
          onClick={generateImage}
          className="btn btn-primary mt-2 w-100"
          disabled={loading}
        >
          Generate Image
        </button>
      </div>
      <div className="text-center mb-4">
        {currentImage && (
          <div>
            {typeof currentImage === "string" &&
            currentImage.includes("Generating...") ? (
              <p className="text-muted">{currentImage}</p>
            ) : (
              <img src={currentImage} alt={prompt} className="img-fluid" />
            )}
          </div>
        )}
      </div>
      <h2 className="mb-3">Previous Images</h2>
      <div className="row row-cols-1 row-cols-md-3 g-3">
        {previousImages.map((img, index) => (
          <div key={index} className="col">
            <img src={img.src} alt={img.alt} className="img-thumbnail" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImageGenerator;
