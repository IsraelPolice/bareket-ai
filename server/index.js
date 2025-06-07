console.log("Loading index.js - Version 2025-06-07-v16");

const express = require("express");
const cors = require("cors");
const Replicate = require("replicate");
const paypal = require("paypal-rest-sdk");
require("dotenv").config({ path: __dirname + "/.env" });
const admin = require("firebase-admin");

// Log firebase-admin version
console.log("Firebase Admin SDK version:", admin.SDK_VERSION);

// Initialize Firebase Admin SDK
let serviceAccount;
try {
  serviceAccount = require("./serviceAccountKey.json");
  console.log("Service Account loaded successfully:", {
    project_id: serviceAccount.project_id,
    client_email: serviceAccount.client_email,
  });
} catch (error) {
  console.error(
    "Failed to load serviceAccountKey.json:",
    error.message,
    error.stack
  );
  process.exit(1);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: "bareket-ai",
    storageBucket: "bareket-ai.firebasestorage.app",
  });
  console.log("Firebase Admin SDK initialized successfully");
} catch (error) {
  console.error(
    "Failed to initialize Firebase Admin SDK:",
    error.message,
    error.stack
  );
  process.exit(1);
}

const db = admin.firestore();
const storage = admin.storage();

// PayPal Configuration
paypal.configure({
  mode: "sandbox", // Change to "live" in production
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET,
});

// Test Firestore connection
async function testFirestore() {
  try {
    const testRef = db.doc("test/connection");
    await testRef.set({ timestamp: new Date().toISOString() });
    console.log("Firestore connection test successful");
  } catch (error) {
    console.error("Firestore connection test failed:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
  }
}
testFirestore();

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

// Validate environment variables
const requiredEnvVars = [
  "REPLICATE_API_TOKEN",
  "PAYPAL_CLIENT_ID",
  "PAYPAL_CLIENT_SECRET",
];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
  console.error("Missing environment variables:", missingEnvVars.join(", "));
  process.exit(1);
}

async function uploadImageToFirebase(dataUrl, path, userId) {
  try {
    console.log(`Uploading image to (${path}) for user ${userId}`);
    const base64Data = dataUrl.split(",")[1];
    const bucket = storage.bucket();
    const file = bucket.file(path);
    await file.save(Buffer.from(base64Data, "base64"), {
      metadata: { contentType: "image/jpeg" },
    });
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: "03-09-2491",
    });
    console.log("Image uploaded successfully:", url);
    return url;
  } catch (error) {
    console.error("Error uploading image:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    throw error;
  }
}

// Create PayPal Payment
app.post("/create-paypal-payment", async (req, res) => {
  const { amount, credits } = req.body;
  const userId = req.headers["user-id"];

  if (!userId) {
    return res.status(401).json({ error: "User ID is required" });
  }

  const create_payment_json = {
    intent: "sale",
    payer: { payment_method: "paypal" },
    redirect_urls: {
      return_url: `http://localhost:3001/success?userId=${userId}&credits=${credits}`,
      cancel_url: "http://localhost:3000?payment=cancel",
    },
    transactions: [
      {
        amount: {
          total: amount.toFixed(2),
          currency: "USD",
        },
        description: `Purchase of ${credits} credits for video generation`,
      },
    ],
  };

  paypal.payment.create(create_payment_json, (error, payment) => {
    if (error) {
      console.error("Error creating PayPal payment:", error);
      return res.status(500).json({ error: "Failed to create payment" });
    }
    for (let link of payment.links) {
      if (link.rel === "approval_url") {
        console.log("Redirecting to PayPal approval URL:", link.href);
        return res.json({ paymentUrl: link.href });
      }
    }
    res.status(500).json({ error: "No approval URL found" });
  });
});

