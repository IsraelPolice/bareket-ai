import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import "../styles/FeaturesStyles.css";

const Features = () => {
  return (
    <div className="features-page">
      <Helmet>
        <title>Features of AI Video Generation | SaturnGenix</title>
        <meta
          name="description"
          content="Explore SaturnGenix's features for AI video generation. Use Wan 2.1, Pixverse, and Kling 1.6 for stunning image-to-video transformations. Start creating today!"
        />
        <meta
          name="keywords"
          content="AI video generation features, Wan 2.1 i2v, Pixverse video AI, Kling 1.6, SaturnGenix"
        />
        <meta
          property="og:title"
          content="Features of AI Video Generation | SaturnGenix"
        />
        <meta
          property="og:description"
          content="Discover SaturnGenix's AI video generation features with Wan 2.1, Pixverse, and Kling 1.6."
        />
        <meta
          property="og:image"
          content="https://www.saturngenix.com/assets/feature-video-preview.jpg"
        />
        <meta
          property="og:url"
          content="https://www.saturngenix.com/features"
        />
      </Helmet>

      <section className="hero-section">
        <h1>Explore AI Video Generation Features with SaturnGenix</h1>
        <p className="hero-description">
          Discover the power of cutting-edge AI models for stunning
          image-to-video transformations. Optimize your creativity with Wan 2.1
          i2v, Pixverse, and more!
        </p>
      </section>

      <section className="models-section">
        <h2>Our Advanced AI Models and More</h2>
        <div className="model-cards">
          <div className="model-card">
            <h3>Wan 2.1 i2v</h3>
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
            <p className="video-description">
              A white cat wearing sunglasses on a surfboard, set against a
              blurred beach scene with crystal-clear waters.
            </p>
            <span className="model-icon">🎨</span>
          </div>
          <div className="model-card">
            <h3>Pixverse</h3>
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
            <p className="video-description">
              A snow leopard walking carefully in a snowy landscape at twilight.
            </p>
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
            <p className="video-description">
              A preview of Kling 1.6's advanced video generation capabilities.
            </p>
            <span className="model-icon">⏳</span>
          </div>
        </div>
      </section>

      <section className="why-choose-section">
        <h2>Why Choose SaturnGenix Models?</h2>
        <ul className="benefits-list">
          <li>High-quality video output with minimal effort.</li>
          <li>Fast processing powered by advanced AI technology.</li>
          <li>Versatile tools for creators, marketers, and hobbyists.</li>
          <li>Seamless integration with our web platform.</li>
        </ul>
      </section>

      <section className="final-cta-section">
        <h2>Start Creating Today</h2>
        <p>
          Unlock your creative potential with SaturnGenix.{" "}
          <Link to="/generator" className="cta-link">
            Try Our AI Video Generator Now
          </Link>
        </p>
      </section>
    </div>
  );
};

export default Features;
