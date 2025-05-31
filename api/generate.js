const express = require("express");
const router = express.Router();
const Replicate = require("replicate");
const axios = require("axios");

require("dotenv").config();

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

router.post("/", async (req, res) => {
  try {
    const {
      prompt,
      init_image,
      guidance_scale,
      num_inference_steps,
      strength,
    } = req.body;

    console.log("Received request with prompt:", prompt);
    console.log(
      "REPLICATE_API_TOKEN:",
      process.env.REPLICATE_API_TOKEN ? "Loaded" : "Missing"
    );

    if (!prompt && !init_image) {
      return res.status(400).json({ error: "Prompt or image required" });
    }

    const input = {
      prompt: prompt || "Default image",
      guidance_scale: guidance_scale || 7.5,
      num_inference_steps: num_inference_steps || 30,
      output_format: "jpg",
    };

    if (init_image) {
      input.init_image = init_image;
      input.strength = strength || 0.5;
    }

    console.log("Sending to Replicate:", input);

    const output = await replicate.run(
      "stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
      { input }
    );

    console.log("Replicate output:", output);

    if (!output || !output[0]) {
      return res
        .status(500)
        .json({ error: "No valid image output from Replicate" });
    }

    const imageUrl = output[0];
    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` },
    });
    const base64Image = Buffer.from(response.data, "binary").toString("base64");
    const dataUri = `data:image/jpeg;base64,${base64Image}`;

    res.status(200).json({ image: dataUri });
  } catch (error) {
    console.error("Error in /api/generate:", error);
    res
      .status(500)
      .json({ error: "Failed to generate image: " + error.message });
  }
});

module.exports = router;
