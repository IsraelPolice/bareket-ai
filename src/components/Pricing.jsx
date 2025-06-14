import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import "../styles/PricingStyles.css";

const Pricing = () => {
  return (
    <div className="features-page">
      <Helmet>
        <title>Pricing Plans | SaturnGenix</title>
        <meta
          name="description"
          content="Explore SaturnGenix pricing plans during our beta phase. Purchase credits now or subscribe starting August 2025. Pay securely with PayPal!"
        />
        <meta
          name="keywords"
          content="SaturnGenix pricing, AI video credits, PayPal payment, SaturnGenix plans"
        />
        <meta property="og:title" content="Pricing Plans | SaturnGenix" />
        <meta
          property="og:description"
          content="Check out SaturnGenix's flexible pricing during the beta phase, with credit purchases and future subscription options."
        />
        <meta
          property="og:image"
          content="https://www.saturngenix.com/assets/pricing-preview.jpg"
        />
        <meta property="og:url" content="https://www.saturngenix.com/pricing" />
      </Helmet>

      <section className="hero-section">
        <h1>Pricing Plans for SaturnGenix</h1>
        <p className="hero-description">
          Discover how to unlock your creative potential with our flexible
          pricing options during the beta phase. Starting August 2025, enjoy
          subscription plans tailored to your needs!
        </p>
      </section>

      <section className="models-section">
        <h2>Current Beta Pricing (Until July 31, 2025)</h2>
        <div className="model-cards">
          <div className="model-card">
            <h3>72 Credits</h3>
            <p className="price">$6.99</p>
            <p>
              Perfect for trying out SaturnGenix! Includes 12 basic videos (5
              seconds each) with Wan 2.1 or 9 videos with Pixverse, plus 1 SDXL
              image per credit.
            </p>
            <p>
              <Link to="/generator" className="cta-link">
                Start Creating Now
              </Link>
            </p>
            <span className="model-icon">🎬</span>
          </div>
          <div className="model-card">
            <h3>150 Credits</h3>
            <p className="price">$13.99</p>
            <p>
              Ideal for regular creators! Get 25 basic videos (5 seconds each)
              with Wan 2.1 or 18 videos with Pixverse, plus 1 SDXL image per
              credit.
            </p>
            <p>
              <Link to="/generator" className="cta-link">
                Unlock More Creativity
              </Link>
            </p>
            <span className="model-icon">🌟</span>
          </div>
          <div className="model-card">
            <h3>300 Credits</h3>
            <p className="price">$25.99</p>
            <p>
              Best for power users! Enjoy 50 basic videos (5 seconds each) with
              Wan 2.1 or 36 videos with Pixverse, plus 1 SDXL image per credit.
            </p>
            <p>
              <Link to="/generator" className="cta-link">
                Maximize Your Output
              </Link>
            </p>
            <span className="model-icon">🚀</span>
          </div>
        </div>
        <p className="payment-note">
          Payments are processed securely via PayPal. No subscriptions required
          until August 2025. <Link to="/faq">Learn more about billing</Link>.
        </p>
      </section>

      <section className="why-choose-section">
        <h2>Why Choose Our Pricing?</h2>
        <ul className="benefits-list">
          <li>Flexible credit system during the beta phase.</li>
          <li>Transition to subscriptions in August 2025 for added value.</li>
          <li>Secure and easy payments with PayPal.</li>
          <li>Perfect for creators at any level – from hobbyists to pros.</li>
        </ul>
      </section>

      <section className="final-cta-section">
        <h2>Get Started with SaturnGenix</h2>
        <p>
          Purchase credits today and start creating! Need help? Visit our{" "}
          <Link to="/faq">FAQ page</Link> or{" "}
          <Link to="/contact">contact support</Link>.
        </p>
      </section>
    </div>
  );
};

export default Pricing;
