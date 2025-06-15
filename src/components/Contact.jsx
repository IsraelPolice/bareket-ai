import React, { useState } from "react";
import { Helmet } from "react-helmet";
import "../styles/GeneratorStyles.css";

const Contact = () => {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !subject.trim() || !description.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(
        "https://saturn-backend-sdht.onrender.com/send-contact",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, subject, description }),
        }
      );
      if (!response.ok) throw new Error("Failed to send message.");
      setSuccess("Message sent successfully! We'll reply within 48 hours.");
      setEmail("");
      setSubject("");
      setDescription("");
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="generator-wrapper">
      <Helmet>
        <title>Contact SaturnGenix - Get Support for AI Video Tools</title>
        <meta
          name="description"
          content="Contact SaturnGenix for support with our AI video generation tools. Reach out via email or our contact form for quick assistance."
        />
        <meta
          name="keywords"
          content="contact SaturnGenix, AI video support, SaturnGenix support"
        />
        <link rel="canonical" href="https://www.saturngenix.com/contact" />{" "}
        {/* Added */}
      </Helmet>
      <div className="main-content">
        <h1 className="contact-title">Contact Us</h1>
        <div className="contact-container">
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                disabled={loading}
                required
              />
            </div>
            <div className="input-group">
              <label>Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter subject"
                disabled={loading}
                required
              />
            </div>
            <div className="input-group">
              <label>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your issue or message"
                rows="5"
                disabled={loading}
                required
              />
            </div>
            {error && (
              <div className="error-message">
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="success-message">
                <span>{success}</span>
              </div>
            )}
            <button type="submit" className="generate-btn" disabled={loading}>
              {loading ? "Sending..." : "Send Message"}
            </button>
          </form>

          <div className="support-info">
            <h2>Technical Support</h2>
            <p>For assistance, reach out to us at:</p>
            <p>
              <strong>Email:</strong>{" "}
              <a href="mailto:info@saturngenix.com">info@saturngenix.com</a>
            </p>
            <p>
              <strong>Response Time:</strong> Within 48 hours (Mon–Fri)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
