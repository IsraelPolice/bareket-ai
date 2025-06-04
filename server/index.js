const express = require("express");
const cors = require("cors");
const Replicate = require("replicate");
require("dotenv").config({ path: __dirname + "/.env" });
const { initializeApp } = require("firebase/app");
const {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
  uploadBytes,
} = require("firebase/storage");
const {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
} = require("firebase/firestore");

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};
const firebaseApp = initializeApp(firebaseConfig);
const storage = getStorage(firebaseApp);
const db = getFirestore(firebaseApp);

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

console.log("Loading environment variables...");
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
if (!REPLICATE_API_TOKEN) {
  console.error("ERROR: REPLICATE_API_TOKEN is not set in .env");
  process.exit(1);
} else {
  console.log("Full REPLICATE_API_TOKEN is loaded successfully.");
}

const replicate = new Replicate({
  auth: REPLICATE_API_TOKEN,
});

async function uploadImageToFirebase(dataUrl, path) {
  try {
    const base64Data = dataUrl.split(",")[1];
    const storageRef = ref(storage, path);
    await uploadString(storageRef, base64Data, "base64");
    const downloadUrl = await getDownloadURL(storageRef);
    console.log(`Image uploaded to Firebase: ${downloadUrl}`);
    return downloadUrl;
  } catch (error) {
    console.error("Error uploading image to Firebase:", error.message);
    throw error;
  }
}

async function testReplicateAuth() {
  try {
    const models = await replicate.models.list();
    console.log(
      "Replicate authentication successful! Models found:",
      models.length
    );
    return true;
  } catch (error) {
    console.error(
      "Replicate authentication failed:",
      error.message,
      error.stack
    );
    return false;
  }
}

