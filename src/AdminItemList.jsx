// AdminItemList.jsx
import React, { useEffect, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import NewItemForm from "./NewItemForm";
import Navbar from "./Navbar";
import CategorySection from "./CategorySection";
import Footer from "./Footer";

function AdminItemList() {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  const categoryOrder = [
    "EG",
    "AG",
    "Nylon GT",
    "Others Strings",
    "Keys",
    "Synthesizer",
  ];

  useEffect(() => {
    const fetchData = async () => {
      const [itemSnap, borrowSnap, returnSnap] = await Promise.all([
        getDocs(collection(db, "items")),
        getDocs(collection(db, "borrowRequests")),
        getDocs(collection(db, "returnRecords")),
      ]);

      const borrowedCount = {};
      borrowSnap.docs.forEach(doc => {
        const { itemId } = doc.data();
        borrowedCount[itemId] = (borrowedCount[itemId] || 0) + 1;
      });

      returnSnap.docs.forEach(doc => {
        const { itemId } = doc.data();
        borrowedCount[itemId] = (borrowedCount[itemId] || 0) - 1;
      });

      const itemList = itemSnap.docs.map((doc) => {
        const data = doc.data();
        const borrowed = borrowedCount[doc.id] || 0;
        const stock = Math.max((data.quantity || 0) - borrowed, 0);
        return { id: doc.id, ...data, stock };
      });

      setItems(itemList);

      const expanded = {};
      itemList.forEach((item) => {
        expanded[item.category] = true;
      });
      setExpandedCategories(expanded);
    };

    fetchData();
  }, []);

  const handleDelete = async (item) => {
    const ok = window.confirm(`確定要刪除「${item.label}」嗎？`);
    if (!ok) return;
    await deleteDoc(doc(db, "items", item.id));
  };

  const handleEdit = (item) => {
    window.location.href = `/admin/items/edit/${item.id}`;
  };

  const toggleCategory = (cat) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  const filterItem = (item) => {
    const target = `${item.label} ${item.category} ${item.brand} ${item.model} ${item.class} ${item.remarksA} ${item.remarksB}`.toLowerCase();
    return target.includes(searchTerm.toLowerCase());
  };

  const filtered = items.filter(filterItem);

  const grouped = filtered.reduce((acc, item) => {
    const cat = item.category || "未分類";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const sortedGroupedEntries = Object.entries(grouped).sort(([a], [b]) => {
    const aIndex = categoryOrder.indexOf(a);
    const bIndex = categoryOrder.indexOf(b);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Navbar />
      <main className="pt-20 px-4 max-w-6xl mx-auto pb-24">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
          <h1 className="text-2xl font-bold">器材管理</h1>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="bg-black text-white border border-gray-600 hover:bg-gray-700 px-4 py-2 rounded shadow"
            >
              新增器材
            </button>
            <button
              onClick={() => (window.location.href = "/admin/bulk-add")}
              className="bg-black text-white border border-gray-600 hover:bg-gray-700 px-4 py-2 rounded shadow"
            >
              批次新增
            </button>
            <button
              onClick={() => (window.location.href = "/admin/bulk-edit")}
              className="bg-black text-white border border-gray-600 hover:bg-gray-700 px-4 py-2 rounded shadow"
            >
              批次編輯
            </button>
          </div>
        </div>

        <button
          onClick={() => (window.location.href = "/admin")}
          className="mb-6 text-gray-300 hover:text-white hover:underline"
        >
          ← 返回上一層
        </button>

        <input
          type="text"
          placeholder="搜尋器材名稱、分類、品牌..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full mb-6 px-4 py-2 border border-gray-600 rounded bg-gray-800 text-white placeholder-gray-400"
        />

        {sortedGroupedEntries.map(([cat, list]) => (
          <CategorySection
            key={cat}
            category={cat}
            items={list}
            expanded={expandedCategories[cat]}
            onToggle={() => toggleCategory(cat)}
            isAdmin
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-900 text-white p-6 rounded-xl shadow-lg w-full max-w-3xl">
              <NewItemForm
                onClose={() => setShowModal(false)}
                onSuccess={() => setShowModal(false)}
              />
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default AdminItemList;
