// SignUp.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "./firebase";
import "../styles/Login.css";
import TermsModal from "./TermsModal";

import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

const SignUp = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showTerms, setShowTerms] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      await sendEmailVerification(user);
      setSuccess(
        "Verification email sent! Please check your inbox and verify your email before logging in."
      );

      await setDoc(doc(db, "users", user.uid), {
        firstName,
        lastName,
        email,
        createdAt: new Date().toISOString(),
        emailVerified: false,
      });

      await setDoc(doc(db, "users", user.uid, "credits", "current"), {
        value: 10,
      });
    } catch (err) {
      setError("Signup error: " + err.message);
    }
  };

  const goToLogin = () => {
    navigate("/login");
  };

  return (
    <div className="login-split-screen">
      <div className="login-video-wrapper">
        <video
          className="login-video"
          src="/loginClip.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
      </div>

      <div className="container">
        <h2 className="text-center mb-4">Sign Up</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        <form onSubmit={handleSignUp}>
          <div className="mb-3">
            <label htmlFor="firstName" className="form-label">
              First Name
            </label>
            <input
              type="text"
              className="form-control"
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="lastName" className="form-label">
              Last Name
            </label>
            <input
              type="text"
              className="form-control"
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              type="email"
              className="form-control"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="password" className="form-label">
              Password
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
              Confirm Password
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
          <p className="text-center mb-3">
            By clicking "Agree & Sign Up", I agree to the{" "}
            <a
              href="#terms"
              onClick={(e) => {
                e.preventDefault();
                setShowTerms(true);
              }}
            >
              Terms and Conditions
            </a>
          </p>
          <button type="submit" className="btn btn-primary w-100">
            Agree & Sign Up
          </button>
        </form>

        <p className="text-center mt-3">
          Already have an account?{" "}
          <button className="btn btn-link p-0" onClick={goToLogin}>
            Sign In
          </button>
        </p>

        {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
      </div>
    </div>
  );
};

export default SignUp;
