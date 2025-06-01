import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "./firebase"; // ייבוא של Firestore
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore"; // לשמירת נתונים ב-Firestore

const SignUp = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");

    // ולידציה: בדיקת התאמת סיסמאות
    if (password !== confirmPassword) {
      setError("הסיסמאות אינן תואמות");
      return;
    }

    // ולידציה: בדיקת מספר טלפון (פשוטה - רק מספרים, 10 ספרות)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phoneNumber)) {
      setError("מספר טלפון חייב להכיל 10 ספרות בלבד");
      return;
    }

    try {
      // יצירת משתמש ב-Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // שמירת נתונים נוספים ב-Firestore תחת users/{uid}
      await setDoc(doc(db, "users", user.uid), {
        firstName,
        lastName,
        phoneNumber,
        email,
        createdAt: new Date().toISOString(),
      });

      // שמירת קרדיטים ראשוניים (כמו שעשינו קודם)
      await setDoc(doc(db, "users", user.uid, "credits", "current"), {
        value: 10,
      });

      navigate("/"); // ניווט לעמוד הראשי לאחר הרשמה מוצלחת
    } catch (err) {
      setError("שגיאה בהרשמה: " + err.message);
    }
  };

  const goToLogin = () => {
    navigate("/login");
  };

  return (
    <div className="container mt-5">
      <h2 className="text-center mb-4">הרשמה</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSignUp}>
        <div className="mb-3">
          <label htmlFor="firstName" className="form-label">
            שם פרטי
          </label>
          <input
            type="text"
            className="form-control"
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="lastName" className="form-label">
            שם משפחה
          </label>
          <input
            type="text"
            className="form-control"
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="phoneNumber" className="form-label">
            מספר טלפון
          </label>
          <input
            type="tel"
            className="form-control"
            id="phoneNumber"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="email" className="form-label">
            כתובת דוא"ל
          </label>
          <input
            type="email"
            className="form-control"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="password" className="form-label">
            סיסמה
          </label>
          <input
            type="password"
            className="form-control"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="confirmPassword" className="form-label">
            אימות סיסמה
          </label>
          <input
            type="password"
            className="form-control"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary w-100">
          הרשם
        </button>
      </form>
      <p className="text-center mt-3">
        כבר יש לך חשבון?{" "}
        <button className="btn btn-link p-0" onClick={goToLogin}>
          התחבר
        </button>
      </p>
    </div>
  );
};

export default SignUp;
