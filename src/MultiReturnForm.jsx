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

  const categoryOrder = ["EG", "AG", "Nylon GT", "Others Strings", "Keys", "Synthesizer"];

  useEffect(() => {
    const fetchItems = async () => {
      const itemSnap = await getDocs(collection(db, "items"));
      const itemList = itemSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setItems(itemList);
      const expanded = {};
      itemList.forEach((item) => { expanded[item.category] = true; });
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
          borrowQuery = query(collection(db, "borrowRequests"), where("borrower", "==", name), where("phone", "==", phone));
          returnQuery = query(collection(db, "returnRecords"), where("borrower", "==", name), where("phone", "==", phone));
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
          if (data.items && Array.isArray(data.items)) {
            data.items.forEach((item) => {
              borrowMap[item.itemId] = (borrowMap[item.itemId] || 0) - (item.quantity || 1);
            });
          } else {
            borrowMap[data.itemId] = (borrowMap[data.itemId] || 0) - 1;
          }
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
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const incrementQty = (id, max) => {
    setSelected((prev) => ({ ...prev, [id]: Math.min((prev[id] || 0) + 1, max) }));
  };

  const decrementQty = (id) => {
    setSelected((prev) => ({ ...prev, [id]: Math.max((prev[id] || 0) - 1, 0) }));
  };

  const selectedItems = items.filter((item) => selected[item.id] > 0);

  const handleSelectAll = () => {
    const allSelected = {};
    Object.entries(borrowCounts).forEach(([id, count]) => {
      if (count > 0) {
        allSelected[id] = count;
      }
    });
    setSelected(allSelected);
  };

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
      const payload = {
        borrower: name,
        phone,
        note,
        timestamp: new Date(),
        items: selectedItems.map((it) => ({
          itemId: it.id,
          itemName: it.label,
          label: it.label,
          quantity: selected[it.id]
        }))
      };

      await addDoc(collection(db, "returnRecords"), payload);
      navigate("/success");
    } catch (err) {
      console.error("送出失敗", err);
      setError("送出失敗，請稍後再試");
      setShowConfirm(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="pt-16 px-4 max-w-6xl mx-auto">
        <div className="max-w-3xl mx-auto p-6 text-white">
          <h1 className="text-2xl font-bold mb-4">還器材</h1>
          {error && (
            <p className="text-red-500 mb-4 border border-red-500 p-2 rounded bg-red-900/20">{error}</p>
          )}
          {showConfirm ? (
            <div className="p-4 border border-yellow-700 bg-black text-white rounded mt-6">
              <p className="text-lg font-semibold mb-2">你確定要送出這些歸還資料嗎？</p>
              <p>借用人：{name}</p>
              <p>電話：{phone}</p>
              <p>備註：{note || "（無）"}</p>
              <p className="mt-2 font-semibold">歸還器材：</p>
              <ul className="space-y-2 mt-2">
                {selectedItems.map(item => (
                  <li key={item.id} className="flex gap-3 items-center">
                    <img
                      src={item.images?.[0]}
                      alt={item.label}
                      className="w-16 h-16 object-cover rounded border border-white"
                    />
                    <span>{item.label} × {selected[item.id]}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-end gap-2 mt-3">
                <button
                  className="bg-gray-600 hover:bg-gray-700 text-white text-sm px-3 py-1 rounded"
                  onClick={() => setShowConfirm(false)}
                >取消</button>
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded"
                  onClick={handleConfirmSubmit}
                >送出</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleInitialSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block font-medium text-white">借用人姓名</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="bg-gray-800 border border-gray-600 p-2 w-full rounded text-white placeholder-gray-400" placeholder="請輸入姓名；需與借出時一致。 " />
              </div>
              <div className="space-y-2">
                <label className="block font-medium text-white">聯絡電話</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="bg-gray-800 border border-gray-600 p-2 w-full rounded text-white placeholder-gray-400" placeholder="例如：0912345678；需與借出時一致。" />
              </div>
              <div className="space-y-2">
                <label className="block font-medium text-white">備註（選填）</label>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} className="bg-gray-800 border border-gray-600 p-2 w-full rounded text-white placeholder-gray-400" placeholder="可填寫代還說明或其他備註" />
              </div>

              <div className="flex justify-between gap-3">
                {Object.keys(groupedItems).length > 0 && (
                  <button type="button" onClick={handleSelectAll} className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded">全選</button>
                )}
                <div className="ml-auto flex gap-3">
                  <button type="button" onClick={() => navigate("/")} className="bg-gray-500 hover:bg-gray-600 px-4 py-2 rounded text-white">取消</button>
                  <button type="submit" className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded text-white">送出歸還紀錄</button>
                </div>
              </div>

              <hr className="my-4 border-gray-700" />

              {sortedGroupEntries.length === 0 && (
                <p className="text-white text-center">查無可歸還的器材，請確認姓名與電話是否正確。</p>
              )}

              {sortedGroupEntries.map(([cat, list]) => (
                <div key={cat} className="mb-0">
                  <button type="button" onClick={() => toggleCategory(cat)} className="w-full text-left font-mono font-bold text-lg py-1 px-1 bg-gray-800 text-white rounded hover:bg-gray-700 mb-2 border border-white/10">
                    {expandedCategories[cat] ? "▼" : "▶"} {cat}
                  </button>
                  {expandedCategories[cat] && list.map((item) => {
                    const available = borrowCounts[item.id] || 0;
                    return (
                      <div key={item.id} className="flex gap-4 border-b border-gray-700 bg-gray-900 text-white p-4">
                        <div className="w-24">
                          <img src={item.images?.[0]} alt={item.label} className="w-full h-24 object-cover rounded border" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-white">{item.label}</p>
                          <p className="text-sm text-gray-300">{item.brand} {item.model}</p>
                          <p className="text-sm text-white mt-1">可歸還數量：{available}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <button type="button" onClick={() => decrementQty(item.id)} className="bg-gray-700 text-white px-2 rounded">−</button>
                            <span className="w-8 text-center">{selected[item.id] || 0}</span>
                            <button type="button" onClick={() => incrementQty(item.id, available)} className="bg-gray-700 text-white px-2 rounded">＋</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default MultiReturnForm;