// Handle PayPal Payment Success
app.get("/success", async (req, res) => {
  console.log("Success route hit with params:", req.query);
  const { paymentId, PayerID, userId, credits } = req.query;

  if (!paymentId || !PayerID || !userId || !credits) {
    console.error("Missing required query parameters:", {
      paymentId,
      PayerID,
      userId,
      credits,
    });
    return res.status(400).send("Missing required query parameters");
  }

  const execute_payment_json = {
    payer_id: PayerID,
  };

  paypal.payment.execute(
    paymentId,
    execute_payment_json,
    async (error, payment) => {
      if (error) {
        console.error("Error executing PayPal payment:", {
          message: error.message,
          stack: error.stack,
        });
        return res.status(500).send("Payment execution failed");
      }
      try {
        console.log(`Attempting to update credits for user ${userId}...`);
        // Test Firestore connection again before updating credits
        const testRef = db.doc("test/connection");
        await testRef.set({ timestamp: new Date().toISOString() });
        console.log(
          "Firestore connection re-test successful before updating credits"
        );

        const creditsRef = db.doc(`users/${userId}/credits/current`);
        const creditsSnap = await creditsRef.get();
        // Compatibility check for exists (property vs function)
        const docExists =
          typeof creditsSnap.exists === "function"
            ? creditsSnap.exists()
            : creditsSnap.exists;
        console.log("Credits snapshot:", {
          exists: docExists,
          data: docExists ? creditsSnap.data() : null,
        });
        const currentCredits = docExists ? creditsSnap.data().value : 0;
        const newCredits = currentCredits + parseInt(credits);
        console.log(
          `Calculated new credits: current=${currentCredits}, adding=${credits}, newTotal=${newCredits}`
        );
        await creditsRef.set({ value: newCredits });
        console.log(
          `Added ${credits} credits to user ${userId}. New total: ${newCredits}`
        );
        res.redirect(
          `http://localhost:3000?payment=success&userId=${userId}&credits=${credits}`
        );
      } catch (error) {
        console.error("Error updating credits after payment:", {
          message: error.message,
          code: error.code,
          stack: error.stack,
        });
        res.status(500).send("Failed to update credits");
      }
    }
  );
});

// Handle PayPal Payment Cancel
app.get("/cancel", (req, res) => {
  res.redirect("http://localhost:3000?payment=cancel");
});

