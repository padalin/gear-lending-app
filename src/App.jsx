// App.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import Navbar from "./Navbar";
import CategorySection from "./CategorySection";
import Footer from "./Footer";

function App() {
  const [items, setItems] = useState([]);
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
    const preventDefaults = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      window.addEventListener(eventName, preventDefaults, false);
    });

    return () => {
      ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
        window.removeEventListener(eventName, preventDefaults, false);
      });
    };
  }, []);

  useEffect(() => {
    const fetchWithStock = async () => {
      const [itemSnap, borrowSnap, returnSnap] = await Promise.all([
        getDocs(collection(db, "items")),
        getDocs(collection(db, "borrowRequests")),
        getDocs(collection(db, "returnRecords")),
      ]);

      const borrowCount = {};
      borrowSnap.forEach((doc) => {
        const data = doc.data();
        borrowCount[data.itemId] = (borrowCount[data.itemId] || 0) + 1;
      });

      returnSnap.forEach((doc) => {
        const data = doc.data();
        borrowCount[data.itemId] = (borrowCount[data.itemId] || 0) - 1;
      });

      const itemsWithStock = itemSnap.docs.map((doc) => {
        const data = doc.data();
        const borrowed = borrowCount[doc.id] || 0;
        const instock = Math.max((data.quantity || 0) - borrowed, 0);
        return { id: doc.id, ...data, stock: instock };
      });

      setItems(itemsWithStock);

      const defaultExpanded = {};
      itemsWithStock.forEach((item) => {
        defaultExpanded[item.category] = true;
      });
      setExpandedCategories(defaultExpanded);
    };

    fetchWithStock();
  }, []);

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
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <Navbar />
      <main className="pt-20 px-4 max-w-6xl mx-auto pb-24">
        <h1 className="text-2xl font-bold mb-4">Gear List</h1>

        <div className="flex gap-4 mb-6 flex-wrap">
          <Link
            to="/borrow"
            className="bg-black text-white border border-gray-600 hover:bg-gray-700 px-4 py-2 rounded shadow"
          >
            借器材
          </Link>
          <Link
            to="/return"
            className="bg-black text-white border border-gray-600 hover:bg-gray-700 px-4 py-2 rounded shadow"
          >
            還器材
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <input
            type="text"
            placeholder="搜尋器材名稱、分類、品牌..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:max-w-xs px-4 py-2 border border-gray-600 rounded bg-gray-800 text-white placeholder-gray-400"
          />
        </div>

        {sortedGroupedEntries.map(([cat, list]) => (
          <CategorySection
            key={cat}
            category={cat}
            items={list}
            expanded={expandedCategories[cat]}
            onToggle={() => toggleCategory(cat)}
          />
        ))}
      </main>
      <Footer />
    </div>
  );
}

export default App;
