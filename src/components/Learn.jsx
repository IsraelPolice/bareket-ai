import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import "../styles/LearnStyles.css";

const Learn = () => {
  return (
    <div className="learn-page">
      <Helmet>
        <title>Learn to Create AI Videos with Wan 2.1 | SaturnGenix</title>
        <meta
          name="description"
          content="Learn to create AI videos with SaturnGenix's Wan 2.1 Video Generator. Follow our step-by-step guide, discover top prompts, and start making stunning videos today!"
        />
        <meta
          name="keywords"
          content="AI video creation, Wan 2.1 video generator, text-to-video tool, SaturnGenix, best AI video prompts"
        />
        <meta
          property="og:title"
          content="Learn to Create AI Videos with Wan 2.1 | SaturnGenix"
        />
        <meta
          property="og:description"
          content="Master AI video creation with SaturnGenix's Wan 2.1 guide and prompts."
        />
        <meta
          property="og:image"
          content="https://www.saturngenix.com/assets/learn-video-preview.jpg"
        />
        <meta property="og:url" content="https://www.saturngenix.com/learn" />
        <link rel="canonical" href="https://www.saturngenix.com/learn" />{" "}
        {/* Added */}
      </Helmet>

      <section className="hero-section">
        <h1>Learn to Create AI Videos on Saturn</h1>
        <p className="hero-description">
          Welcome to <strong>Saturn's Video Generator</strong> – your go-to AI
          video generator for creating stunning videos effortlessly! Whether
          you're looking to create videos with AI using text prompts or
          transform images into dynamic clips, this text-to-video tool is
          perfect for creators, marketers, and hobbyists. Follow this guide to
          master AI video creation and unlock your creativity.
        </p>
      </section>

      <section className="guide-section">
        <h2>How to Create Videos with AI: A Step-by-Step Guide</h2>
        <p className="section-intro">
          Using an AI video generator like Wan 2.1 and Pixverse is simple and
          intuitive. Here’s how to get started:
        </p>
        <ol className="steps-list">
          <li>
            <strong>Sign Up & Verify Your Email:</strong> Create an account on
            SaturnGenix and verify your email to access the full features of our
            text-to-video tool.
          </li>
          <li>
            <strong>Write a Creative Prompt:</strong> Describe your vision in
            detail (e.g., "A futuristic city glowing at night with flying
            cars"). The better your prompt, the better your video!
          </li>
          <li>
            <strong>Select Video Duration:</strong> Choose between 5 or 10
            seconds for your AI-generated video.
          </li>
          <li>
            <strong>Add a Starting Image (Optional):</strong> Upload an image
            (under 5MB) to guide the video generation process, turning your
            image into a dynamic video.
          </li>
          <li>
            <strong>Generate Your Video:</strong> Click "Generate Video" to
            create your clip. Each video costs 1 credit – start with 10 free
            credits!
          </li>
        </ol>
      </section>

      <section className="prompts-section">
        <h2>Best Prompts for AI Video Generation</h2>
        <p className="section-intro">
          Crafting the best prompts for video generation is key to getting
          amazing results with an AI video generator. Be descriptive, use vivid
          adjectives, and specify the mood or style. Here are some examples to
          inspire you:
        </p>
        <div className="prompt-cards">
          <div className="prompt-card">
            <h3>Nature Scene</h3>
            <p>
              "A serene forest with a sparkling waterfall under a golden sunset,
              with soft wind blowing through the trees."
            </p>
          </div>
          <div className="prompt-card">
            <h3>Fantasy Theme</h3>
            <p>
              "A majestic dragon soaring over a medieval castle with glowing
              purple skies and fiery sparks."
            </p>
          </div>
          <div className="prompt-card">
            <h3>Abstract Art</h3>
            <p>
              "Swirling vibrant colors blending into a cosmic dance with glowing
              stars in the background."
            </p>
          </div>
          <div className="prompt-card">
            <h3>Image-to-Video</h3>
            <p>
              "Upload a photo of your pet and use a prompt like 'My dog running
              through a magical jungle filled with glowing plants.'"
            </p>
          </div>
        </div>
        <p className="section-tip">
          <strong>Pro Tip:</strong> Use specific adjectives like "vibrant,"
          "dark," or "peaceful," and avoid vague terms to get the best results
          from this text-to-video tool.
        </p>
      </section>

      <section className="credits-section">
        <h2>Understanding Credits & How to Use This AI Video Tool</h2>
        <p className="section-intro">
          Each video you create with Wan 2.1 and Pixverse cost about 6 credits
          for basic settings . New users start with 10 free credits, and you can
          but more credits anytime. Ready to create videos with AI?{" "}
          <Link to="/generator" className="cta-link">
            Try Wan 2.1/Pixverse Video Generator Now
          </Link>
        </p>
      </section>
    </div>
  );
};

export default Learn;
