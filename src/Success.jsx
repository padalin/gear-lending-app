import React from "react";
import { Link } from "react-router-dom";
import Footer from "./Footer";

function Success() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col justify-center items-center px-4 text-center">
      <h1 className="text-3xl font-bold mb-4">有有老闆已知悉！</h1>
      <p className="mb-6 text-gray-400">感謝您愛護器材～</p>
      <Link
        to="/"
        className="bg-white text-gray-900 border border-gray-300 hover:bg-gray-100 font-semibold px-6 py-2 rounded"
      >
        回到首頁
      </Link>
      <Footer />
    </div>
  );
}

export default Success;
