// ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

function ProtectedRoute({ children }) {
  const { user, isAdmin, logout } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-950 text-gray-100 px-4 text-center">
        <p className="text-lg font-semibold">此帳號沒有後台管理權限</p>
        <p className="text-sm text-gray-400">{user.email}</p>
        <button
          onClick={logout}
          className="bg-white text-gray-900 px-4 py-2 rounded font-semibold hover:bg-gray-100"
        >
          登出並切換帳號
        </button>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;
