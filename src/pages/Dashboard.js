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
          "current"
        );
        const creditsSnap = await getDoc(creditsRef);
        if (creditsSnap.exists()) {
          setCredits(creditsSnap.data().value || 0);
        } else {
          await setDoc(creditsRef, { value: 10 });
          setCredits(10);
        }
      }
    };

    const fetchPreviousImages = async () => {
      if (auth.currentUser) {
        const imagesRef = doc(
          db,
          "users",
          auth.currentUser.uid,
          "images",
          "list"
        );
        const imagesSnap = await getDoc(imagesRef);
        if (imagesSnap.exists()) {
          const imagesList = imagesSnap.data().list || [];
          setPreviousImages(imagesList);
        }
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
    try {
      const response = await axios.post(
        "http://localhost:3001/generate-image",
        { prompt },
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      const imageData = response.data.image;
      const user = auth.currentUser;
      const userId = user.uid;

      // Upload to Storage
      const storageRef = ref(
        storage,
        `users/${userId}/images/${Date.now()}.png`
      );
      await uploadString(storageRef, imageData, "data_url");
      const url = await getDownloadURL(storageRef);
      setImageUrl(url);

      // Update credits
      const newCredits = credits - 1;
      setCredits(newCredits);
      const creditsRef = doc(db, "users", userId, "credits", "current");
      await updateDoc(creditsRef, { value: newCredits });

      // Update previous images
      const newImage = { url, prompt, timestamp: new Date() };
      const updatedImages = [newImage, ...previousImages];
      setPreviousImages(updatedImages);
      const imagesRef = doc(db, "users", userId, "images", "list");
      await setDoc(imagesRef, { list: updatedImages }, { merge: true });
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
