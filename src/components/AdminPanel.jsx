import React, { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import "../styles/MyAccountStyles.css";

const AdminPanel = () => {
  const [previousPrompts, setPreviousPrompts] = useState([]); // Combine images and videos
  const [activeSection, setActiveSection] = useState("previousPrompts");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchPrompts = async () => {
      const user = auth.currentUser;
      if (user) {
        const userId = user.uid;
        // Fetch images and videos
        const imagesRef = doc(db, "users", userId, "images", "list");
        const videosRef = doc(db, "users", userId, "videos", "list");
        try {
          const [imagesSnap, videosSnap] = await Promise.all([
            getDoc(imagesRef),
            getDoc(videosRef),
          ]);

          let prompts = [];

          // Combine images
          if (imagesSnap.exists()) {
            const imagesData = imagesSnap.data().list || [];
            prompts = [
              ...prompts,
              ...imagesData.map((item) => ({ ...item, type: "image" })),
            ];
          } else {
            await setDoc(imagesRef, { list: [] }, { merge: true });
          }

          // Combine videos
          if (videosSnap.exists()) {
            const videosData = videosSnap.data().list || [];
            prompts = [
              ...prompts,
              ...videosData.map((item) => ({ ...item, type: "video" })),
            ];
          } else {
            await setDoc(videosRef, { list: [] }, { merge: true });
          }

          // Sort by timestamp if available
          prompts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          setPreviousPrompts(prompts);
        } catch (err) {
          setError("Failed to fetch prompts: " + err.message);
        }
      } else {
        setError("Please sign in to access your prompts.");
      }
    };
    fetchPrompts();
  }, []);

  const deletePrompt = async (index) => {
    const user = auth.currentUser;
    if (user) {
      const userId = user.uid;
      const promptToDelete = previousPrompts[index];
      const updatedPrompts = previousPrompts.filter((_, i) => i !== index);
      setPreviousPrompts(updatedPrompts);

      try {
        if (promptToDelete.type === "image") {
          const imagesRef = doc(db, "users", userId, "images", "list");
          const imagesSnap = await getDoc(imagesRef);
          if (imagesSnap.exists()) {
            const imagesData = imagesSnap.data().list || [];
            const updatedImages = imagesData.filter(
              (item) => item.src !== promptToDelete.src
            );
            await updateDoc(imagesRef, { list: updatedImages });
          }
        } else if (promptToDelete.type === "video") {
          const videosRef = doc(db, "users", userId, "videos", "list");
          const videosSnap = await getDoc(videosRef);
          if (videosSnap.exists()) {
            const videosData = videosSnap.data().list || [];
            const updatedVideos = videosData.filter(
              (item) => item.src !== promptToDelete.src
            );
            await updateDoc(videosRef, { list: updatedVideos });
          }
        }
      } catch (err) {
        setError("Failed to delete prompt: " + err.message);
      }
    } else {
      setError("Please sign in to delete prompts.");
    }
  };

  const downloadPrompt = (prompt, alt) => {
    if (prompt && prompt.src) {
      const link = document.createElement("a");
      link.href = prompt.src;
      link.download = `${alt || "prompt"}-${Date.now()}.${
        prompt.type === "video" ? "mp4" : "png"
      }`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      setError("Prompt source is missing.");
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!currentPassword) {
      setError("Please enter your current password to proceed.");
      return;
    }
    try {
      const user = auth.currentUser;
      if (!user) {
        setError("No user is signed in.");
        return;
      }
      const userId = user.uid;

      // Reauthenticate the user
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);

      // Update the password
      await updatePassword(user, password);

      // Update Firestore document (if necessary)
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await updateDoc(userRef, { password });
      } else {
        await setDoc(userRef, { password }, { merge: true });
      }

      setSuccess("Password updated successfully!");
      setPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
    } catch (err) {
      setError("Failed to update password: " + err.message);
    }
  };

  return (
    <div className="my-account-wrapper">
      <div className="sidebar">
        <h1 className="my-account-title">My Account</h1>
        <nav className="nav flex-column">
          <button
            className={`nav-link ${
              activeSection === "changePassword" ? "active" : ""
            }`}
            onClick={() => setActiveSection("changePassword")}
          >
            Change Password
          </button>
          <button
            className={`nav-link ${
              activeSection === "previousPrompts" ? "active" : ""
            }`}
            onClick={() => setActiveSection("previousPrompts")}
          >
            Previous Prompts
          </button>
          <button
            className={`nav-link ${
              activeSection === "myPayments" ? "active" : ""
            }`}
            onClick={() => setActiveSection("myPayments")}
          >
            My Payments
          </button>
          <button
            className={`nav-link ${
              activeSection === "buyCredits" ? "active" : ""
            }`}
            onClick={() => setActiveSection("buyCredits")}
          >
            Buy Credits
          </button>
        </nav>
      </div>
      <div className="main-content">
        {activeSection === "changePassword" && (
          <div className="section-content">
            <h2>Change Password</h2>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            <form onSubmit={handleChangePassword}>
              <div className="input-group">
                <label htmlFor="currentPassword">Current Password</label>
                <input
                  type="password"
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <label htmlFor="password">New Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="submit-btn">
                Update Password
              </button>
            </form>
          </div>
        )}
        {activeSection === "previousPrompts" && (
          <div className="section-content">
            <h2>Previous Prompts</h2>
            {previousPrompts.length > 0 ? (
              <div className="media-grid">
                {previousPrompts.map((prompt, index) => (
                  <div key={index} className="media-item">
                    {prompt.type === "image" ? (
                      <img
                        src={prompt.src}
                        alt={prompt.alt || "Image"}
                        className="media-preview"
                      />
                    ) : (
                      <video controls className="media-preview">
                        <source src={prompt.src} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    )}
                    <div className="media-details">
                      <p>{prompt.alt || "No description"}</p>
                      <div className="media-actions">
                        <button
                          className="delete-btn"
                          onClick={() => deletePrompt(index)}
                        >
                          Delete
                        </button>
                        <button
                          className="download-btn"
                          onClick={() => downloadPrompt(prompt, prompt.alt)}
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-content">No previous prompts to display.</p>
            )}
          </div>
        )}
        {activeSection === "myPayments" && (
          <div className="section-content">
            <h2>My Payments</h2>
            <p className="no-content">Payment integration coming soon.</p>
          </div>
        )}
        {activeSection === "buyCredits" && (
          <div className="section-content">
            <h2>Buy Credits</h2>
            <p className="no-content">Credit purchase options coming soon.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
