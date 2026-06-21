import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import Navbar from "./Navbar";
import CategorySection from "./CategorySection";
import Footer from "./Footer";

function App() {
  const [items, setItems] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState(() => {
    try { return localStorage.getItem("gearView") || "grid"; } catch (_) { return "grid"; }
  });
  const changeView = (v) => {
    setView(v);
    try { localStorage.setItem("gearView", v); } catch (_) {}
  };

  const categoryOrder = [
    "EG",
    "AG",
    "Nylon GT",
    "Others Strings",
    "Keys",
    "Synthesizer",
  ];

  useEffect(() => {
    const fetchWithStock = async () => {
      const [itemSnap, borrowSnap, returnSnap] = await Promise.all([
        getDocs(collection(db, "items")),
        getDocs(collection(db, "borrowRequests")),
        getDocs(collection(db, "returnRecords")),
      ]);

      const borrowMap = {};
      borrowSnap.docs.forEach((doc) => {
        const { itemId } = doc.data();
        borrowMap[itemId] = (borrowMap[itemId] || 0) + 1;
      });

      returnSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (Array.isArray(data.items)) {
          data.items.forEach((item) => {
            borrowMap[item.itemId] = (borrowMap[item.itemId] || 0) - (item.quantity || 1);
          });
        } else {
          borrowMap[data.itemId] = (borrowMap[data.itemId] || 0) - 1;
        }
      });

      const itemsWithStock = itemSnap.docs.map((doc) => {
        const data = doc.data();
        const id = doc.id;
        const total = data.quantity || 0;
        const borrowed = borrowMap[id] || 0;
        const stock = Math.max(total - borrowed, 0);
        return { id, ...data, stock };
      });

      setItems(itemsWithStock);

      const expanded = {};
      itemsWithStock.forEach((item) => {
        expanded[item.category] = true;
      });
      setExpandedCategories(expanded);
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
    const target = `${item.label || ""} ${item.category || ""} ${item.brand || ""} ${item.model || ""} ${item.class || ""} ${item.locate || ""} ${item.remarksA || ""} ${item.remarksB || ""}`.toLowerCase();
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
        <div className="flex items-center justify-between gap-3 mb-3">
          <h1 className="text-xl font-bold">Gear List</h1>
          <div className="flex gap-2 flex-shrink-0">
            <Link to="/borrow" className="bg-black text-white border border-gray-600 hover:bg-gray-700 px-3 py-1.5 text-sm rounded">借器材</Link>
            <Link to="/return" className="bg-black text-white border border-gray-600 hover:bg-gray-700 px-3 py-1.5 text-sm rounded">還器材</Link>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            placeholder="搜尋器材…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-600 rounded bg-gray-800 text-white placeholder-gray-400"
          />
          <div className="inline-flex flex-shrink-0 border border-gray-600 rounded overflow-hidden">
            <button
              onClick={() => changeView("list")}
              className={`px-3 py-2 text-sm ${view === "list" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
            >
              列表
            </button>
            <button
              onClick={() => changeView("grid")}
              className={`px-3 py-2 text-sm ${view === "grid" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
            >
              大圖
            </button>
          </div>
        </div>

        {sortedGroupedEntries.map(([cat, list]) => (
          <CategorySection
            key={cat}
            category={cat}
            items={list}
            expanded={expandedCategories[cat]}
            onToggle={() => toggleCategory(cat)}
            view={view}
          />
        ))}
      </main>
      <Footer />
    </div>
  );
}

export default App;
