import React from "react";
import "../styles/FeaturesStyles.css"; // קובץ ה-CSS המעודכן

const Features = () => {
  return (
    <div className="features-page">
      {/* Hero Section */}
      <section className="hero-section">
        <h1>AI Image And Video Generation With Saturn AI</h1>
        <p className="hero-description">
          Discover the power of cutting-edge AI models for stunning
          image-to-video transformations. Optimize your creativity with wan 2.1
          i2v, pixverse, and more!
        </p>
      </section>

      {/* Models Section */}
      <section className="models-section">
        <h2>Our Advanced AI Models and more</h2>
        <div className="model-cards">
          <div className="model-card">
            <h3>wan 2.1 i2v</h3>
            <p>
              Transform your images into dynamic videos with unmatched
              precision. Ideal for creative projects needing high-quality motion
              from static visuals.
            </p>
            <video autoPlay loop muted className="model-art">
              <source
                src="https://replicate.delivery/yhqm/2eeOEKeH0XGXdph2HTtPNWRMoD0wxvjeD4TO1ydUDQuzfDLjC/output_video.mp4"
                type="video/mp4"
              />
              Your browser does not support the video tag.
            </video>
            <span className="model-icon">🎨</span>
          </div>
          <div className="model-card">
            <h3>pixverse</h3>
            <p>
              Create vibrant, pixel-perfect videos with ease. Perfect for
              artists and designers seeking unique visual styles.
            </p>
            <video autoPlay loop muted className="model-art">
              <source
                src="https://replicate.delivery/xezq/nCLgz2veEJzhJqhMOQuIM6K2Of5Ryy1NPBB0kmp03R1uLMtUA/tmpcxcacfc2.mp4"
                type="video/mp4"
              />
              Your browser does not support the video tag.
            </video>
            <span className="model-icon">🌟</span>
          </div>
          <div className="model-card">
            <h3>Kling 1.6</h3>
            <p>
              Get ready for the next generation of video AI. Kling 1.6 promises
              enhanced features and superior output.
            </p>
            <video autoPlay loop muted className="model-art">
              <source
                src="https://replicate.delivery/czjl/xFIwsxPXTtpCHJw2WqLH3gqACg3csLVVdKtbLf1heBzXiUJUA/tmp35xuh600.mp4"
                type="video/mp4"
              />
              Your browser does not support the video tag.
            </video>
            <span className="model-icon">⏳</span>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="why-choose-section">
        <h2>Why Choose Saturn AI Models?</h2>
        <ul className="benefits-list">
          <li>High-quality video output with minimal effort.</li>
          <li>Fast processing powered by advanced AI technology.</li>
          <li>Versatile tools for creators, marketers, and hobbyists.</li>
          <li>Seamless integration with our web platform.</li>
        </ul>
      </section>

      {/* Final CTA */}
      <section className="final-cta-section">
        <h2>Start Creating Today</h2>
        <p>Unlock your creative potential with Saturn AI.</p>
      </section>
    </div>
  );
};

export default Features;
