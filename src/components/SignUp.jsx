import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "./firebase";
import "../styles/Login.css";

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
  const navigate = useNavigate();
  const [showTerms, setShowTerms] = useState(false);

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

  const openTerms = (e) => {
    e.preventDefault();
    setShowTerms(true);
  };

  const closeTerms = () => {
    setShowTerms(false);
  };

  return (
    <div className="login-split-screen">
      {/* וידאו בצד שמאל */}
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

      {/* טופס בצד ימין */}
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
            <a href="#terms" onClick={openTerms}>
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

        {showTerms && (
          <div className="modal-overlay">
            <div className="modal-content">
              <button className="modal-close" onClick={closeTerms}>
                ×
              </button>
              <h3>Terms and Conditions</h3>
              <p>
                <strong>Saturn AI</strong>
                <em>Last Updated: June 07, 2025</em>
              </p>
              <p>
                <strong>Introduction</strong>
                Welcome to Saturn AI, operated by us ("we", "us", or "our").
                These Terms and Conditions ("Terms") govern your use of our
                AI-powered platform, including the generation of content using
                prompts (the "Service"). By accessing or using the Service, you
                agree to be bound by these Terms. If you do not agree, please
                refrain from using the Service.
              </p>
              <p>
                <strong>1. Acceptance of Terms</strong>
                By using Saturn AI, you confirm that you are at least 18 years
                old and capable of entering into a legally binding agreement. We
                reserve the right to modify these Terms at any time. Continued
                use of the Service after such changes constitutes your
                acceptance of the revised Terms.
              </p>
              <p>
                <strong>2. Description of Service</strong>
                Saturn AI provides an AI-driven platform that generates content
                (e.g., images or videos) based on user-provided prompts. We
                utilize third-party AI models licensed through Replicate, a
                service provider, and do not own or control the underlying
                technology or its outputs. Errors or inaccuracies may occur from
                time to time due to the nature of AI technology.
              </p>
              <p>
                <strong>3. User Responsibilities</strong>- You are responsible
                for the prompts you submit and the resulting content. - You
                agree not to use the Service for illegal, harmful, or infringing
                activities. - You must not attempt to reverse-engineer, modify,
                or exploit the Service beyond its intended use.
              </p>
              <p>
                <strong>4. Intellectual Property</strong>- All content generated
                by Saturn AI remains the intellectual property of the user,
                subject to the licensing terms of the Replicate AI models. -
                Saturn AI retains no ownership over generated content but may
                use anonymized data for improving the Service, in compliance
                with applicable data protection laws.
              </p>
              <p>
                <strong>5. Privacy Policy</strong>
                As part of the Service, we collect and process certain personal
                data, including email addresses and payment information. This
                data is stored securely in Google’s encrypted databases and
                transmitted via HTTPS on our Vercel-hosted website. Payments are
                processed securely through PayPal. We do not share your data
                with third parties except as necessary to provide the Service
                (e.g., Replicate for content generation). You may contact us to
                request access, correction, or deletion of your data, subject to
                legal requirements.
              </p>
              <p>
                <strong>6. Credits and Payments</strong>- The Service operates
                on a credit-based system. Credits are required to generate
                content. - Credits can be purchased via our secure PayPal
                payment system. Prices and credit packages are subject to
                change. - No refunds will be issued for purchased credits,
                except as outlined in the Indemnity section below or as required
                by applicable law. - We are not liable for any loss of credits
                due to technical issues or user error.
              </p>
              <p>
                <strong>7. Limitation of Liability</strong>- The Service is
                provided "as is" and "as available" without warranties of any
                kind, express or implied, including but not limited to accuracy,
                reliability, or fitness for a particular purpose. - Saturn AI,
                including its operator, shall not be liable for any direct,
                indirect, incidental, special, or consequential damages arising
                from your use of the Service, including errors in generated
                content. - We have no control over the Replicate AI models'
                outputs, and you assume all risks associated with their use.
              </p>
              <p>
                <strong>8. Disclaimer of Warranties</strong>- Saturn AI does not
                guarantee that the Service will be uninterrupted or error-free.
                - Generated content may contain inaccuracies, biases, or
                unintended results due to the nature of AI technology.
              </p>
              <p>
                <strong>9. Indemnity</strong>
                Compensation or refunds may be provided on a case-by-case basis,
                subject to the following conditions: - A credit refund may be
                requested if a purchase was made but credits were not added. - A
                credit refund may be requested if credits were deducted but no
                content was delivered by the Service. - A full refund may be
                requested if a purchase was made, no credits were used, and a
                request is submitted to Info@saturngenix.com within 24 hours of
                the purchase. If any credits were used, no refund will be
                issued. To request compensation or a refund, please email
                Info@saturngenix.com with the following: your email address, a
                detailed description of the issue, a PayPal receipt, and a
                screenshot (if applicable for technical issues). A response will
                be provided within 2 business days via email.
              </p>
              <p>
                <strong>10. Termination</strong>
                We may suspend or terminate your access to the Service at our
                discretion if you violate these Terms or engage in abusive
                behavior. Upon termination, any remaining credits will be
                forfeited.
              </p>
              <p>
                <strong>11. Governing Law</strong>
                These Terms are governed by the laws of Israel. Any disputes
                shall be resolved in the courts of Haifa, Israel, though we
                acknowledge our international user base and will consider
                reasonable efforts to address global legal concerns.
              </p>
              <p>
                <strong>12. Contact Us</strong>
                For questions, concerns, or to report issues, please contact us
                at Info@saturngenix.com. We aim to respond within a reasonable
                timeframe. - Legal Name: Dvir Bareket - Business Name: Saturn AI
                - Address: Ben Yehuda 9, Haifa, Israel
              </p>
              <p>
                <strong>13. Severability</strong>
                If any provision of these Terms is found to be unenforceable,
                the remaining provisions will remain in full effect.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignUp;
