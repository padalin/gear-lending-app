// src/MultiBorrowForm.jsx
import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useNavigate } from "react-router-dom";

function MultiBorrowForm() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState({});
  const [commonTemplates, setCommonTemplates] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const categoryOrder = ["EG", "AG", "Nylon GT", "Others Strings", "Keys", "Synthesizer"];

  // 讀取模板
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "presets"));
      setCommonTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    })();
  }, []);

  // 讀取器材 + 計算在庫
  useEffect(() => {
    (async () => {
      const [itemSnap, borrowSnap, returnSnap] = await Promise.all([
        getDocs(collection(db, "items")),
        getDocs(collection(db, "borrowRequests")),
        getDocs(collection(db, "returnRecords")),
      ]);

      // 統計借出數量
      const borrowMap = {};
      borrowSnap.docs.forEach(d => {
        const { itemId } = d.data();
        borrowMap[itemId] = (borrowMap[itemId] || 0) + 1;
      });

      // 統計歸還數量（處理群組與單筆兩種格式）
      const returnMap = {};
      returnSnap.docs.forEach(d => {
        const data = d.data();
        if (Array.isArray(data.items)) {
          data.items.forEach(entry => {
            returnMap[entry.itemId] = (returnMap[entry.itemId] || 0) + (entry.quantity || 1);
          });
        } else {
          const { itemId } = data;
          returnMap[itemId] = (returnMap[itemId] || 0) + 1;
        }
      });

      // 計算最終在庫
      const list = itemSnap.docs.map(d => {
        const data = d.data();
        const id = d.id;
        const total = data.quantity || 0;
        const borrowed = (borrowMap[id] || 0) - (returnMap[id] || 0);
        const stock = Math.max(total - borrowed, 0);
        return { id, ...data, stock };
      });

      setItems(list);

      // 預設展開所有分類
      const exp = {};
      list.forEach(it => {
        exp[it.category] = true;
      });
      setExpandedCategories(exp);
    })();
  }, []);

  // 分組、過濾、排序
  const groupedItems = items.reduce((acc, it) => {
    const cat = it.category || "未分類";
    (acc[cat] ||= []).push(it);
    return acc;
  }, {});

  const filterItem = it =>
    `${it.label} ${it.brand} ${it.model}`.toLowerCase().includes(searchTerm.toLowerCase());

  const sortedGroupEntries = Object.entries(groupedItems)
    .map(([cat, list]) => [
      cat,
      list
        .filter(filterItem)
        .sort((a, b) => a.label.localeCompare(b.label, "en-u-kn"))
    ])
    .filter(([, list]) => list.length)
    .sort(([a], [b]) => {
      const ai = categoryOrder.indexOf(a), bi = categoryOrder.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

  // 已選清單
  const selectedItems = items
    .filter(it => selected[it.id] > 0)
    .sort((a, b) => {
      const ai = categoryOrder.indexOf(a.category);
      const bi = categoryOrder.indexOf(b.category);
      if (ai !== bi) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      return a.label.localeCompare(b.label, "en-u-kn");
    });

  // 增減選擇數量
  const incrementQty = (id, max) => setSelected(prev => ({
    ...prev,
    [id]: Math.min((prev[id] || 0) + 1, max)
  }));
  const decrementQty = id => setSelected(prev => ({
    ...prev,
    [id]: Math.max((prev[id] || 0) - 1, 0)
  }));
  const removeItem = id => setSelected(prev => {
    const copy = { ...prev };
    delete copy[id];
    return copy;
  });

  // 套用模板
  const applyTemplate = tpl => {
    const updates = {};
    tpl.items.forEach(entry => {
      const match = items.find(it => it.label === entry.label);
      if (match && match.stock > 0 && !updates[match.id]) {
        updates[match.id] = entry.quantity;
      }
    });
    setSelected(updates);
  };

  // 初次送出檢查
  const handleInitialSubmit = e => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !phone.trim()) {
      setError("請填寫姓名及手機號碼"); return;
    }
    if (!/^09\d{8}$/.test(phone)) {
      setError("請輸入正確的台灣手機號碼（09 開頭 + 8 碼）"); return;
    }
    if (selectedItems.length === 0) {
      setError("請至少選擇一項器材並指定數量"); return;
    }
    setShowConfirm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 確認送出
  const handleConfirmSubmit = async () => {
    try {
      for (const it of selectedItems) {
        const qty = selected[it.id] || 0;
        for (let i = 0; i < qty; i++) {
          await addDoc(collection(db, "borrowRequests"), {
            itemId: it.id,
            itemName: it.label,
            borrower: name,
            phone,
            note,
            timestamp: new Date(),
          });
        }
      }
      navigate("/success");
    } catch (err) {
      console.error(err);
      setError("資料送出失敗，請稍後再試");
      setShowConfirm(false);
    }
  };

  // 切換分類展開
  const toggleCategory = cat => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <>
      <Navbar />
      <main className="pt-16 px-4 max-w-6xl mx-auto relative">
        <div className="max-w-3xl mx-auto p-6 text-black">
          <h1 className="text-2xl font-bold mb-4 text-white">借器材</h1>

          {/* 錯誤提示 */}
          {error && (
            <p className="text-red-500 fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-900/90 border border-red-500 rounded px-4 py-2 z-50">
              {error}
            </p>
          )}

          {/* 確認送出 */}
          {showConfirm && (
            <div className="border border-yellow-700 bg-black p-4 rounded mb-6 text-white">
              <p className="text-lg font-semibold mb-2">你確定要送出這些借用資料嗎？</p>
              <p>借用人：{name}</p>
              <p>電話：{phone}</p>
              <p>備註：{note || "（無）"}</p>
              <p className="mt-2 font-semibold">借用器材：</p>
              <ul className="space-y-2 mt-2">
                {selectedItems.map(it => (
                  <li key={it.id} className="flex gap-3 items-center">
                    <img src={it.images?.[0]} alt={it.label} className="w-16 h-16 object-cover rounded border border-white" />
                    <span>{it.label} × {selected[it.id]}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-end gap-2 mt-3">
                <button className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded" onClick={() => setShowConfirm(false)}>取消</button>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded" onClick={handleConfirmSubmit}>送出</button>
              </div>
            </div>
          )}

          {/* 表單 */}
          <form onSubmit={handleInitialSubmit} className="space-y-6">
            {/* 姓名／電話／備註 */}
            <div className="space-y-2">
              <label className="block font-medium text-white">借用人姓名</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="bg-gray-800 border border-gray-600 p-2 w-full rounded text-white placeholder-gray-400"
                placeholder="請輸入姓名；歸還時需一致。"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block font-medium text-white">聯絡電話</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="bg-gray-800 border border-gray-600 p-2 w-full rounded text-white placeholder-gray-400"
                placeholder="例如：0912345678；歸還時需一致。"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block font-medium text-white">備註（選填）</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
                className="bg-gray-800 border border-gray-600 p-2 w-full rounded text-white placeholder-gray-400"
                placeholder="用途、代借說明或其他備註"
              />
            </div>

            {/* 搜尋 */}
            <input
              type="text"
              placeholder="搜尋器材名稱、品牌或型號..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full mb-4 px-4 py-2 border border-blue-400 rounded bg-blue-50 text-black placeholder-gray-500"
            />

            {/* 模板按鈕 */}
            <div className="flex flex-wrap gap-2 mb-4">
              {commonTemplates.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  className="bg-gray-800 hover:bg-gray-700 border border-yellow-700 text-white px-3 py-1 rounded"
                >
                  {tpl.name}
                </button>
              ))}
            </div>

            <hr className="my-4 border-gray-700" />

            {/* 分類 & 器材列表 */}
            {sortedGroupEntries.map(([cat, list]) => (
              <div key={cat} className="mb-0">
                <button
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className="w-full text-left font-mono font-bold text-lg py-2 px-4 bg-gray-100 text-black rounded hover:bg-gray-200"
                >
                  {expandedCategories[cat] ? "▼" : "▶"} {cat}
                </button>
                {expandedCategories[cat] && list.map(item => {
                  const avail = item.stock - (selected[item.id] || 0);
                  return (
                    <div key={item.id} className="flex gap-4 border-b border-gray-700 bg-gray-900 text-white p-4">
                      <div className="w-24">
                        <img
                          src={item.images?.[0]}
                          alt={item.label}
                          className="w-full h-24 object-cover rounded border"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-white">{item.label}</p>
                        <p className="text-sm text-gray-300">{item.brand} {item.model}</p>
                        <p className="text-sm text-white mt-1">
                          在庫：{avail}/{item.quantity || 0}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => decrementQty(item.id)}
                            className="bg-gray-700 text-white px-2 rounded"
                            disabled={selected[item.id] <= 0}
                          >−</button>
                          <span className="w-8 text-center">{selected[item.id] || 0}</span>
                          <button
                            type="button"
                            onClick={() => incrementQty(item.id, avail)}
                            className="bg-gray-700 text-white px-2 rounded"
                            disabled={avail <= 0}
                          >＋</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </form>
        </div>

        {/* 已選清單浮動面板 */}
        {!showConfirm && selectedItems.length > 0 && (
          <div className="fixed top-20 right-4 bg-gray-900/10 backdrop-blur-md border border-white/20 rounded-lg shadow-xl p-4 inline-block text-white z-50">
            <h2 className="font-bold mb-2">已選器材</h2>
            <ul className="max-h-64 overflow-y-auto text-sm space-y-2">
              {selectedItems.map(it => (
                <li key={it.id} className="flex items-center justify-between gap-2">
                  <img
                    src={it.images?.[0]}
                    alt={it.label}
                    className="w-10 h-10 object-cover rounded border"
                  />
                  <span className="flex-1 text-left text-xs truncate">{it.label}</span>
                  <span className="text-xs">× {selected[it.id]}</span>
                  <button onClick={() => removeItem(it.id)} className="text-red-400 hover:text-red-600 text-xs ml-2">
                    刪除
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={() => setSelected({})}
                className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm px-3 py-1 rounded"
              >
                重置
              </button>
              <button onClick={() => navigate("/")} className="bg-gray-600 hover:bg-gray-700 text-white text-sm px-3 py-1 rounded">
                取消
              </button>
              <button onClick={handleInitialSubmit} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded">
                送出
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

export default MultiBorrowForm;