app.post("/generate-video", async (req, res) => {
  try {
    const { model, prompt, image, quality, duration } = req.body;
    const userId = req.headers["user-id"];
    console.log("Request received at /generate-video:", {
      model,
      prompt: prompt ? prompt.substring(0, 50) : "No prompt",
      image: image ? "Image provided" : "No image",
      quality,
      duration,
      userId,
    });

    if (!userId || !prompt || !duration) {
      console.log("Missing required fields:", { userId, prompt, duration });
      return res
        .status(400)
        .json({ error: "Missing user ID, prompt, or duration" });
    }

    const cleanedModel = model.trim();

    if (![5, 10].includes(parseInt(duration))) {
      console.log("Invalid duration:", duration);
      return res
        .status(400)
        .json({ error: "Duration must be 5 or 10 seconds" });
    }

    // Calculate credit cost
    let creditCost = 6; // Base cost for 5 seconds, lowest quality
    if (cleanedModel === "pixverse/pixverse-v4.5") {
      if (quality === "720p") creditCost = 9;
      else if (quality === "1080p") creditCost = 12;
    }
    if (parseInt(duration) === 10) {
      creditCost *= 2;
    }

    // Check and deduct credits
    let currentCredits = 0;
    try {
      console.log(`Checking credits for user ${userId} in Firestore...`);
      const creditsRef = db.doc(`users/${userId}/credits/current`);
      const creditsSnap = await creditsRef.get();
      const docExists =
        typeof creditsSnap.exists === "function"
          ? creditsSnap.exists()
          : creditsSnap.exists;
      if (!docExists) {
        console.log(
          "Credits document does not exist, creating with 10 credits..."
        );
        await creditsRef.set({ value: 10 }, { merge: true });
        currentCredits = 10;
      } else {
        currentCredits = creditsSnap.data().value || 0;
      }
      console.log("Credits found:", currentCredits);

      if (currentCredits < creditCost) {
        console.log("Insufficient credits:", { currentCredits, creditCost });
        return res.status(400).json({
          error: `Insufficient credits. Requires ${creditCost} credits.`,
        });
      }

      console.log(`Updating credits for user ${userId}...`);
      await creditsRef.update({ value: currentCredits - creditCost });
      console.log("Credits updated to:", currentCredits - creditCost);
      currentCredits -= creditCost;
    } catch (firestoreError) {
      console.error("Firestore error during credits check/update:", {
        message: firestoreError.message,
        code: firestoreError.code,
        stack: firestoreError.stack,
      });
      throw new Error(
        `Failed to update credits in Firestore: ${firestoreError.message}`
      );
    }

    let startImageURL;
    if (
      image &&
      cleanedModel === "wavespeedai/wan-2.1-i2v-480p" &&
      image.startsWith("data:image/")
    ) {
      startImageURL = await uploadImageToFirebase(
        image,
        `users/${userId}/images/video-${Date.now()}.jpg`,
        userId
      );
    }

    const input = {
      prompt,
      duration: parseInt(duration),
      ...(cleanedModel === "pixverse/pixverse-v4.5" && quality
        ? { quality }
        : {}),
      ...(cleanedModel === "wavespeedai/wan-2.1-i2v-480p" && startImageURL
        ? { image: startImageURL }
        : {}),
    };

    console.log("Sending to Replicate:", {
      version: cleanedModel,
      input,
      userId,
    });

    const prediction = await replicate.predictions.create({
      version: cleanedModel,
      input,
    });

    console.log("Replicate response:", {
      id: prediction?.id,
      status: prediction?.status,
      error: prediction?.error,
    });

    if (!prediction?.id) {
      console.error("No prediction ID in response:", prediction);
      throw new Error("No prediction ID returned from Replicate");
    }

    try {
      console.log(`Saving job to Firestore for user ${userId}...`);
      const jobRef = db.doc(`users/${userId}/videoJobs/${prediction.id}`);
      await jobRef.set({
        predictionId: prediction.id,
        status: prediction.status,
        prompt,
        model: cleanedModel,
        createdAt: new Date().toISOString(),
      });
      console.log("Job saved");

      console.log(`Updating active jobs for user ${userId}...`);
      const activeJobsRef = db.doc(`users/${userId}/activeJobs/list`);
      const activeSnap = await activeJobsRef.get();
      const docExists =
        typeof activeSnap.exists === "function"
          ? activeSnap.exists()
          : activeSnap.exists;
      const jobs = docExists ? activeSnap.data().jobs || [] : [];
      jobs.push({
        predictionId: prediction.id,
        prompt,
        createdAt: new Date().toISOString(),
      });
      await activeJobsRef.set({ jobs }, { merge: true });
      console.log("Active jobs updated");
    } catch (firestoreError) {
      console.error("Firestore error during job save:", {
        message: firestoreError.message,
        code: firestoreError.code,
        stack: firestoreError.stack,
      });
    }

    res.json({ predictionId: prediction.id, status: prediction.status });
  } catch (error) {
    console.error("Error generating video:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: error.message });
  }
});

app.get("/check-status/:predictionId", async (req, res) => {
  try {
    const { predictionId } = req.params;
    const userId = req.headers["user-id"];
    if (!userId) return res.status(400).json({ error: "Missing user ID" });

    console.log(
      `Checking status for prediction ${predictionId} for user ${userId}`
    );

    const prediction = await replicate.predictions.get(predictionId);

    console.log("Replicate status:", {
      predictionId,
      status: prediction.status,
      output: prediction.output,
      error: prediction.error,
    });

    const jobRef = db.doc(`users/${userId}/videoJobs/${predictionId}`);
    let jobData = {};
    try {
      const jobSnap = await jobRef.get();
      const docExists =
        typeof jobSnap.exists === "function"
          ? jobSnap.exists()
          : jobSnap.exists;
      if (docExists) {
        jobData = jobSnap.data();
        await jobRef.update({ status: prediction.status });
      } else {
        console.log("Job not found in Firestore, creating...");
        await jobRef.set({
          predictionId,
          status: prediction.status,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (firestoreError) {
      console.error("Firestore error during job check:", {
        message: firestoreError.message,
        code: firestoreError.code,
        stack: firestoreError.stack,
      });
    }

    let currentCredits = 0;
    try {
      console.log(`Checking credits for user ${userId} in Firestore...`);
      const creditsRef = db.doc(`users/${userId}/credits/current`);
      const creditsSnap = await creditsRef.get();
      const docExists =
        typeof creditsSnap.exists === "function"
          ? creditsSnap.exists()
          : creditsSnap.exists;
      currentCredits = docExists ? creditsSnap.data().value : 0;
      console.log("Credits found:", currentCredits);
    } catch (firestoreError) {
      console.error("Firestore error during credits check:", {
        message: firestoreError.message,
        code: firestoreError.code,
        stack: firestoreError.stack,
      });
    }

    if (prediction.status === "succeeded" && prediction.output) {
      const videoUrl = Array.isArray(prediction.output)
        ? prediction.output[0]
        : prediction.output;

      try {
        console.log(`Saving video to Firestore for user ${userId}...`);
        const videosRef = db.doc(`users/${userId}/videos/list`);
        const videosSnap = await videosRef.get();
        const docExists =
          typeof videosSnap.exists === "function"
            ? videosSnap.exists()
            : videosSnap.exists;
        const videos = docExists ? videosSnap.data().list || [] : [];
        videos.push({
          src: videoUrl,
          prompt: jobData.prompt || "Unknown prompt",
          createdAt: new Date().toISOString(),
        });
        await videosRef.set({ list: videos }, { merge: true });
        console.log("Video saved to Firestore:", videoUrl);

        console.log(`Removing from active jobs for user ${userId}...`);
        const activeJobsRef = db.doc(`users/${userId}/activeJobs/list`);
        const activeSnap = await activeJobsRef.get();
        const activeExists =
          typeof activeSnap.exists === "function"
            ? activeSnap.exists()
            : activeSnap.exists;
        const jobs = activeExists ? activeSnap.data().jobs || [] : [];
        const updatedJobs = jobs.filter(
          (job) => job.predictionId !== predictionId
        );
        await activeJobsRef.set({ jobs: updatedJobs }, { merge: true });
        console.log("Active jobs updated");
      } catch (firestoreError) {
        console.error("Firestore error during video save:", {
          message: firestoreError.message,
          code: firestoreError.code,
          stack: firestoreError.stack,
        });
        return res
          .status(500)
          .json({ error: "Failed to save video to Firestore" });
      }

      return res.json({
        status: prediction.status,
        videoUrl,
        value: currentCredits,
      });
    } else if (
      prediction.status === "failed" ||
      prediction.status === "canceled"
    ) {
      try {
        console.log(
          `Removing failed/canceled job from active jobs for user ${userId}...`
        );
        const activeJobsRef = db.doc(`users/${userId}/activeJobs/list`);
        const activeSnap = await activeJobsRef.get();
        const docExists =
          typeof activeSnap.exists === "function"
            ? activeSnap.exists()
            : activeSnap.exists;
        const jobs = docExists ? activeSnap.data().jobs || [] : [];
        const updatedJobs = jobs.filter(
          (job) => job.predictionId !== predictionId
        );
        await activeJobsRef.set({ jobs: updatedJobs }, { merge: true });
        console.log("Active jobs updated");
      } catch (firestoreError) {
        console.error("Firestore error during cleanup:", {
          message: firestoreError.message,
          code: firestoreError.code,
          stack: firestoreError.stack,
        });
      }

      return res.json({
        status: prediction.status,
        error: prediction.error || "Prediction failed",
      });
    }

    res.json({ status: prediction.status, value: currentCredits });
  } catch (error) {
    console.error("Error checking status:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
