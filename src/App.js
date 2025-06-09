import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import AppRoutes from "./routes/AppRoutes";
import { SpeedInsights } from "@vercel/speed-insights/react";

function App() {
  return (
    <Router>
      <Header />
      <AppRoutes />
      <Footer />
      <SpeedInsights />
    </Router>
  );
}

export default App;
