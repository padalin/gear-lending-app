import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { Map } from "lucide-react";
import CabinetMap from "./CabinetMap";

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showMap, setShowMap] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("登出失敗：", err);
    }
  };

  const toggleMap = () => {
    setShowMap(!showMap);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 w-full bg-gray-950 border-b border-gray-700 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-xl font-mono font-bold text-gray-100">
            Cheerhave Gears
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMap}
              className="text-sm px-4 py-2 rounded border border-gray-600 text-gray-100 hover:bg-gray-800 transition flex items-center gap-1"
            >
              <Map size={16} />
              <span>地圖</span>
            </button>
            
            {user ? (
              <>
                <Link
                  to="/admin"
                  className="text-sm px-4 py-2 rounded border border-gray-600 text-gray-100 hover:bg-gray-800 transition"
                >
                  管理
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-sm px-4 py-2 rounded border border-gray-600 text-gray-100 hover:bg-gray-800 transition"
                >
                  登出
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="text-sm px-4 py-2 rounded border border-gray-600 text-gray-100 hover:bg-gray-800 transition"
              >
                登入
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* 使用獨立的CabinetMap組件 */}
      {showMap && <CabinetMap onClose={toggleMap} />}
    </>
  );
}

export default Navbar;