// AdminPage.jsx（請直接覆蓋整份使用）
import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs, query } from "firebase/firestore";
import Navbar from "./Navbar";
import { useNavigate } from "react-router-dom";
import Footer from "./Footer";

function AdminPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState([]);
  const [details, setDetails] = useState([]);
  const [view, setView] = useState("summary");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortDesc, setSortDesc] = useState(true);
  const [itemsMeta, setItemsMeta] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const [itemSnap, borrowSnap, returnSnap] = await Promise.all([
        getDocs(collection(db, "items")),
        getDocs(query(collection(db, "borrowRequests"))),
        getDocs(query(collection(db, "returnRecords"))),
      ]);

      const itemMap = {};
      itemSnap.docs.forEach((doc) => {
        itemMap[doc.id] = doc.data();
      });
      setItemsMeta(itemMap);

      const summaryMap = {};

      borrowSnap.docs.forEach((doc) => {
        const { itemId, borrower, itemName, timestamp, items } = doc.data();
        const quantity = itemMap[itemId]?.quantity || 0;
        if (!summaryMap[itemId]) {
          summaryMap[itemId] = {
            itemName,
            borrowed: 0,
            returned: 0,
            latestBorrowTimestamp: timestamp,
            latestBorrower: borrower,
          };
        }
        const total = items?.reduce((sum, i) => sum + (i.quantity || 1), 0) || 1;
        summaryMap[itemId].borrowed += total;
        if (!summaryMap[itemId].latestBorrowTimestamp || (timestamp?.seconds || 0) > (summaryMap[itemId].latestBorrowTimestamp?.seconds || 0)) {
          summaryMap[itemId].latestBorrowTimestamp = timestamp;
          summaryMap[itemId].latestBorrower = borrower;
        }
      });

      returnSnap.docs.forEach((doc) => {
        const data = doc.data();
        const list = Array.isArray(data.items)
          ? data.items
          : [{ itemId: data.itemId, quantity: 1 }];
        list.forEach((item) => {
          const id = item.itemId;
          if (!summaryMap[id]) {
            summaryMap[id] = {
              itemName: itemMap[id]?.label || "",
              borrowed: 0,
              returned: 0,
              latestBorrowTimestamp: null,
              latestBorrower: "",
            };
          }
          summaryMap[id].returned += item.quantity || 1;
        });
      });

      const summaryList = Object.entries(summaryMap).map(([id, item]) => {
        const quantity = itemMap[id]?.quantity || 0;
        const borrowed = Math.min(item.borrowed, quantity);
        const returned = Math.min(item.returned, quantity);
        const pending = Math.max(0, Math.min(borrowed - returned, quantity));
        return {
          ...item,
          borrowed,
          returned,
          pending,
        };
      });

      summaryList.sort((a, b) => {
        if ((a.pending > 0) !== (b.pending > 0)) return a.pending > 0 ? -1 : 1;
        const aTime = a.latestBorrowTimestamp?.seconds || 0;
        const bTime = b.latestBorrowTimestamp?.seconds || 0;
        return bTime - aTime;
      });

      const borrowData = borrowSnap.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
        type: "出借",
      }));

      const returnData = returnSnap.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
        type: "歸還",
      }));

      const allDetails = [...borrowData, ...returnData];
      const grouped = {};

      allDetails.forEach((d) => {
        const key = `${d.timestamp?.seconds}|${d.type}|${d.borrower}|${d.phone}|${d.note || ""}`;
        if (!grouped[key]) {
          grouped[key] = {
            timestamp: d.timestamp,
            type: d.type,
            borrower: d.borrower,
            phone: d.phone,
            note: d.note,
            items: {},
          };
        }

        const items = d.items || [{ label: d.itemName, itemId: d.itemId, quantity: 1 }];
        items.forEach((item) => {
          const id = item.itemId;
          const label = item.label || itemMap[id]?.label || "";
          const category = itemMap[id]?.category || "";
          if (!grouped[key].items[label]) {
            grouped[key].items[label] = { count: 0, category };
          }
          grouped[key].items[label].count += item.quantity || 1;
        });
      });

      const catPriority = { EG: 1, AG: 2, Microphone: 3 };
      const groupedDetails = Object.values(grouped).map((d) => ({
        ...d,
        items: Object.fromEntries(
          Object.entries(d.items)
            .sort(([, a], [, b]) => {
              const pa = catPriority[a.category] || 99;
              const pb = catPriority[b.category] || 99;
              if (pa !== pb) return pa - pb;
              if (a.category !== b.category) return a.category.localeCompare(b.category, "en");
              return a.label?.localeCompare?.(b.label, "en");
            })
            .map(([label, v]) => [label, v.count])
        ),
      }));

      groupedDetails.sort((a, b) => {
        const aTime = a.timestamp?.seconds || 0;
        const bTime = b.timestamp?.seconds || 0;
        return sortDesc ? bTime - aTime : aTime - bTime;
      });

      setSummary(summaryList);
      setDetails(groupedDetails);
      setLoading(false);
    };

    fetchData();
  }, [sortDesc]);

  const formatTime = (ts) => {
    if (!ts || !ts.toDate) return "";
    const date = ts.toDate();
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  const handleSwitchView = (mode) => {
    setView(mode);
    if (mode === "summary") setSearchTerm("");
  };

  const toggleSort = () => setSortDesc((prev) => !prev);

  const filteredDetails = details.filter((d) => {
    const keyword = searchTerm.toLowerCase();
    return (
      d.borrower?.toLowerCase().includes(keyword) ||
      d.phone?.toLowerCase().includes(keyword) ||
      d.note?.toLowerCase().includes(keyword) ||
      Object.keys(d.items || {}).some((label) => label.toLowerCase().includes(keyword))
    );
  });

  return (
    <>
      <Navbar />
      <main className="pt-16 px-2 sm:px-4 w-full max-w-[90rem] mx-auto bg-black min-h-screen">
        <div className="p-6 text-white font-mono">
          <h1 className="text-2xl font-bold mb-4">管理員後台</h1>
          <div className="mb-4 flex flex-col sm:flex-row gap-2 sm:gap-4">
            <button onClick={() => handleSwitchView("summary")} className={`px-4 py-2 rounded ${view === "summary" ? "bg-blue-600 text-white" : "bg-black text-white border border-gray-600 hover:bg-gray-700"}`}>
              總覽模式
            </button>
            <button onClick={() => handleSwitchView("details")} className={`px-4 py-2 rounded ${view === "details" ? "bg-blue-600 text-white" : "bg-black text-white border border-gray-600 hover:bg-gray-700"}`}>
              詳細模式
            </button>
            <button onClick={() => navigate("/admin/items")} className="bg-black text-white border border-gray-600 hover:bg-gray-700 px-4 py-2 rounded">
              編輯器材內容
            </button>
          </div>

          {view === "details" && (
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="🔍 搜尋器材 / 姓名 / 電話 / 備註" className="border border-gray-600 p-2 rounded w-full sm:w-80 bg-gray-800 text-white placeholder-gray-400" />
              <button onClick={toggleSort} className="bg-black text-white border border-gray-600 hover:bg-gray-700 px-4 py-2 rounded">
                依時間排序：{sortDesc ? "新 → 舊" : "舊 → 新"}
              </button>
            </div>
          )}

          {loading ? (
            <p className="text-gray-400">讀取中...</p>
          ) : view === "summary" ? (
            <div className="space-y-4">
              {summary.map((item, idx) => (
                <div key={idx} className="border border-gray-700 p-4 rounded bg-gray-800">
                  <p className="font-semibold text-lg">{item.itemName}</p>
                  {item.latestBorrower && <p className="text-sm text-gray-300">最近借用者：{item.latestBorrower}</p>}
                  <p className="text-sm text-gray-400">出借：{item.borrowed} ｜ 歸還：{item.returned}</p>
                  <p className="text-sm font-medium mt-1">
                    狀態：{item.pending <= 0 ? <span className="text-green-400">全部歸還</span> : <span className="text-red-400">尚有 {item.pending} 筆未歸還</span>}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDetails.map((d, i) => (
                <div key={i} className="flex border border-gray-700 rounded bg-[#111]">
                  <div className={`w-16 sm:w-20 text-center py-4 text-sm sm:text-base text-white ${d.type === "出借" ? "bg-green-900/30" : "bg-blue-900/30"}`}>{d.type}</div>
                  <div className="flex-1 p-4 text-sm sm:text-base">
                    <div className="text-xs text-gray-400 mb-1">{formatTime(d.timestamp)}</div>
                    <div className="flex justify-between items-center flex-wrap gap-x-4">
                      <span className="text-white font-medium text-base sm:text-lg">{d.borrower}</span>
                      <span className="text-gray-300 text-sm sm:text-base">{d.phone}</span>
                    </div>
                    <ul className="text-white mb-2 mt-2">
                      {Object.entries(d.items).map(([label, count], idx) => (
                        <li key={idx}>- {label} x{count}</li>
                      ))}
                    </ul>
                    {d.note && <div className="text-gray-300 text-sm">備註：{d.note}</div>}
                  </div>
                </div>
              ))}
              {filteredDetails.length === 0 && <p className="text-center text-gray-400 mt-4">查無符合資料</p>}
            </div>
          )}

          <Footer />
        </div>
      </main>
    </>
  );
}

export default AdminPage;
