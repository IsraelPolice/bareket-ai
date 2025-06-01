import React, { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const AdminPanel = () => {
  const [previousImages, setPreviousImages] = useState([]);
  const [activeSection, setActiveSection] = useState("previousImages");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchImages = async () => {
      const user = auth.currentUser;
      if (user) {
        const userId = user.uid;
        const imagesRef = doc(db, "users", userId, "images", "list");
        const imagesSnap = await getDoc(imagesRef);
        if (imagesSnap.exists()) {
          setPreviousImages(imagesSnap.data().list || []);
        }
      }
    };

    fetchImages();
  }, []);

  const deleteImage = async (index) => {
    const user = auth.currentUser;
    const userId = user.uid;
    const updatedImages = previousImages.filter((_, i) => i !== index);
    setPreviousImages(updatedImages);
    const imagesRef = doc(db, "users", userId, "images", "list");
    await updateDoc(imagesRef, { list: updatedImages });
  };

  const downloadImage = (img, alt) => {
    const link = document.createElement("a");
    link.href = img.src;
    link.download = `${alt || "image"}-${Date.now()}.jpg`; // Default to .jpg, adjust if needed
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    try {
      const user = auth.currentUser;
      await updateDoc(doc(db, "users", user.uid), { password });
      await user.updatePassword(password); // Update password in Firebase Auth
      setSuccess("Password updated successfully!");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError("Failed to update password: " + err.message);
    }
  };

  return (
    <div className="container mt-5">
      <h1 className="text-center mb-4">Admin Panel</h1>
      <div className="row">
        <div className="col-md-3">
          <nav className="nav flex-column">
            <button
              className={`nav-link btn ${
                activeSection === "changePassword"
                  ? "btn-primary"
                  : "btn-outline-primary"
              } mb-2`}
              onClick={() => setActiveSection("changePassword")}
            >
              Change Password
            </button>
            <button
              className={`nav-link btn ${
                activeSection === "previousImages"
                  ? "btn-primary"
                  : "btn-outline-primary"
              } mb-2`}
              onClick={() => setActiveSection("previousImages")}
            >
              Previous Images
            </button>
            <button
              className={`nav-link btn ${
                activeSection === "paymentDetails"
                  ? "btn-primary"
                  : "btn-outline-primary"
              } mb-2`}
              onClick={() => setActiveSection("paymentDetails")}
            >
              Payment Details
            </button>
          </nav>
        </div>
        <div className="col-md-9">
          {activeSection === "changePassword" && (
            <div>
              <h2 className="mb-4">Change Password</h2>
              {error && <div className="alert alert-danger">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}
              <form onSubmit={handleChangePassword}>
                <div className="mb-3">
                  <label htmlFor="password" className="form-label">
                    New Password
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="confirmPassword" className="form-label">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary w-100">
                  Update Password
                </button>
              </form>
            </div>
          )}
          {activeSection === "previousImages" && (
            <div>
              <h2 className="mb-4">Previous Images</h2>
              {previousImages.length > 0 ? (
                <div className="row">
                  {previousImages.map((img, index) => (
                    <div key={index} className="col-md-4 mb-3">
                      <div className="card">
                        <img
                          src={img.src}
                          alt={img.alt}
                          className="card-img-top"
                        />
                        <div className="card-body">
                          <p className="card-text">{img.alt}</p>
                          <button
                            className="btn btn-danger me-2"
                            onClick={() => deleteImage(index)}
                          >
                            Delete
                          </button>
                          <button
                            className="btn btn-secondary"
                            onClick={() => downloadImage(img, img.alt)}
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center">No previous images to display.</p>
              )}
            </div>
          )}
          {activeSection === "paymentDetails" && (
            <div>
              <h2 className="mb-4">Payment Details</h2>
              <p className="text-center">Payment integration coming soon.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
