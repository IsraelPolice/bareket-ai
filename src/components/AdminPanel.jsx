import React, { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const AdminPanel = () => {
  const [previousImages, setPreviousImages] = useState([]);

  useEffect(() => {
    const fetchImages = async () => {
      const user = auth.currentUser;
      if (user) {
        const userId = user.uid;
        const imagesRef = doc(db, "users", userId, "images", "list");
        const imagesSnap = await getDoc(imagesRef);
        if (imagesSnap.exists()) {
          setPreviousImages(imagesSnap.data().list || []);
        }
      }
    };

    fetchImages();
  }, []);

  const deleteImage = async (index) => {
    const user = auth.currentUser;
    const userId = user.uid;
    const updatedImages = previousImages.filter((_, i) => i !== index);
    setPreviousImages(updatedImages);
    const imagesRef = doc(db, "users", userId, "images", "list");
    await updateDoc(imagesRef, { list: updatedImages });
  };

  return (
    <div className="container mt-5">
      <h1 className="text-center mb-4">פאנל ניהול - תמונות קודמות</h1>
      {previousImages.length > 0 ? (
        <div className="row">
          {previousImages.map((img, index) => (
            <div key={index} className="col-md-4 mb-3">
              <div className="card">
                <img src={img.src} alt={img.alt} className="card-img-top" />
                <div className="card-body">
                  <p className="card-text">{img.alt}</p>
                  <button
                    className="btn btn-danger"
                    onClick={() => deleteImage(index)}
                  >
                    מחק
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center">אין תמונות קודמות להצגה.</p>
      )}
    </div>
  );
};

export default AdminPanel;
