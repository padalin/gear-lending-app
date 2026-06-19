// src/AdminItemList.jsx
import React, { useEffect, useState } from "react";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
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

  // 頁面載入時恢復滾動位置
  useEffect(() => {
    const savedPosition = localStorage.getItem('adminItemsScrollPosition');
    if (savedPosition) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedPosition));
      }, 100);
    }
    
    // 頁面離開前保存滾動位置
    const handleBeforeUnload = () => {
      localStorage.setItem('adminItemsScrollPosition', window.scrollY.toString());
    };
    
    // 監聽頁面點擊事件來保存滾動位置
    const handleClick = (e) => {
      // 如果點擊了連結或按鈕，保存當前滾動位置
      if (e.target.tagName === 'A' || 
          e.target.tagName === 'BUTTON' || 
          e.target.closest('a') || 
          e.target.closest('button')) {
        localStorage.setItem('adminItemsScrollPosition', window.scrollY.toString());
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleClick);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleClick);
    };
  }, []);

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
    try {
      await deleteDoc(doc(db, "items", item.id));
      // 更新項目列表
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch (err) {
      console.error("刪除失敗：", err);
      alert("刪除失敗，請稍後再試");
    }
  };

  const handleEdit = (item) => {
    // 在導航前保存滾動位置
    localStorage.setItem('adminItemsScrollPosition', window.scrollY.toString());
    window.location.href = `/admin/items/edit/${item.id}`;
  };

  const toggleCategory = (cat) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  const filterItem = (item) => {
    const target = `${item.label} ${item.category} ${item.brand} ${item.model} ${item.class} ${item.locate || ""} ${item.remarksA} ${item.remarksB}`.toLowerCase();
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
            {/* 新增：模板管理按鈕 */}
            <button
              onClick={() => {
                localStorage.setItem('adminItemsScrollPosition', window.scrollY.toString());
                window.location.href = "/admin/templates";
              }}
              className="bg-black text-white border border-teal-600 hover:bg-teal-700 px-4 py-2 rounded shadow"
            >
              模板管理
            </button>

            {/* 既有按鈕保留 */}
            <button
              onClick={() => setShowModal(true)}
              className="bg-black text-white border border-gray-600 hover:bg-gray-700 px-4 py-2 rounded shadow"
            >
              新增器材
            </button>
            <button
              onClick={() => {
                localStorage.setItem('adminItemsScrollPosition', window.scrollY.toString());
                window.location.href = "/admin/bulk-add";
              }}
              className="bg-black text-white border border-gray-600 hover:bg-gray-700 px-4 py-2 rounded shadow"
            >
              批次新增
            </button>
            <button
              onClick={() => {
                localStorage.setItem('adminItemsScrollPosition', window.scrollY.toString());
                window.location.href = "/admin/bulk-edit";
              }}
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
          ← 返回管理員後台
        </button>

        <input
          type="text"
          placeholder="搜尋器材名稱、分類、品牌、位置..."
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
          <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-10">
            <div className="bg-gray-900 text-white p-4 sm:p-6 rounded-xl shadow-lg w-full max-w-3xl mx-4 my-auto">
              <NewItemForm
                onClose={() => setShowModal(false)}
                onSuccess={() => {
                  setShowModal(false);
                  // 重新載入資料但保持滾動位置
                  window.location.reload();
                }}
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