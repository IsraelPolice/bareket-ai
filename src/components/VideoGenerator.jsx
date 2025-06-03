import React, { useState, useEffect } from "react";
import { auth, db, storage } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const VideoGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const [startImage, setStartImage] = useState("");
  const [currentVideo, setCurrentVideo] = useState("");
  const [error, setError] = useState("");
  const [previousVideos, setPreviousVideos] = useState([]);
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
        body: JSON.stringify({ prompt, start_image: startImage }),
      });
      if (!response.ok) throw new Error("Error generating video. Try again!");
      const data = await response.json();
      console.log("Replicate video response:", data);
      const videoUrl = data.video;

      // הורד את הווידאו מה-URL ושמור ב-Firebase Storage
      const videoResponse = await fetch(videoUrl);
      const videoBlob = await videoResponse.blob();

      const userId = user.uid;
      const storageRef = ref(
        storage,
        `users/${userId}/videos/${Date.now()}.mp4`
      );
      console.log("Uploading to Storage:", storageRef.fullPath);
      console.log("User authenticated:", !!auth.currentUser);
      console.log("User token:", await auth.currentUser.getIdToken());
      await uploadBytes(storageRef, videoBlob);
      const savedVideoUrl = await getDownloadURL(storageRef);
      console.log("Generated video URL:", savedVideoUrl);

      setCurrentVideo(savedVideoUrl);

      const newCredits = credits - 1;
      setCredits(newCredits);
      const creditsRef = doc(db, "users", userId, "credits", "current");
      console.log("Updating credits to:", newCredits);
      await setDoc(creditsRef, { value: newCredits });

      const newVideo = {
        src: savedVideoUrl,
        alt: prompt,
        timestamp: new Date(),
      };
      const updatedVideos = [newVideo, ...previousVideos];
      setPreviousVideos(updatedVideos);
      const videosRef = doc(db, "users", userId, "videos", "list");
      console.log("Saving videos to:", videosRef.path);
      await setDoc(videosRef, { list: updatedVideos }, { merge: true });
    } catch (error) {
      setError(`Error generating video: ${error.message}`);
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
    <div className="container mt-4">
      <h1 className="text-center mb-4">Saturn AI Video Generator</h1>
      <div className="alert alert-info mb-3">
        Credits left: {credits !== null ? credits : "Loading..."}
        <button
          className="btn btn-success ms-2"
          onClick={rechargeCredits}
          disabled={loading || credits === null}
        >
          Recharge (+10)
        </button>
      </div>
      <div className="mb-3">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter a prompt (e.g., 'a woman underwater with flowing hair')"
          className="form-control"
          disabled={credits === null || credits <= 0}
        />
        <input
          type="text"
          value={startImage}
          onChange={(e) => setStartImage(e.target.value)}
          placeholder="Enter start image URL (optional)"
          className="form-control mt-2"
          disabled={credits === null || credits <= 0}
        />
        <button
          onClick={generateVideo}
          className="btn btn-primary mt-2 w-100"
          disabled={loading || credits === null || credits <= 0}
        >
          Generate Video
        </button>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="text-center mb-4">
        {loading && <p className="text-muted">Generating...</p>}
        {currentVideo && !loading && (
          <video controls className="img-fluid">
            <source src={currentVideo} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        )}
      </div>
      <h2 className="mb-3">Previous Videos</h2>
      <div className="row row-cols-1 row-cols-md-3 g-3">
        {previousVideos.map((vid, index) => (
          <div key={index} className="col">
            <video controls className="img-thumbnail">
              <source src={vid.src} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VideoGenerator;
