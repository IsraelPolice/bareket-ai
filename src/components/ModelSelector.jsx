import React from "react";
import { Link } from "react-router-dom";
import "../styles/GeneratorStyles.css";

const models = [
  {
    id: "wan",
    name: "Wan 2.1 Image-to-Video",
    description:
      "High-quality image-to-video generation with optimized inference. Ideal for dynamic scenes and text-driven animations.",
    videoUrl:
      "https://replicate.delivery/xezq/B08EdKGBIAK8E9rbNTX9jWO9ScVNbFivMaeXZM9ZUb5HAaKKA/output.mp4",
  },
  {
    id: "pixverse",
    name: "Pixverse 4.5",
    description:
      "Fast video generation at 540p, 720p, or 1080p. Excels in complex actions and prompt coherence.",
    videoUrl:
      "https://replicate.delivery/xezq/nCLgz2veEJzhJqhMOQuIM6K2Of5Ryy1NPBB0kmp03R1uLMtUA/tmpcxcacfc2.mp4",
  },
];

const ModelSelector = () => {
  return (
    <div className="generator-wrapper">
      <div className="main-content">
        <h1 className="model-selector-title">
          Choose Your Video Generation Model
        </h1>
        <div className="model-grid">
          {models.map((model) => (
            <Link
              to={`/video-generator/${model.id}`}
              key={model.id}
              className="model-card"
            >
              <video autoPlay loop muted className="model-preview">
                <source src={model.videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              <h2>{model.name}</h2>
              <p>{model.description}</p>
              <button className="select-model-btn">Select Model</button>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ModelSelector;
