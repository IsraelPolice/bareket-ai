import React, { useEffect, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet";
import { gsap } from "gsap";
import "../styles/LandingPage.css";
import heroVideo from "../assets/hero-video.mp4";

function LandingPage() {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const buttonRef = useRef(null);
  const titleRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Show messages from payment result
    const params = new URLSearchParams(location.search);
    const payment = params.get("payment");
    const userId = params.get("userId");
    const credits = params.get("credits");

    if (payment === "success") {
      console.log("✅ Payment succeeded");
      alert(`Payment successful! ${credits} credits added to user ${userId}.`);
    } else if (payment === "cancel") {
      console.log("❌ Payment canceled");
      alert("Payment was canceled.");
    }
  }, [location]);

  useEffect(() => {
    // Animations
    gsap.fromTo(
      titleRef.current,
      { opacity: 0, y: -50 },
      { opacity: 1, y: 0, duration: 1.2, ease: "power3.out" }
    );
    gsap.fromTo(
      videoRef.current,
      { opacity: 0, scale: 1.1 },
      { opacity: 0.9, scale: 1, duration: 1.5, ease: "power3.out" }
    );
    gsap.fromTo(
      buttonRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 1, delay: 0.7, ease: "back.out(1.7)" }
    );

    // Mouse parallax
    const videoElement = videoRef.current;
    const containerElement = containerRef.current;

    const handleMouseMove = (e) => {
      const rect = containerElement.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - rect.width / 2;
      const mouseY = e.clientY - rect.top - rect.height / 2;
      const maxOffset = 20;

      gsap.to(videoElement, {
        x: gsap.utils.clamp(-maxOffset, maxOffset, mouseX * 0.02),
        y: gsap.utils.clamp(-maxOffset, maxOffset, mouseY * 0.02),
        scale: 1.02,
        duration: 0.8,
        ease: "power2.out",
      });
    };

    const handleMouseLeave = () => {
      gsap.to(videoElement, { x: 0, y: 0, scale: 1, duration: 0.8 });
    };

    containerElement.addEventListener("mousemove", handleMouseMove);
    containerElement.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      containerElement.removeEventListener("mousemove", handleMouseMove);
      containerElement.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const handleGoToApp = () => {
    navigate("/generator");
  };

  return (
    <div className="landing-container" ref={containerRef}>
      <Helmet>
        <title>
          Create AI Videos with Saturn AI | AI Masterpiece Generator
        </title>
        <meta
          name="description"
          content="Generate stunning AI videos with Saturn AI's Masterpiece Generator. Transform your ideas into dynamic clips effortlessly. Start creating now!"
        />
        <meta
          name="keywords"
          content="AI video generator, Saturn AI, AI masterpiece generator, create AI videos"
        />
      </Helmet>

      <video
        ref={videoRef}
        src={heroVideo}
        autoPlay
        muted
        loop
        playsInline
        className="hero-video"
      />

      <p className="video-description">
        A captivating AI-generated video showcasing the power of Saturn AI's
        Masterpiece Generator.
      </p>

      <div className="overlay"></div>

      <h1 ref={titleRef} className="landing-title">
        Create Stunning AI Videos
        <br />
        with Saturn AI
      </h1>

      <p className="landing-description">
        Unleash your creativity with Saturn AI's Masterpiece Generator.
        Transform your ideas into breathtaking videos using advanced AI
        technology.
      </p>

      <button
        ref={buttonRef}
        onClick={handleGoToApp}
        className="go-to-app-button"
      >
        Start Creating
      </button>
    </div>
  );
}

export default LandingPage;
