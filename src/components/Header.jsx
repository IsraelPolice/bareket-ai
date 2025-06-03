import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import "../styles/Header.css";
import logo from "../assets/logo.png";

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

  const isPublicPage = [
    "/",
    "/features",
    "/learn",
    "/contact",
    "/example",
  ].includes(location.pathname);

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light">
      <div className="container-fluid header-container">
        <Link className="navbar-brand" to="/">
          <img src={logo} alt="Bareket AI Logo" className="logo" />
        </Link>

        <div className="navbar-nav-wrapper">
          {isPublicPage && (
            <>
              <div className="navbar-links">
                <Link className="nav-link" to="/features">
                  Features
                </Link>
                <Link className="nav-link" to="/learn">
                  Learn
                </Link>
                <Link className="nav-link" to="/contact">
                  Contact
                </Link>
                <Link className="nav-link" to="/example">
                  Example
                </Link>
              </div>
              <button
                className="btn btn-primary go-to-app-btn"
                onClick={() => navigate("/generator")}
              >
                Go To App
              </button>
            </>
          )}

          {!isPublicPage && user && (
            <div className="navbar-links">
              <Link className="nav-link" to="/generator">
                Image Generator
              </Link>
              <Link className="nav-link" to="/video-generator">
                Video Generator
              </Link>
              <Link className="nav-link" to="/admin">
                My Account
              </Link>
              <button className="btn btn-link nav-link" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}

          {!isPublicPage && !user && (
            <div className="navbar-links">
              <Link className="nav-link" to="/login">
                Login
              </Link>
              <Link className="nav-link" to="/signup">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Header;
