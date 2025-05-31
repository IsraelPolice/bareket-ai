import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "./firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (err) {
      setError("שגיאה בהתחברות: " + err.message);
    }
  };

  const goToRegister = () => {
    navigate("/signup"); // שינוי ל-/signup כדי להתאים ל-SignUp
  };

  return (
    <div className="container mt-5">
      <h2 className="text-center mb-4">התחברות</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleLogin}>
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
        <button type="submit" className="btn btn-primary w-100">
          התחבר
        </button>
      </form>
      <p className="text-center mt-3">
        אין לך חשבון?{" "}
        <button className="btn btn-link p-0" onClick={goToRegister}>
          הרשם
        </button>
      </p>
    </div>
  );
};

export default Login;
