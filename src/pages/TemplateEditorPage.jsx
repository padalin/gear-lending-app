// src/pages/TemplateEditorPage.jsx
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import Navbar from "../Navbar";
import Footer from "../Footer";

export default function TemplateEditorPage() {
  const [templates, setTemplates] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // 表單狀態
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState([]); // [{ itemId, label, quantity }]
  const [error, setError] = useState("");

  // 抓 presets 與 items
  const fetchTemplates = async () => {
    const snap = await getDocs(collection(db, "presets"));
    setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };
  const fetchAllItems = async () => {
    const snap = await getDocs(collection(db, "items"));
    setAllItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    fetchTemplates();
    fetchAllItems();
  }, []);

  // 加入器材至表單（避免重複）
  const addItemToTemplate = (itemId) => {
    if (items.some(i => i.itemId === itemId)) {
      setError("此模板中已加入過此器材");
      return;
    }
    const it = allItems.find(i => i.id === itemId);
    if (!it) return;
    setItems([...items, { itemId: it.id, label: it.label, quantity: 1 }]);
    setError("");
  };

  const updateQty = (idx, qty) => {
    const arr = [...items];
    arr[idx].quantity = qty;
    setItems(arr);
  };

  const removeItem = (idx) => {
    const arr = [...items];
    arr.splice(idx, 1);
    setItems(arr);
  };

  // 清空表單回到「新增」
  const clearForm = () => {
    setEditingId(null);
    setName("");
    setNote("");
    setItems([]);
    setError("");
  };

  // 儲存（新增或更新）
  const handleSave = async () => {
    if (!name.trim()) {
      setError("請輸入模板名稱");
      return;
    }
    if (items.length === 0) {
      setError("請至少選擇一項器材");
      return;
    }
    setError("");
    const payload = { name, items, note };
    if (editingId) {
      // 更新
      const ref = doc(db, "presets", editingId);
      await updateDoc(ref, payload);
    } else {
      // 新增
      await addDoc(collection(db, "presets"), payload);
    }
    // 重新載入列表並重置表單
    await fetchTemplates();
    clearForm();
  };

  // 刪除
  const handleDelete = async (id) => {
    if (!window.confirm("確定要刪除這個模板？")) return;
    await deleteDoc(doc(db, "presets", id));
    await fetchTemplates();
    if (editingId === id) clearForm();
  };

  // 編輯：將模板資料帶入表單
  const handleEdit = (tpl) => {
    setEditingId(tpl.id);
    setName(tpl.name);
    setNote(tpl.note || "");
    setItems(tpl.items || []);
    setError("");
  };

  // 篩選器材列表
  const filteredItems = allItems.filter(i =>
    i.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 pt-20 pb-32">
        <h1 className="text-2xl font-bold mb-4">模板管理</h1>

        {/* 新增 / 編輯 區塊 */}
        <div className="mb-6 border border-gray-700 p-4 rounded bg-gray-900">
          <h2 className="text-lg font-semibold mb-2">
            {editingId ? "編輯模板" : "新增模板"}
          </h2>

          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="模板名稱"
            className="w-full p-2 rounded bg-gray-800 border border-gray-600 mb-2"
          />
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="備註（選填）"
            className="w-full p-2 rounded bg-gray-800 border border-gray-600 mb-2"
            rows={2}
          />

          <input
            type="text"
            placeholder="搜尋器材名稱..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full p-2 rounded bg-gray-800 border border-gray-600 mb-4"
          />

          {/* 貼上篩選後的器材按鈕 */}
          <div className="flex flex-wrap gap-2 mb-4">
            {filteredItems.map(it => (
              <button
                key={it.id}
                type="button"
                onClick={() => addItemToTemplate(it.id)}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                + {it.label}
              </button>
            ))}
          </div>

          {/* 已選器材列表 */}
          {items.map((it, idx) => (
            <div key={it.itemId} className="flex items-center gap-2 mb-2">
              <span className="flex-1">{it.label}</span>
              <input
                type="number"
                min="1"
                value={it.quantity}
                onChange={e => updateQty(idx, Number(e.target.value))}
                className="w-16 p-1 text-black rounded"
              />
              <button
                onClick={() => removeItem(idx)}
                className="text-red-400 hover:text-red-600"
              >
                刪除
              </button>
            </div>
          ))}

          {error && <p className="text-red-500 mt-2">{error}</p>}

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSave}
              className="bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded"
            >
              {editingId ? "更新模板" : "新增模板"}
            </button>
            {editingId && (
              <button
                onClick={clearForm}
                className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
              >
                取消編輯
              </button>
            )}
          </div>
        </div>

        {/* 現有模板列表 */}
        <h2 className="text-xl font-bold mt-8 mb-4">現有模板</h2>
        <div className="space-y-4">
          {templates.map(tpl => (
            <div
              key={tpl.id}
              className="border border-gray-700 p-4 rounded bg-gray-800"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-lg">{tpl.name}</p>
                  {tpl.note && <p className="text-sm text-gray-400">{tpl.note}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(tpl)}
                    className="text-blue-400 hover:text-blue-600 text-sm"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => handleDelete(tpl.id)}
                    className="text-red-400 hover:text-red-600 text-sm"
                  >
                    刪除
                  </button>
                </div>
              </div>
              <ul className="mt-2 text-sm list-disc list-inside">
                {tpl.items.map((it, i) => (
                  <li key={i}>
                    {it.label} × {it.quantity}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
