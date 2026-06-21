// src/BulkAddPage.jsx
import React, { useState } from "react";
import Papa from "papaparse";
import { collection, doc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ImageUploader from "./ImageUploader";

const COVERED_OPTIONS = ["", "紙箱", "硬殼", "軟袋", "軟殼", "無"];

// 新增卡片的欄位（全攤開：常用 + 技術性記錄）
const FIELDS = [
  { key: "label", label: "名稱 Label", required: true },
  { key: "category", label: "分類", required: true },
  { key: "quantity", label: "數量", required: true, type: "number" },
  { key: "brand", label: "品牌" },
  { key: "model", label: "型號" },
  { key: "serialNumber", label: "序號 SN" },
  { key: "locate", label: "位置" },
  { key: "covered", label: "包覆", type: "select" },
  { key: "class", label: "Class" },
  { key: "colour", label: "顏色" },
  { key: "manufacturedDate", label: "製造日期" },
  { key: "remarksA", label: "備註 A" },
  { key: "remarksB", label: "備註 B" },
];

function BulkAddPage({ embedded = false }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [uploadingMap, setUploadingMap] = useState({});

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const parsed = results.data
          .map((row) => ({
            label: row["Label C"]?.trim() || "",
            category: row["Instrument & Photo"]?.trim() || "",
            brand: row["Brand"]?.trim() || "",
            model: row["Model"]?.trim() || "",
            class: row["Class"]?.trim() || "",
            colour: row["Colour"]?.trim() || "",
            serialNumber: row["SN"]?.trim() || "",
            manufacturedDate: row["Manufactured Date"]?.trim() || "",
            covered: row["Covered"]?.trim() || "",
            locate: row["Location"]?.trim() || "",
            remarksA: row["Remarks"]?.trim() || "",
            remarksB: row["Remarks.1"]?.trim() || "",
            quantity: 1,
            images: [],
          }))
          .filter((it) => it.label || it.category || it.brand || it.model);
        setItems(parsed);
      },
      error: (err) => {
        console.error("CSV parse error", err);
        setError("CSV 讀取錯誤，請確認格式");
      },
    });
  };

  const handleChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = field === "quantity" ? parseInt(value, 10) || 1 : value;
    setItems(updated);
  };

  const handleImagesChange = (index, newImages) => {
    const updated = [...items];
    updated[index].images = newImages;
    setItems(updated);
  };

  const addEmptyRow = () => {
    setItems([...items, { label: "", category: "", quantity: 1, locate: "", images: [] }]);
  };

  const removeRow = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setError("");
    const validItems = items.filter((item) => item.label && item.category && item.quantity > 0);
    if (validItems.length === 0) {
      setError("請至少填寫一筆有效資料（名稱、分類與數量）");
      return;
    }
    try {
      const itemsRef = collection(db, "items");
      const batchSize = 450; // Firestore 單批上限 500，保守取 450
      for (let i = 0; i < validItems.length; i += batchSize) {
        const batch = writeBatch(db);
        for (const item of validItems.slice(i, i + batchSize)) {
          const { images, ...rest } = item;
          const payload = { ...rest };
          if (images && images.length) payload.images = images;
          batch.set(doc(itemsRef), payload); // doc(collectionRef) 自動產生 ID
        }
        await batch.commit();
      }
      alert("新增成功！");
      setItems([]);
    } catch (err) {
      console.error("批次新增錯誤", err);
      setError("新增失敗，請稍後再試");
    }
  };

  const inputClass = "w-full p-2 text-base bg-gray-800 border border-gray-600 rounded text-white";

  return (
    <div className={embedded ? "text-white" : "min-h-screen bg-gray-950 text-white"}>
      {!embedded && <Navbar />}
      <main className={embedded ? "pb-28" : "pt-20 px-4 max-w-5xl mx-auto pb-28"}>
        {!embedded && <h1 className="text-2xl font-semibold mb-4">批次新增器材</h1>}
        {!embedded && (
          <button onClick={() => (window.location.href = "/admin/items")} className="mb-6 text-gray-300 hover:text-white hover:underline">
            ← 返回器材管理
          </button>
        )}

        {/* 工具列 */}
        <div className="flex flex-wrap gap-3 mb-4">
          <label className="inline-flex items-center gap-2 border border-gray-600 hover:bg-gray-800 px-4 py-2 rounded cursor-pointer text-sm">
            匯入 CSV
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>
          <button onClick={addEmptyRow} className="border border-gray-600 hover:bg-gray-800 px-4 py-2 rounded text-sm">
            ＋ 新增一筆
          </button>
        </div>

        {error && <p className="text-red-400 border border-red-500 bg-red-900/20 rounded p-2 mb-4">{error}</p>}

        {items.length === 0 ? (
          <div className="border border-dashed border-gray-700 rounded-lg p-10 text-center text-gray-500">
            尚未有資料。匯入 CSV，或按「＋ 新增一筆」開始。
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item, idx) => (
              <div key={idx} className="border border-gray-700 rounded-lg p-4 bg-gray-900">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-300">新器材 #{idx + 1}</span>
                  <button onClick={() => removeRow(idx)} className="text-red-400 hover:text-red-600 text-sm">移除</button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {FIELDS.map((f) => (
                    <div key={f.key}>
                      <label className="block text-xs text-gray-400 mb-1">
                        {f.label}{f.required && <span className="text-red-400"> *</span>}
                      </label>
                      {f.type === "select" ? (
                        <select value={item[f.key] || ""} onChange={(e) => handleChange(idx, f.key, e.target.value)} className={inputClass}>
                          {COVERED_OPTIONS.map((o) => (
                            <option key={o} value={o}>{o || "（未指定）"}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={f.type === "number" ? "number" : "text"}
                          value={item[f.key] ?? ""}
                          onChange={(e) => handleChange(idx, f.key, e.target.value)}
                          className={inputClass}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-3">
                  <label className="block text-xs text-gray-400 mb-1">照片</label>
                  <ImageUploader
                    images={item.images || []}
                    setImages={(imgs) => handleImagesChange(idx, imgs)}
                    setUploading={(up) => setUploadingMap((prev) => ({ ...prev, [idx]: up }))}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 border-t border-gray-700 p-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <span className="text-sm text-gray-400">共 {items.length} 筆待新增</span>
            <button
              onClick={handleSubmit}
              disabled={Object.values(uploadingMap).some((x) => x)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
            >
              批次新增 {items.length} 筆
            </button>
          </div>
        </div>
      )}
      {!embedded && <Footer />}
    </div>
  );
}

export default BulkAddPage;
