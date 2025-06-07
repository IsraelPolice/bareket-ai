import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "./firebase";
import "../styles/Login.css";
import {
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      if (!user.emailVerified) {
        setError(
          "Please verify your email before logging in. Check your inbox for a verification link."
        );
        await sendEmailVerification(user);
        return;
      }

      navigate("/");
    } catch (err) {
      setError("Login error: " + err.message);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setError("Password reset email sent. Please check your inbox.");
    } catch (err) {
      setError("Failed to send reset email: " + err.message);
    }
  };

  const goToRegister = () => {
    navigate("/signup");
  };

  return (
    <div className="login-split-screen">
      {/* Left side – video */}
      <div className="login-video-wrapper">
        <video
          className="login-video"
          src="\loginClip.mp4"
          autoPlay
          muted
          loop
        />
      </div>

      {/* Right side – form */}
      <div className="container">
        <h2 className="text-center mb-4">Login</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleLogin}>
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
          <button type="submit" className="btn btn-primary w-100 mb-2">
            Login
          </button>
          <button
            type="button"
            className="btn btn-link text-decoration-none text-end w-100"
            onClick={handleForgotPassword}
          >
            Forgot Password?
          </button>
        </form>
        <p className="text-center mt-3">
          Don’t have an account?{" "}
          <button className="btn btn-link p-0" onClick={goToRegister}>
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