async function startServer() {
  const isAuthenticated = await testReplicateAuth();
  if (!isAuthenticated) {
    console.error("Server cannot start due to authentication failure.");
    process.exit(1);
  }

  app.post("/generate-video", async (req, res) => {
    try {
      const requestSize = Buffer.byteLength(JSON.stringify(req.body), "utf8");
      console.log(`Request size: ${requestSize} bytes`);

      const {
        model,
        prompt,
        negative_prompt,
        aspect_ratio,
        start_image,
        end_image,
        reference_images,
        cfg_scale,
        duration,
      } = req.body;
      const user = req.headers["user-id"];
      if (!user) {
        console.error("User ID missing in request headers");
        return res.status(400).json({ error: "User ID is required" });
      }
      console.log("Received video params:", {
        model,
        prompt,
        negative_prompt,
        aspect_ratio,
        start_image: start_image ? `${start_image.slice(0, 50)}...` : undefined,
        end_image: end_image ? `${end_image.slice(0, 50)}...` : undefined,
        reference_images: reference_images
          ? Array.isArray(reference_images)
            ? reference_images.map((img) => `${img.slice(0, 50)}...`)
            : undefined
          : undefined,
        cfg_scale,
        duration,
      });
      if (!prompt) {
        console.error("Prompt is missing in request body");
        return res.status(400).json({ error: "Prompt is required" });
      }
      if (!duration || ![5, 10].includes(parseInt(duration))) {
        console.error("Invalid duration:", duration);
        return res
          .status(400)
          .json({ error: "Duration must be 5 or 10 seconds" });
      }

      let processedStartImage = undefined;
      let processedEndImage = undefined;
      let processedReferenceImages = undefined;

      if (
        start_image &&
        typeof start_image === "string" &&
        start_image.startsWith("data:image")
      ) {
        processedStartImage = await uploadImageToFirebase(
          start_image,
          `temp/start_${Date.now()}_${user}.jpg`
        );
      }
      if (
        end_image &&
        typeof end_image === "string" &&
        end_image.startsWith("data:image")
      ) {
        processedEndImage = await uploadImageToFirebase(
          end_image,
          `temp/end_${Date.now()}_${user}.jpg`
        );
      }
      if (
        reference_images &&
        Array.isArray(reference_images) &&
        reference_images.length > 0
      ) {
        processedReferenceImages = await Promise.all(
          reference_images.map(async (img, index) => {
            if (
              img &&
              typeof img === "string" &&
              img.startsWith("data:image")
            ) {
              return await uploadImageToFirebase(
                img,
                `temp/ref_${Date.now()}_${user}_${index}.jpg`
              );
            }
            return undefined;
          })
        );
        processedReferenceImages = processedReferenceImages.filter(
          (img) => img !== undefined
        );
        if (processedReferenceImages.length === 0) {
          processedReferenceImages = undefined;
        }
      }

      const modelId =
        model === "kwaivgi/kling-v1.6-pro"
          ? "kwaivgi/kling-v1.6-pro"
          : "kwaivgi/kling-v1-6-standard";
      console.log("Running Replicate with video model:", modelId);

      const input = {
        prompt,
        negative_prompt: negative_prompt || "",
        aspect_ratio: aspect_ratio || "16:9",
      };
      if (processedStartImage) input.start_image = processedStartImage;
      if (processedEndImage) input.end_image = processedEndImage;
      if (processedReferenceImages)
        input.reference_images = processedReferenceImages;
      if (cfg_scale) input.cfg_scale = parseFloat(cfg_scale);
      if (duration) input.duration = parseInt(duration);

      console.log("Replicate input (final):", input);

      const prediction = await replicate.predictions.create({
        model: modelId,
        input,
      });

      console.log("Prediction response from Replicate:", prediction);

      if (!prediction.id) {
        console.error("No prediction ID received from Replicate:", prediction);
        return res
          .status(500)
          .json({ error: "Failed to create prediction in Replicate" });
      }

      const jobRef = doc(db, "users", user, "videoJobs", prediction.id);
      await setDoc(jobRef, {
        predictionId: prediction.id,
        status: prediction.status,
        prompt,
        createdAt: new Date().toISOString(),
        userId: user,
        model,
        duration,
      });

      const activeJobsRef = doc(db, "users", user, "activeJobs", "list");
      const activeJobsSnap = await getDoc(activeJobsRef);
      let activeJobs = [];
      if (activeJobsSnap.exists()) {
        activeJobs = activeJobsSnap.data().jobs || [];
      }
      activeJobs.push({
        predictionId: prediction.id,
        prompt,
        createdAt: new Date().toISOString(),
      });
      await setDoc(activeJobsRef, { jobs: activeJobs }, { merge: true });
      console.log("Added to activeJobs:", activeJobs);

      console.log("Returning predictionId to client:", prediction.id);
      res.json({ predictionId: prediction.id, status: prediction.status });

      const checkStatus = async () => {
        let status = prediction.status;
        while (
          status !== "succeeded" &&
          status !== "failed" &&
          status !== "canceled"
        ) {
          await new Promise((resolve) => setTimeout(resolve, 10000));
          const updatedPrediction = await replicate.predictions.get(
            prediction.id
          );
          status = updatedPrediction.status;
          console.log(`Server-side check for ${prediction.id}: ${status}`);

          await updateDoc(jobRef, { status: status });
          if (status === "succeeded") {
            let videoUrl = null;
            if (
              Array.isArray(updatedPrediction.output) &&
              updatedPrediction.output.length > 0
            ) {
              videoUrl = updatedPrediction.output[0];
            } else if (typeof updatedPrediction.output === "string") {
              videoUrl = updatedPrediction.output;
            }
            if (videoUrl) {
              const videoResponse = await fetch(videoUrl);
              if (!videoResponse.ok) {
                throw new Error(
                  `Failed to fetch video: ${videoResponse.status}`
                );
              }
              const videoBlob = await videoResponse.blob();
              const storageRef = ref(
                storage,
                `users/${user}/videos/${prediction.id}`
              );
              await uploadBytes(storageRef, videoBlob);
              const savedVideoURL = await getDownloadURL(storageRef);

              const creditCost = model === "kwaivgi/kling-v1.6-pro" ? 2 : 1;
              const durationCost = duration === 10 ? 2 : 1;
              const totalCost = creditCost * durationCost;

              const creditsRef = doc(db, "users", user, "credits", "current");
              const creditsSnap = await getDoc(creditsRef);
              let newCredits = 0;
              if (creditsSnap.exists()) {
                newCredits = creditsSnap.data().value - totalCost;
                await setDoc(creditsRef, { value: newCredits });
              }

              const videosRef = doc(db, "users", user, "videos", "list");
              const videosSnap = await getDoc(videosRef);
              let updatedVideos = [];
              if (videosSnap.exists()) {
                updatedVideos = videosSnap.data().list || [];
              }
              updatedVideos.unshift({
                src: savedVideoURL,
                alt: prompt,
                timestamp: Date.now(),
                predictionId: prediction.id,
              });
              await setDoc(videosRef, { list: updatedVideos }, { merge: true });

              await updateDoc(jobRef, {
                videoUrl: savedVideoURL,
                completedAt: new Date().toISOString(),
              });

              const completedJobsRef = doc(
                db,
                "users",
                user,
                "completedJobs",
                prediction.id
              );
              await setDoc(completedJobsRef, {
                predictionId: prediction.id,
                videoUrl: savedVideoURL,
                prompt,
                status: "succeeded",
                completedAt: new Date().toISOString(),
              });

              const activeJobsSnap = await getDoc(activeJobsRef);
              if (activeJobsSnap.exists()) {
                const updatedActiveJobs = (
                  activeJobsSnap.data().jobs || []
                ).filter((job) => job.predictionId !== prediction.id);
                await setDoc(
                  activeJobsRef,
                  { jobs: updatedActiveJobs },
                  { merge: true }
                );
              }

              console.log(`Video completed and saved: ${savedVideoURL}`);
            }
          } else if (status === "failed" || status === "canceled") {
            await updateDoc(jobRef, {
              error: updatedPrediction.error || "Job canceled",
              completedAt: new Date().toISOString(),
            });

            const activeJobsSnap = await getDoc(activeJobsRef);
            if (activeJobsSnap.exists()) {
              const updatedActiveJobs = (
                activeJobsSnap.data().jobs || []
              ).filter((job) => job.predictionId !== prediction.id);
              await setDoc(
                activeJobsRef,
                { jobs: updatedActiveJobs },
                { merge: true }
              );
            }
          }
        }
      };
      checkStatus().catch((error) => {
        console.error(`Error in checkStatus for ${prediction.id}:`, error);
      });
    } catch (error) {
      console.error("Error in generate-video:", error.message, error.stack);
      if (error.message.includes("Queue is full")) {
        res
          .status(429)
          .json({ error: "Queue is full. Please try again later." });
      } else if (error.status === 422) {
        res
          .status(422)
          .json({ error: "Input validation failed", details: error.message });
      } else {
        res
          .status(500)
          .json({ error: "Internal server error", details: error.message });
      }
    }
  });

  app.get("/check-status/:predictionId", async (req, res) => {
    try {
      const { predictionId } = req.params;
      if (!predictionId || predictionId === "undefined") {
        console.error("Invalid prediction ID:", predictionId);
        return res.status(400).json({ error: "Invalid prediction ID" });
      }
      const user = req.headers["user-id"];
      if (!user) {
        console.error("User ID missing in check-status request");
        return res.status(400).json({ error: "User ID is required" });
      }

      const jobRef = doc(db, "users", user, "videoJobs", predictionId);
      const jobSnap = await getDoc(jobRef);
      if (!jobSnap.exists()) {
        console.error(`Job not found for predictionId ${predictionId}`);
        return res.status(404).json({ error: "Job not found" });
      }

      const jobData = jobSnap.data();
      console.log(`Returning status for ${predictionId}:`, jobData);

      const creditsRef = doc(db, "users", user, "credits", "current");
      const creditsSnap = await getDoc(creditsRef);
      const currentCredits = creditsSnap.exists()
        ? creditsSnap.data().value
        : 0;

      res.json({
        status: jobData.status,
        videoUrl: jobData.videoUrl || null,
        error: jobData.error || null,
        credits: currentCredits,
      });
    } catch (error) {
      console.error(
        "Error checking prediction status:",
        error.message,
        error.stack
      );
      res.status(500).json({
        error: "Failed to check prediction status",
        details: error.message,
      });
    }
  });

  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
