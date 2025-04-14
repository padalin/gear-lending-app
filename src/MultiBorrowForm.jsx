// MultiBorrowForm.jsx
import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useNavigate } from "react-router-dom";

function MultiBorrowForm() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const categoryOrder = ["EG", "AG", "Nylon GT", "Others Strings", "Keys", "Synthesizer"];

  useEffect(() => {
    const fetchItems = async () => {
      const [itemSnap, borrowSnap, returnSnap] = await Promise.all([
        getDocs(collection(db, "items")),
        getDocs(collection(db, "borrowRequests")),
        getDocs(collection(db, "returnRecords"))
      ]);
  
      const borrowMap = {};
      const returnMap = {};
  
      borrowSnap.docs.forEach(doc => {
        const { itemId } = doc.data();
        if (itemId) {
          borrowMap[itemId] = (borrowMap[itemId] || 0) + 1;
        }
      });
  
      returnSnap.docs.forEach(doc => {
        const { itemId } = doc.data();
        if (itemId) {
          returnMap[itemId] = (returnMap[itemId] || 0) + 1;
        }
      });
  
      const itemList = itemSnap.docs.map(doc => {
        const data = doc.data();
        const id = doc.id;
        const total = data.quantity || 0;
        const borrowed = (borrowMap[id] || 0) - (returnMap[id] || 0);
        const stock = Math.max(total - borrowed, 0);
        return { id, ...data, stock };
      });
  
      setItems(itemList);
  
      const expanded = {};
      itemList.forEach(item => {
        expanded[item.category] = true;
      });
      setExpandedCategories(expanded);
      
      console.log("BORROW:", borrowMap);
      console.log("RETURN:", returnMap);

      console.log("ITEMS:", itemSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    };
  
    fetchItems();
  }, []);
  

  const groupedItems = items.reduce((acc, item) => {
    const cat = item.category || "未分類";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const filterItem = item => {
    const text = `${item.label} ${item.brand} ${item.model}`.toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  };

  const sortedGroupEntries = Object.entries(groupedItems)
    .map(([cat, list]) => [cat, list.filter(filterItem)])
    .filter(([_, filteredList]) => filteredList.length > 0)
    .sort(([a], [b]) => {
      const aIndex = categoryOrder.indexOf(a);
      const bIndex = categoryOrder.indexOf(b);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

  const selectedItems = items.filter(item => selected[item.id] > 0);

  const incrementQty = (id, max) => {
    setSelected(prev => ({
      ...prev,
      [id]: Math.min((prev[id] || 0) + 1, max),
    }));
  };

  const decrementQty = id => {
    setSelected(prev => ({
      ...prev,
      [id]: Math.max((prev[id] || 0) - 1, 0),
    }));
  };

  const handleInitialSubmit = e => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !phone.trim()) {
      setError("請填寫所有欄位");
      return;
    }

    if (!/^09\d{8}$/.test(phone)) {
      setError("請輸入正確的台灣手機號碼（09 開頭 + 8 碼）");
      return;
    }

    if (selectedItems.length === 0) {
      setError("請至少選擇一項器材並指定數量");
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    try {
      for (const item of selectedItems) {
        const qty = selected[item.id] || 0;
        for (let i = 0; i < qty; i++) {
          await addDoc(collection(db, "borrowRequests"), {
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
      console.error("送出失敗：", err);
      setError("資料送出失敗，請稍後再試");
      setShowConfirm(false);
    }
  };

  const toggleCategory = cat => {
    setExpandedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  return (
    <>
      <Navbar />
      <main className="pt-16 px-4 max-w-6xl mx-auto">
        <div className="max-w-3xl mx-auto p-6 text-black">
          <h1 className="text-2xl font-bold mb-4 text-white">借器材</h1>

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

            <input
              type="text"
              placeholder="搜尋器材名稱、品牌或型號..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full mb-6 px-4 py-2 border border-blue-400 rounded bg-blue-50 text-black placeholder-gray-500"
            />

            <hr className="my-4 border-gray-700" />

            {sortedGroupEntries.map(([cat, list]) => (
              <div key={cat} className="mb-0">
                <button
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className="w-full text-left font-mono font-bold text-lg py-2 px-4 bg-gray-100 text-black rounded hover:bg-gray-200"
                >
                  {expandedCategories[cat] ? "▼" : "▶"} {cat}
                </button>

                {expandedCategories[cat] &&
                  list.map(item => {
                    const available = typeof item.stock === "number" ? item.stock : 0;
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
                          <p className="text-sm text-white mt-1">在庫：{available}/{item.quantity || 0}</p>
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
                className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded text-white"
              >送出借用</button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default MultiBorrowForm;
