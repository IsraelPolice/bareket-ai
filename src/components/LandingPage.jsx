import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import "../styles/LandingPage.css";
import heroVideo from "../assets/hero-video.mp4"; // הווידאו שלך

function LandingPage() {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const buttonRef = useRef(null);
  const titleRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // אנימציית כניסה
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

    // תזוזה דינמית עם העכבר
    const videoElement = videoRef.current;
    const containerElement = containerRef.current;
    containerElement.addEventListener("mousemove", (e) => {
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
    });

    containerElement.addEventListener("mouseleave", () => {
      gsap.to(videoElement, { x: 0, y: 0, scale: 1, duration: 0.8 });
    });

    return () => {
      containerElement.removeEventListener("mousemove", () => {});
      containerElement.removeEventListener("mouseleave", () => {});
    };
  }, []);

  const handleGoToApp = () => {
    navigate("/generator");
  };

  return (
    <div className="landing-container" ref={containerRef}>
      <video
        ref={videoRef}
        src={heroVideo}
        autoPlay
        muted
        loop
        playsInline
        className="hero-video"
      />
      <div className="overlay"></div>
      <h1 ref={titleRef} className="landing-title">
        AI Masterpiece Generator
      </h1>
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
