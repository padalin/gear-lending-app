// src/BulkEditPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, doc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ImageUploader from "./ImageUploader";

// 包覆選項
const COVERED_OPTIONS = ["", "紙箱", "硬殼", "軟袋", "軟殼", "無"];

// 編輯卡片的欄位（全攤開：常用 + 技術性記錄都保留）
const FIELDS = [
  { key: "label", label: "名稱 Label" },
  { key: "category", label: "分類" },
  { key: "quantity", label: "數量", type: "number" },
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

function BulkEditPage({ embedded = false }) {
  const [items, setItems] = useState([]);
  const [originalItems, setOriginalItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadingMap, setUploadingMap] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredItems, setFilteredItems] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  // 智能排序
  const smartSort = (a, b) => {
    const regexPattern = /^(.*?)(\d+)(.*)$/;
    const matchA = a.label.match(regexPattern);
    const matchB = b.label.match(regexPattern);
    if (matchA && matchB) {
      const prefixA = matchA[1].trim();
      const prefixB = matchB[1].trim();
      const prefixTypeA = prefixA.substring(0, Math.min(prefixA.length, 3));
      const prefixTypeB = prefixB.substring(0, Math.min(prefixB.length, 3));
      if (prefixTypeA === prefixTypeB) {
        const numA = parseInt(matchA[2], 10);
        const numB = parseInt(matchB[2], 10);
        if (numA !== numB) return numA - numB;
        if (prefixA !== prefixB) return prefixA.localeCompare(prefixB, "zh-TW");
        return (matchA[3] || "").localeCompare(matchB[3] || "", "zh-TW");
      }
    }
    return a.label.localeCompare(b.label, "zh-TW");
  };

  useEffect(() => {
    async function fetchItems() {
      try {
        const snap = await getDocs(collection(db, "items"));
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const catPriority = { AG: 1, EG: 2, microphone: 3, DI: 4, SGI: 5 };
        data.sort((a, b) => {
          const catA = a.category || "";
          const catB = b.category || "";
          const priorityA = catPriority[catA] || Infinity;
          const priorityB = catPriority[catB] || Infinity;
          if (priorityA !== priorityB) return priorityA - priorityB;
          if (catA !== catB) return catA.localeCompare(catB);
          return smartSort(a, b);
        });
        setItems(data);
        setFilteredItems(data);
        setOriginalItems(JSON.parse(JSON.stringify(data)));
      } catch (err) {
        console.error("讀取器材失敗：", err);
        setError("讀取器材失敗，請稍後再試");
      } finally {
        setLoading(false);
      }
    }
    fetchItems();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredItems(items);
      return;
    }
    const keyword = searchTerm.toLowerCase();
    setFilteredItems(
      items.filter((item) => {
        const t = `${item.label} ${item.category} ${item.brand} ${item.model} ${item.locate || ""} ${item.serialNumber || ""} ${item.remarksA || ""} ${item.remarksB || ""}`.toLowerCase();
        return t.includes(keyword);
      })
    );
  }, [searchTerm, items]);

  const handleChange = (index, field, value) => {
    const updated = [...items];
    const originalIndex = items.findIndex((item) => item.id === filteredItems[index].id);
    if (originalIndex !== -1) {
      updated[originalIndex][field] = field === "quantity" ? parseInt(value, 10) || 0 : value;
      setItems(updated);
    }
  };

  const handleImagesChange = (index, newImages) => {
    const updated = [...items];
    const originalIndex = items.findIndex((item) => item.id === filteredItems[index].id);
    if (originalIndex !== -1) {
      updated[originalIndex].images = newImages;
      setItems(updated);
    }
  };

  const handleSetUploading = (id, flag) => {
    setUploadingMap((prev) => ({ ...prev, [id]: flag }));
  };

  const handleSubmit = async () => {
    setError("");
    try {
      const updates = items.filter((item, i) => JSON.stringify(item) !== JSON.stringify(originalItems[i]));
      if (updates.length === 0) {
        alert("沒有變更需要儲存");
        return;
      }
      const batchSize = 450; // Firestore 單批上限 500，保守取 450
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = writeBatch(db);
        for (const item of updates.slice(i, i + batchSize)) {
          const { id, ...rest } = item;
          batch.update(doc(db, "items", id), rest);
        }
        await batch.commit();
      }
      alert(`更新完成！共更新 ${updates.length} 筆資料`);
      setOriginalItems(JSON.parse(JSON.stringify(items)));
    } catch (err) {
      console.error("批次更新錯誤：", err);
      setError("更新失敗，請稍後再試");
    }
  };

  // 哪些有改過（標記 + 計數）
  const changedIds = useMemo(() => {
    const s = new Set();
    items.forEach((it, i) => {
      if (JSON.stringify(it) !== JSON.stringify(originalItems[i])) s.add(it.id);
    });
    return s;
  }, [items, originalItems]);

  const inputClass = "w-full p-2 text-base bg-gray-800 border border-gray-600 rounded text-white";

  return (
    <div className={embedded ? "text-gray-100" : "min-h-screen bg-gray-950 text-gray-100"}>
      {!embedded && <Navbar />}
      <main className={embedded ? "pb-28" : "pt-20 px-4 max-w-6xl mx-auto pb-28"}>
        {!embedded && <h1 className="text-2xl font-semibold mb-4">批次編輯器材內容</h1>}
        {!embedded && (
          <button onClick={() => (window.location.href = "/admin/items")} className="mb-6 text-gray-300 hover:text-white hover:underline">
            ← 返回器材管理
          </button>
        )}

        {error && <p className="text-red-400 mb-4">{error}</p>}

        {loading ? (
          <p className="text-gray-400">讀取中…</p>
        ) : (
          <>
            <input
              type="text"
              placeholder="搜尋器材名稱、分類、品牌、位置、序號…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 text-base rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-400 mb-2"
            />
            <p className="text-sm text-gray-400 mb-3">
              共 {items.length} 件 · 顯示 {filteredItems.length} 件 · 點任一列展開編輯
            </p>

            <div className="border border-gray-700 rounded-lg overflow-hidden divide-y divide-gray-800">
              {filteredItems.map((item, idx) => {
                const isOpen = expandedId === item.id;
                const changed = changedIds.has(item.id);
                return (
                  <div key={item.id} className={isOpen ? "bg-gray-900" : ""}>
                    <button
                      onClick={() => setExpandedId(isOpen ? null : item.id)}
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-900"
                    >
                      <div className="w-10 h-10 flex-shrink-0 rounded bg-gray-800 overflow-hidden flex items-center justify-center text-gray-500 text-xs">
                        {item.images?.[0] ? (
                          <img src={item.images[0]} alt={item.label} className="object-cover w-full h-full" />
                        ) : (
                          "無圖"
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-base text-white truncate">
                          {item.label}
                          {changed && <span className="ml-2 text-xs text-amber-400">● 已修改</span>}
                        </div>
                        <div className="text-sm text-gray-400 truncate">
                          {item.category}{item.brand ? ` · ${item.brand}` : ""} {item.model || ""}
                        </div>
                      </div>
                      <span className="text-sm text-gray-400 whitespace-nowrap">{isOpen ? "收合 ▲" : "編輯 ▼"}</span>
                    </button>

                    {isOpen && (
                      <div className="px-3 pb-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {FIELDS.map((f) => (
                            <div key={f.key}>
                              <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
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
                            setUploading={(flag) => handleSetUploading(item.id, flag)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredItems.length === 0 && <div className="p-4 text-center text-gray-500">查無符合的器材</div>}
            </div>
          </>
        )}
      </main>

      {!loading && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 border-t border-gray-700 p-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
            <span className={`text-sm ${changedIds.size > 0 ? "text-amber-400" : "text-gray-400"}`}>
              {changedIds.size > 0 ? `已修改 ${changedIds.size} 筆` : "尚無變更"}
            </span>
            <button
              onClick={handleSubmit}
              disabled={changedIds.size === 0 || Object.values(uploadingMap).some((x) => x)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
            >
              儲存變更
            </button>
          </div>
        </div>
      )}
      {!embedded && <Footer />}
    </div>
  );
}

export default BulkEditPage;
