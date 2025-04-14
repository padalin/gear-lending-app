import React from "react";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import Footer from "./Footer";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/admin");
    } catch (err) {
      console.error("Firebase login error:", err);
      setError("登入失敗，請檢查帳號密碼");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-gray-900 p-6 rounded shadow w-80 space-y-4 border border-gray-700"
      >
        <h1 className="text-xl font-bold text-center">管理員登入</h1>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          className="w-full bg-gray-800 border border-gray-600 text-white placeholder-gray-400 px-3 py-2 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full bg-gray-800 border border-gray-600 text-white placeholder-gray-400 px-3 py-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="submit"
          className="bg-white text-gray-900 border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded w-full font-semibold"
        >
          登入
        </button>

        <Link
          to="/"
          className="block text-sm text-center text-gray-300 hover:underline mt-2"
        >
          ← 回到首頁
        </Link>
      </form>
      <Footer />
    </div>
  );
}

export default Login;
