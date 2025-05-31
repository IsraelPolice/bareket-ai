import React, { useState, useEffect } from "react";
import { auth, db, storage } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import axios from "axios";
import {
  Box,
  Heading,
  Text,
  Input,
  Button,
  Image,
  VStack,
  SimpleGrid,
  Center,
} from "@chakra-ui/react";

const Dashboard = () => {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [credits, setCredits] = useState(0);
  const [previousImages, setPreviousImages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCredits = async () => {
      if (auth.currentUser) {
        const creditsRef = doc(
          db,
          "users",
          auth.currentUser.uid,
          "credits",
          "credit1"
        );
        const creditsSnap = await getDoc(creditsRef);
        if (creditsSnap.exists()) {
          setCredits(creditsSnap.data().credits);
        } else {
          await setDoc(creditsRef, { credits: 10 });
          setCredits(10);
        }
      }
    };

    const fetchPreviousImages = async () => {
      if (auth.currentUser) {
        const imagesRef = collection(
          db,
          "users",
          auth.currentUser.uid,
          "images"
        );
        const imagesSnap = await getDocs(imagesRef);
        const imagesList = imagesSnap.docs.map((doc) => doc.data());
        setPreviousImages(imagesList);
      }
    };

    fetchCredits();
    fetchPreviousImages();
  }, []);

  const handleGenerateImage = async () => {
    if (credits <= 0) {
      alert("No credits left!");
      return;
    }
    setLoading(true);
    console.log("Sending prompt to server:", prompt);
    try {
      const response = await axios.post(
        "http://localhost:3001/generate-image",
        { prompt },
        { headers: { "Content-Type": "application/json" } }
      );
      console.log("Server response:", response.data);
      const imageData = response.data.image;
      if (typeof imageData === "string" && imageData.startsWith("http")) {
        setImageUrl(imageData); // אם זה URL ישיר
      } else if (typeof imageData === "string") {
        // אם זה base64, נעלה ל-Storage
        const storageRef = ref(
          storage,
          `users/${auth.currentUser.uid}/images/${Date.now()}.png`
        );
        await uploadString(storageRef, imageData, "data_url");
        const url = await getDownloadURL(storageRef);
        setImageUrl(url);
      } else {
        throw new Error("Invalid image data format from server");
      }

      const storageRef = ref(
        storage,
        `users/${auth.currentUser.uid}/images/${Date.now()}.png`
      );
      await uploadString(storageRef, imageData, "data_url");
      const url = await getDownloadURL(storageRef);

      await setDoc(
        doc(db, "users", auth.currentUser.uid, "images", Date.now().toString()),
        {
          url,
          prompt,
          timestamp: new Date(),
        }
      );

      const creditsRef = doc(
        db,
        "users",
        auth.currentUser.uid,
        "credits",
        "credit1"
      );
      await updateDoc(creditsRef, { credits: credits - 1 });
      setCredits(credits - 1);

      setPreviousImages([
        ...previousImages,
        { url, prompt, timestamp: new Date() },
      ]);
    } catch (error) {
      console.error("Error generating image:", error.message, error.stack);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      console.log("Signed out successfully");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <Center minH="100vh" p={4}>
      <VStack spacing={6} w="full" maxW="800px">
        <Heading as="h1" size="xl">
          Generate Image
        </Heading>
        <Button colorScheme="red" onClick={handleSignOut}>
          Sign Out
        </Button>
        <Text>Credits: {credits}</Text>
        <Input
          placeholder="Enter prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          size="lg"
        />
        <Button
          colorScheme="blue"
          onClick={handleGenerateImage}
          isLoading={loading}
          loadingText="Generating..."
        >
          Generate
        </Button>
        {imageUrl && <Image src={imageUrl} alt="Generated Image" maxW="100%" />}
        <Heading as="h2" size="md">
          Previous Images
        </Heading>
        <SimpleGrid columns={[1, 2, 3]} spacing={4}>
          {previousImages.map((img, index) => (
            <Box key={index} borderWidth="1px" borderRadius="lg" p={2}>
              <Image src={img.url} alt={img.prompt} maxW="100%" />
              <Text mt={2}>{img.prompt}</Text>
            </Box>
          ))}
        </SimpleGrid>
      </VStack>
    </Center>
  );
};

export default Dashboard;
