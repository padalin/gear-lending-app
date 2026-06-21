// src/BulkManagePage.jsx
// 批次管理：把「批次新增 / 批次編輯 / 批次照片」整合成一頁三分頁。
import React, { useState } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useNavigate } from "react-router-dom";
import BulkAddPage from "./BulkAddPage";
import BulkEditPage from "./BulkEditPage";
import BulkPhotoPage from "./BulkPhotoPage";

const TABS = [
  { key: "add", label: "批次新增" },
  { key: "edit", label: "批次編輯" },
  { key: "photo", label: "批次照片" },
];

export default function BulkManagePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("add");

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <main className="pt-20 px-4 max-w-6xl mx-auto pb-32">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h1 className="text-2xl font-bold">批次管理</h1>
          <button
            onClick={() => navigate("/admin/items")}
            className="text-gray-300 hover:text-white hover:underline whitespace-nowrap"
          >
            ← 返回器材管理
          </button>
        </div>

        <div className="flex gap-1 mb-6 border-b border-gray-700">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 -mb-px border-b-2 ${
                tab === t.key ? "border-blue-500 text-white" : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 一次只掛載目前分頁（切換分頁會重置該分頁的暫存狀態） */}
        {tab === "add" && <BulkAddPage embedded />}
        {tab === "edit" && <BulkEditPage embedded />}
        {tab === "photo" && <BulkPhotoPage embedded />}
      </main>
      <Footer />
    </div>
  );
}
