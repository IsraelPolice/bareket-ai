import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { auth, db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import AdminPanelImage from "../assets/AdminPanel.png";
import "../styles/AdminPanelStyles.css";

const AdminPanelIcon = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Show Admin Panel only in app pages
  const appPages = ["/generator", "/video-generator"];
  const isAppPage = appPages.includes(location.pathname);

  useEffect(() => {
    const checkAdminStatus = async () => {
      const user = auth.currentUser;
      if (user) {
        const userId = user.uid;
        console.log("Checking Admin for userId:", userId);
        const userRef = doc(db, "users", userId);
        try {
          const userSnap = await getDoc(userRef);
          console.log("User data:", userSnap.data());
          if (userSnap.exists()) {
            if (!userSnap.data().isAdmin) {
              // Add isAdmin field if it doesn't exist
              await setDoc(userRef, { isAdmin: true }, { merge: true });
              console.log("Added isAdmin field for user:", userId);
            }
            if (userSnap.data().isAdmin) {
              console.log("User is Admin!");
              setIsAdmin(true);
            } else {
              console.log("User is not Admin or isAdmin field missing.");
            }
          } else {
            // If the document doesn't exist, create it with isAdmin
            await setDoc(userRef, { isAdmin: true });
            console.log("Created user document with isAdmin:", userId);
            setIsAdmin(true);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        console.log("No authenticated user.");
      }
    };
    checkAdminStatus();
  }, []);

  if (!isAdmin || !isAppPage) return null;

  return (
    <div className="admin-panel-wrapper">
      <img
        src={AdminPanelImage}
        alt="Admin Panel"
        className="admin-panel-icon"
        onClick={() => setIsOpen(!isOpen)}
      />
      {isOpen && (
        <div className="admin-panel-dropdown">
          <h3>Admin Panel</h3>
          <p>Manage users, credits, and more...</p>
          <button onClick={() => alert("Manage Users")}>Manage Users</button>
          <button onClick={() => alert("View Logs")}>View Logs</button>
        </div>
      )}
    </div>
  );
};

export default AdminPanelIcon;
