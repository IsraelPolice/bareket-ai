import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import ImageGenerator from "../components/ImageGenerator";
import AdminPanel from "../components/AdminPanel";
import Login from "../components/Login";
import SignUp from "../components/SignUp";
import LandingPage from "../components/LandingPage";
import { auth } from "../components/firebase";
import { onAuthStateChanged } from "firebase/auth";
import Features from "../components/Features";
import Learn from "../components/Learn";
import Contact from "../components/Contact";
import FAQ from "../components/FAQ";
import Example from "../components/Example";
import VideoGenerator from "../components/VideoGenerator";
import Pricing from "../components/Pricing"; // Added Pricing component

const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
      setLoading(false);
      if (!user) navigate("/login");
    });
    return () => unsubscribe();
  }, [navigate]);

  if (loading) return <div className="text-center mt-5">Loading...</div>;
  return isLoggedIn ? children : null;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/features" element={<Features />} />
      <Route path="/learn" element={<Learn />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/example" element={<Example />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/pricing" element={<Pricing />} />{" "}
      {/* Added Pricing route */}
      <Route
        path="/generator"
        element={
          <ProtectedRoute>
            <ImageGenerator />
          </ProtectedRoute>
        }
      />
      <Route
        path="/video-generator/*"
        element={
          <ProtectedRoute>
            <VideoGenerator />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminPanel />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default AppRoutes;
