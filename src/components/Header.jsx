import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import "../styles/Header.css";

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const isLandingPage = location.pathname === "/";

  const scrollToSection = (id) => {
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light">
      <div className="container-fluid">
        <Link className="navbar-brand" to="/">
          Bareket AI
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <div className="navbar-nav ms-auto">
            {isLandingPage && (
              <>
                <button
                  className="nav-link btn btn-link"
                  onClick={() => scrollToSection("features")}
                >
                  Features
                </button>
                <button
                  className="nav-link btn btn-link"
                  onClick={() => scrollToSection("learn")}
                >
                  Learn
                </button>
                <button
                  className="nav-link btn btn-link"
                  onClick={() => scrollToSection("contact")}
                >
                  Contact
                </button>
                <button
                  className="nav-link btn btn-link"
                  onClick={() => scrollToSection("example")}
                >
                  Example
                </button>
                <button
                  className="btn btn-primary ms-2"
                  onClick={() => navigate("/generator")}
                >
                  Go To App
                </button>
              </>
            )}

            {!isLandingPage && user && (
              <>
                <Link className="nav-link" to="/generator">
                  Image Generator
                </Link>
                <Link className="nav-link" to="/admin">
                  Admin Panel
                </Link>
                <button
                  className="btn btn-link nav-link"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </>
            )}

            {!isLandingPage && !user && (
              <>
                <Link className="nav-link" to="/login">
                  Login
                </Link>
                <Link className="nav-link" to="/signup">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Header;
