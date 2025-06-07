import React from "react";
import { Link } from "react-router-dom";
import "../styles/GeneratorStyles.css";

const FAQ = () => {
  const faqData = [
    {
      section: "Getting Started",
      items: [
        {
          question: "What is Saturn AI and how does it work?",
          answer: (
            <>
              Saturn AI is an AI-powered tool that allows you to create content
              like images and videos using prompts. Simply{" "}
              <Link to="/signup">sign up</Link>, purchase credits, and start
              creating!
            </>
          ),
        },
        {
          question: "How do I sign up for the service?",
          answer: (
            <>
              Go to the <Link to="/signup">sign-up page</Link>, fill in your
              details, and verify your email. You’ll receive 10 free credits to
              start!
            </>
          ),
        },
        {
          question: "What is required to use Saturn AI?",
          answer: (
            <>
              All you need is a modern browser and an internet connection. No
              installation or complex technical knowledge is required.
            </>
          ),
        },
      ],
    },
    {
      section: "Usage & Features",
      items: [
        {
          question: "How do I create content with Saturn AI?",
          answer: (
            <>
              Enter a prompt in the form on the homepage, select an AI model,
              and submit. Your result will appear within seconds! Learn more
              about crafting effective prompts on our{" "}
              <Link to="/learn">Learn page</Link>.
            </>
          ),
        },
        {
          question: "What are the benefits of using different models?",
          answer: (
            <>
              Each model specializes in different styles (e.g., realism or art).
              Explore details about our models on the{" "}
              <Link to="/features">Features page</Link>. Try a few to find your
              favorite!
            </>
          ),
        },
        {
          question: "Does the generated content belong to me?",
          answer: (
            <>
              Yes, your content belongs to you, subject to the usage terms of
              the Replicate models.
            </>
          ),
        },
      ],
    },
    {
      section: "Billing & Credits",
      items: [
        {
          question: "How do I purchase credits?",
          answer: (
            <>
              Go to the payments page, choose a package, and use PayPal for a
              secure transaction. Credits are added instantly!{" "}
              <Link to="/login">Log in</Link> to get started.
            </>
          ),
        },
        {
          question: "What happens if my credits run out?",
          answer: (
            <>
              You can purchase a new package anytime. Activities will be paused
              until then. <Link to="/login">Log in</Link> to manage your
              account.
            </>
          ),
        },
        {
          question: "Are there refunds for credits?",
          answer: (
            <>
              Refunds are available only under specific conditions (see our
              Terms of Use).
            </>
          ),
        },
      ],
    },
    {
      section: "Technical Issues",
      items: [
        {
          question: "What should I do if content doesn’t generate?",
          answer: (
            <>
              Check your internet connection, ensure you have credits, or{" "}
              <Link to="/contact">contact support</Link>.
            </>
          ),
        },
        {
          question: "Why am I getting errors in my browser?",
          answer: (
            <>
              Your browser might be outdated. Use the latest version of Chrome
              or Firefox.
            </>
          ),
        },
        {
          question: "Are there specific system requirements?",
          answer: (
            <>
              No, it’s browser-based, but a device with at least 4GB RAM is
              recommended.
            </>
          ),
        },
      ],
    },
    {
      section: "Contact & Support",
      items: [
        {
          question: "How do I contact support?",
          answer: (
            <>
              Email us at{" "}
              <a href="mailto:Info@SaturnGenix.com">Info@SaturnGenix.com</a> or
              use our <Link to="/contact">contact form</Link>.
            </>
          ),
        },
        {
          question: "What is the expected response time?",
          answer: (
            <>
              We respond within 48 hours during business hours (Monday-Friday,
              9:00-17:00 UTC).
            </>
          ),
        },
        {
          question: "Is there a live chat?",
          answer: (
            <>
              Not yet, but we’re working on it. Use email or our{" "}
              <Link to="/contact">contact page</Link> for now.
            </>
          ),
        },
      ],
    },
  ];

  return (
    <div className="generator-wrapper">
      <div className="main-content">
        <h1 className="contact-title">
          Frequently Asked Questions - Saturn AI Support
        </h1>
        {faqData.map((section, index) => (
          <section className="faq-section" key={index}>
            <h2>{section.section}</h2>
            {section.items.map((item, itemIndex) => (
              <div className="faq-item" key={itemIndex}>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
};

export default FAQ;
