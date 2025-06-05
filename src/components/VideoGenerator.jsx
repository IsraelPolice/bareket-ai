import React from "react";
import { Routes, Route } from "react-router-dom";
import ModelSelector from "./ModelSelector";
import WanGenerator from "./WanGenerator";
import PixverseGenerator from "./PixverseGenerator";
import { auth } from "./firebase";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsLoggedIn(!!user);
      setLoading(false);
      if (!user) navigate("/login");
    });
    return () => unsubscribe();
  }, [navigate]);

  if (loading) return <div className="text-center mt-5">Loading...</div>;
  return isLoggedIn ? children : null;
};

const VideoGenerator = () => {
  return (
    <ProtectedRoute>
      <Routes>
        <Route index element={<ModelSelector />} />
        <Route path="wan" element={<WanGenerator />} />
        <Route path="pixverse" element={<PixverseGenerator />} />
      </Routes>
    </ProtectedRoute>
  );
};

export default VideoGenerator;
