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
  const [previousPrompts, setPreviousPrompts] = useState([]);
  const [activeSection, setActiveSection] = useState("previousPrompts");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const fetchPrompts = async () => {
      const user = auth.currentUser;
      if (user) {
        const userId = user.uid;
        setUserEmail(user.email);
        const imagesRef = doc(db, "users", userId, "images", "list");
        const videosRef = doc(db, "users", userId, "videos", "list");
        try {
          const [imagesSnap, videosSnap] = await Promise.all([
            getDoc(imagesRef),
            getDoc(videosRef),
          ]);

          let prompts = [];

          if (imagesSnap.exists()) {
            const imagesData = imagesSnap.data().list || [];
            prompts = [
              ...prompts,
              ...imagesData.map((item) => ({ ...item, type: "image" })),
            ];
          } else await setDoc(imagesRef, { list: [] }, { merge: true });

          if (videosSnap.exists()) {
            const videosData = videosSnap.data().list || [];
            prompts = [
              ...prompts,
              ...videosData.map((item) => ({ ...item, type: "video" })),
            ];
          } else await setDoc(videosRef, { list: [] }, { merge: true });

          prompts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setPreviousPrompts(prompts);
        } catch (err) {
          setError("Failed to fetch prompts: " + err.message);
        }
      } else setError("Please sign in to access your prompts.");
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
            const updatedImages = imagesSnap
              .data()
              .list.filter((item) => item.src !== promptToDelete.src);
            await updateDoc(imagesRef, { list: updatedImages });
          }
        } else if (promptToDelete.type === "video") {
          const videosRef = doc(db, "users", userId, "videos", "list");
          const videosSnap = await getDoc(videosRef);
          if (videosSnap.exists()) {
            const updatedVideos = videosSnap
              .data()
              .list.filter((item) => item.src !== promptToDelete.src);
            await updateDoc(videosRef, { list: updatedVideos });
          }
        }
      } catch (err) {
        setError("Failed to delete prompt: " + err.message);
      }
    } else setError("Please sign in to delete prompts.");
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
    } else setError("Prompt source is missing.");
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

      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);

      await updatePassword(user, password);

      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) await updateDoc(userRef, { password });
      else await setDoc(userRef, { password }, { merge: true });

      setSuccess("Password updated successfully!");
      setPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
    } catch (err) {
      setError("Failed to update password: " + err.message);
    }
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
      if (!response.ok)
        throw new Error(
          (await response.json()).error || `HTTP error: ${response.status}`
        );
      const data = await response.json();
      if (data.paymentUrl) window.location.href = data.paymentUrl;
    } catch (error) {
      console.error("Error initiating PayPal payment:", error.message);
      setError(`Error initiating payment: ${error.message}`);
    }
  };

  const handleBuyCredits = () => {
    window.location.href = "/pricing";
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
          <button
            className={`nav-link ${
              activeSection === "contact" ? "active" : ""
            }`}
            onClick={() => setActiveSection("contact")}
          >
            Contact
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
                        alt={prompt.prompt || "Image"}
                        className="media-preview"
                        style={{ maxWidth: "300px", maxHeight: "200px" }}
                      />
                    ) : (
                      <video
                        controls
                        className="media-preview"
                        style={{ maxWidth: "300px", maxHeight: "200px" }}
                      >
                        <source src={prompt.src} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    )}
                    <div className="media-details">
                      <p>Prompt: {prompt.prompt || "No prompt"}</p>
                      <div className="media-actions">
                        <button
                          className="delete-btn"
                          onClick={() => deletePrompt(index)}
                        >
                          Delete
                        </button>
                        <button
                          className="download-btn"
                          onClick={() => downloadPrompt(prompt, prompt.prompt)}
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
          </div>
        )}
        {activeSection === "contact" && (
          <div className="section-content">
            <h2>Contact</h2>
            <p>
              Email:{" "}
              <a href="mailto:info@saturngenix.com">info@saturngenix.com</a>
            </p>
            <p>
              <a href="/faq">FAQ</a>
            </p>
          </div>
        )}
        {userEmail && <p className="user-email">Logged in as: {userEmail}</p>}
      </div>
    </div>
  );
};

export default AdminPanel;
