import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import "../styles/ExamplesStyles.css";

const Examples = () => {
  return (
    <div className="examples-page">
      <Helmet>
        <title>AI Video Generation Examples | SaturnGenix</title>
        <meta
          name="description"
          content="See AI video generation examples with Wan 2.1 and Pixverse 4.5 on SaturnGenix. Discover prompts, settings, and results to inspire your video creations!"
        />
        <meta
          name="keywords"
          content="video generation examples, AI video prompts, Wan 2.1 video generation, Pixverse 4.5 video examples, SaturnGenix"
        />
        <meta
          property="og:title"
          content="AI Video Generation Examples | SaturnGenix"
        />
        <meta
          property="og:description"
          content="Explore examples of AI video generation with Wan 2.1 and Pixverse 4.5 on SaturnGenix."
        />
        <meta
          property="og:image"
          content="https://www.saturngenix.com/assets/example-video-preview.jpg"
        />
        <meta property="og:url" content="https://www.saturngenix.com/example" />
        <link rel="canonical" href="https://www.saturngenix.com/example" />{" "}
        {/* Added */}
      </Helmet>

      <section className="hero-section">
        <h1>AI Video Generation Examples on SaturnGenix</h1>
        <p className="hero-description">
          Discover how to create stunning AI-generated videos using Wan 2.1 and
          Pixverse 4.5. Explore sample prompts, settings, and outputs to inspire
          your own video projects with <strong>SaturnGenix</strong>.
        </p>
      </section>

      <section className="examples-section">
        <h2>Explore Our Video Generation Examples</h2>
        <div className="example-cards">
          <div className="example-card">
            <video className="model-art" loop muted autoPlay playsInline>
              <source
                src="https://replicate.delivery/yhqm/2eeOEKeH0XGXdph2HTtPNWRMoD0wxvjeD4TO1ydUDQuzfDLjC/output_video.mp4"
                type="video/mp4"
              />
              Your browser does not support the video tag.
            </video>
            <h3>Wan 2.1 Example: Image-to-Video Generation</h3>
            <p>
              Transform your images into dynamic videos with Wan 2.1. This
              example shows how a single image and a detailed prompt can create
              a captivating animation.
            </p>
            <h4>Input Image</h4>
            <img
              src="https://replicate.delivery/pbxt/MfpzR98ZJmwZM7oUcVqeFNW5DUvtTGFDTopDvFC40JdGhZKB/i2v_input.JPG"
              alt="Input image for Wan 2.1 video generation example: a starting point for the AI animation"
              className="model-art"
            />
            <h4>Prompt Used</h4>
            <p>
              "Summer beach vacation style, a white cat wearing sunglasses sits
              on a surfboard. The fluffy-furred feline gazes directly at the
              camera with a relaxed expression. Blurred beach scenery forms the
              background featuring a vibrant ocean, distant green hills, and a
              blue sky with white clouds. The cat assumes a natural pose,
              enjoying the sea breeze and warm sunlight. A close-up shot
              highlights the feline's intricate fur details and the refreshing
              beach atmosphere."
            </p>
            <h4>Settings</h4>
            <ol className="steps-list">
              <li>
                <strong>Number of Frames:</strong> 192
              </li>
              <li>
                <strong>Maximum Area:</strong> 1280x720
              </li>
              <li>
                <strong>Frames Per Second:</strong> 16
              </li>
              <li>
                <strong>Sample Steps:</strong> 30
              </li>
              <li>
                <strong>Sample Guide Scale:</strong> 5
              </li>
              <li>
                <strong>Sample Shift:</strong> 5
              </li>
              <li>
                <strong>Seed:</strong> Random
              </li>
            </ol>
          </div>

          <div className="example-card">
            <video className="model-art" loop muted autoPlay playsInline>
              <source
                src="https://replicate.delivery/xezq/nCLgz2veEJzhJqhMOQuIM6K2Of5Ryy1NPBB0kmp03R1uLMtUA/tmpcxcacfc2.mp4"
                type="video/mp4"
              />
              Your browser does not support the video tag.
            </video>
            <h3>Pixverse 4.5 Example: Text-to-Video Generation</h3>
            <p>
              Create high-quality videos from text prompts with Pixverse 4.5.
              This example brings a snowy landscape scene to life using a simple
              prompt.
            </p>
            <h4>Prompt Used</h4>
            <p>
              "A snow leopard is walking carefully, snowy landscape scene at
              twilight."
            </p>
            <h4>Settings</h4>
            <ol className="steps-list">
              <li>
                <strong>Quality:</strong> 1080p
              </li>
              <li>
                <strong>Aspect Ratio:</strong> 16:9
              </li>
              <li>
                <strong>Duration:</strong> 5 seconds
              </li>
              <li>
                <strong>Motion Mode:</strong> Normal
              </li>
              <li>
                <strong>Negative Prompt:</strong> None
              </li>
              <li>
                <strong>Seed:</strong> Random
              </li>
              <li>
                <strong>Style:</strong> None
              </li>
              <li>
                <strong>Effect:</strong> None
              </li>
            </ol>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <h2>Ready to Create Your Own AI Videos?</h2>
        <p className="section-intro">
          Use these examples as inspiration and start generating your own videos
          with SaturnGenix. Experiment with prompts and settings to bring your
          ideas to life!{" "}
          <Link to="/generator" className="cta-link">
            Start Generating Now
          </Link>
        </p>
      </section>
    </div>
  );
};

export default Examples;
