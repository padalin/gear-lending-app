// MultiReturnForm.jsx
import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
} from "firebase/firestore";
import Navbar from "./Navbar";
import { useNavigate } from "react-router-dom";
import Footer from "./Footer";

function MultiReturnForm() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [borrowCounts, setBorrowCounts] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  const categoryOrder = [
    "EG", "AG", "Nylon GT", "Others Strings", "Keys", "Synthesizer"
  ];

  useEffect(() => {
    const fetchItems = async () => {
      const itemSnap = await getDocs(collection(db, "items"));
      const itemList = itemSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setItems(itemList);
      const expanded = {};
      itemList.forEach((item) => {
        expanded[item.category] = true;
      });
      setExpandedCategories(expanded);
    };
    fetchItems();
  }, []);

  useEffect(() => {
    const lookup = async () => {
      setError("");
      if (!name.trim() && !phone.trim()) {
        setBorrowCounts({});
        return;
      }
  
      try {
        let borrowQuery;
        let returnQuery;
  
        if (name.trim() && phone.trim()) {
          // ✅ 同時比對 borrower 和 phone（嚴格比對）
          borrowQuery = query(
            collection(db, "borrowRequests"),
            where("borrower", "==", name),
            where("phone", "==", phone)
          );
          returnQuery = query(
            collection(db, "returnRecords"),
            where("borrower", "==", name),
            where("phone", "==", phone)
          );
        } else if (name.trim()) {
          borrowQuery = query(collection(db, "borrowRequests"), where("borrower", "==", name));
          returnQuery = query(collection(db, "returnRecords"), where("borrower", "==", name));
        } else if (phone.trim()) {
          borrowQuery = query(collection(db, "borrowRequests"), where("phone", "==", phone));
          returnQuery = query(collection(db, "returnRecords"), where("phone", "==", phone));
        }
  
        const [borrowSnap, returnSnap] = await Promise.all([
          getDocs(borrowQuery),
          getDocs(returnQuery),
        ]);
  
        const borrowMap = {};
  
        borrowSnap.docs.forEach((doc) => {
          const data = doc.data();
          borrowMap[data.itemId] = (borrowMap[data.itemId] || 0) + 1;
        });
  
        returnSnap.docs.forEach((doc) => {
          const data = doc.data();
          borrowMap[data.itemId] = (borrowMap[data.itemId] || 0) - 1;
        });
  
        setBorrowCounts(borrowMap);
      } catch (err) {
        console.error("查詢錯誤：", err);
        setError("查詢過程中發生錯誤，請稍後再試");
      }
    };
  
    lookup();
  }, [name, phone]);
  

  const groupedItems = items.reduce((acc, item) => {
    if (borrowCounts[item.id] > 0) {
      const cat = item.category || "未分類";
      acc[cat] = acc[cat] || [];
      acc[cat].push(item);
    }
    return acc;
  }, {});

  const sortedGroupEntries = Object.entries(groupedItems).sort(([a], [b]) => {
    const aIndex = categoryOrder.indexOf(a);
    const bIndex = categoryOrder.indexOf(b);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });

  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const incrementQty = (id, max) => {
    setSelected((prev) => ({
      ...prev,
      [id]: Math.min((prev[id] || 0) + 1, max),
    }));
  };

  const decrementQty = (id) => {
    setSelected((prev) => ({
      ...prev,
      [id]: Math.max((prev[id] || 0) - 1, 0),
    }));
  };

  const selectedItems = items.filter((item) => selected[item.id] > 0);

  const handleInitialSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !phone.trim()) {
      setError("請填寫姓名與電話");
      return;
    }

    if (selectedItems.length === 0) {
      setError("請選擇要歸還的項目");
      return;
    }

    for (const item of selectedItems) {
      const qty = selected[item.id];
      const available = borrowCounts[item.id] || 0;
      if (qty > available) {
        setError(`${item.label} 最多可歸還 ${available} 筆`);
        return;
      }
    }

    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    try {
      for (const item of selectedItems) {
        const qty = selected[item.id] || 0;
        for (let i = 0; i < qty; i++) {
          await addDoc(collection(db, "returnRecords"), {
            itemId: item.id,
            itemName: item.label,
            borrower: name,
            phone,
            note,
            timestamp: new Date(),
          });
        }
      }
      navigate("/success");
    } catch (err) {
      console.error("送出失敗", err);
      setError("送出失敗，請稍後再試");
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <>
        <Navbar />
        <div className="max-w-2xl mx-auto p-6 text-white">
          <h2 className="text-xl font-bold mb-4">確認歸還資訊</h2>
          <div className="bg-gray-800 p-4 rounded mb-4">
            <p><strong>姓名：</strong>{name}</p>
            <p><strong>電話：</strong>{phone}</p>
            {note && <p><strong>備註：</strong>{note}</p>}
          </div>
          <div className="bg-gray-700 p-4 rounded mb-4">
            <p className="font-semibold mb-2">歸還項目：</p>
            <ul className="space-y-2">
              {selectedItems.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <img
                    src={item.images?.[0]}
                    alt={item.label}
                    className="w-16 h-16 object-cover rounded border border-gray-600"
                  />
                  <span>{item.label} × {selected[item.id]}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setShowConfirm(false)}
              className="bg-gray-500 hover:bg-gray-600 px-4 py-2 rounded text-white"
            >取消返回</button>
            <button
              onClick={handleConfirmSubmit}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white"
            >確認送出</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="pt-16 px-4 max-w-6xl mx-auto">
        <div className="max-w-3xl mx-auto p-6 text-white">
          <h1 className="text-2xl font-bold mb-4">還器材</h1>

          {error && (
            <p className="text-red-500 mb-4 border border-red-500 p-2 rounded bg-red-900/20">
              {error}
            </p>
          )}

          <form onSubmit={handleInitialSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block font-medium text-white">借用人姓名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-gray-800 border border-gray-600 p-2 w-full rounded text-white placeholder-gray-400"
                placeholder="請輸入姓名；需與借出時一致。 "
              />
            </div>

            <div className="space-y-2">
              <label className="block font-medium text-white">聯絡電話</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-gray-800 border border-gray-600 p-2 w-full rounded text-white placeholder-gray-400"
                placeholder="例如：0912345678；需與借出時一致。"
              />
            </div>

            <div className="space-y-2">
              <label className="block font-medium text-white">備註（選填）</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="bg-gray-800 border border-gray-600 p-2 w-full rounded text-white placeholder-gray-400"
                placeholder="可填寫代還說明或其他備註"
              />
            </div>

            <hr className="my-4 border-gray-700" />

            {sortedGroupEntries.map(([cat, list]) => (
              <div key={cat} className="mb-0">
                <button
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className="w-full text-left font-mono font-bold text-lg py-1 px-1 bg-gray-800 text-white rounded hover:bg-gray-700 mb-2 border border-white/10"
                >
                  {expandedCategories[cat] ? "▼" : "▶"} {cat}
                </button>

                {expandedCategories[cat] &&
                  list.map((item) => {
                    const available = borrowCounts[item.id] || 0;
                    return (
                      <div
                        key={item.id}
                        className="flex gap-4 border-b border-gray-700 bg-gray-900 text-white p-4"
                      >
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
                          <p className="text-sm text-white mt-1">可歸還數量：{available}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => decrementQty(item.id)}
                              className="bg-gray-700 text-white px-2 rounded"
                            >−</button>
                            <span className="w-8 text-center">{selected[item.id] || 0}</span>
                            <button
                              type="button"
                              onClick={() => incrementQty(item.id, available)}
                              className="bg-gray-700 text-white px-2 rounded"
                            >＋</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ))}

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="bg-gray-500 hover:bg-gray-600 px-4 py-2 rounded text-white"
              >取消</button>
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded text-white"
              >送出歸還紀錄</button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default MultiReturnForm;
