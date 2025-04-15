// AdminPage.jsx
import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import {
  collection,
  getDocs,
  query,
} from "firebase/firestore";
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const [itemSnap, borrowSnap, returnSnap] = await Promise.all([
        getDocs(collection(db, "items")),
        getDocs(query(collection(db, "borrowRequests"))),
        getDocs(query(collection(db, "returnRecords"))),
      ]);

      const validItemIds = new Set(itemSnap.docs.map((doc) => doc.id));

      const borrowData = borrowSnap.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
        type: "出借",
      }));

      const returnData = returnSnap.docs.map((doc) => ({
        ...doc.data(),
        type: "歸還",
      }));

      const summaryMap = {};
      borrowData.forEach((r) => {
        const id = r.itemId;
        if (!validItemIds.has(id)) return;

        if (!summaryMap[id]) {
          summaryMap[id] = {
            itemName: r.itemName,
            borrowed: 0,
            returned: 0,
            latestBorrowTimestamp: r.timestamp,
            latestBorrower: r.borrower,
          };
        }
        summaryMap[id].borrowed += 1;

        if (
          !summaryMap[id].latestBorrowTimestamp ||
          (r.timestamp?.seconds || 0) > (summaryMap[id].latestBorrowTimestamp?.seconds || 0)
        ) {
          summaryMap[id].latestBorrowTimestamp = r.timestamp;
          summaryMap[id].latestBorrower = r.borrower;
        }
      });

      returnData.forEach((r) => {
        const id = r.itemId;
        if (!validItemIds.has(id)) return;
        if (!summaryMap[id]) {
          summaryMap[id] = {
            itemName: r.itemName,
            borrowed: 0,
            returned: 0,
            latestBorrowTimestamp: null,
            latestBorrower: "",
          };
        }
        summaryMap[id].returned += 1;
      });

      const summaryList = Object.values(summaryMap);
      summaryList.sort((a, b) => {
        const aPending = a.borrowed - a.returned > 0;
        const bPending = b.borrowed - b.returned > 0;
        if (aPending !== bPending) return aPending ? -1 : 1;
        const aTime = a.latestBorrowTimestamp?.seconds || 0;
        const bTime = b.latestBorrowTimestamp?.seconds || 0;
        return bTime - aTime;
      });

      const allDetails = [...borrowData, ...returnData];
      setSummary(summaryList);
      setDetails(allDetails);
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

  const toggleSort = () => {
    setSortDesc((prev) => !prev);
  };

  const filteredDetails = details
    .filter((d) => {
      const keyword = searchTerm.toLowerCase();
      return (
        d.itemName?.toLowerCase().includes(keyword) ||
        d.borrower?.toLowerCase().includes(keyword) ||
        d.phone?.toLowerCase().includes(keyword) ||
        d.note?.toLowerCase().includes(keyword)
      );
    })
    .sort((a, b) => {
      const aTime = a.timestamp?.seconds || 0;
      const bTime = b.timestamp?.seconds || 0;
      return sortDesc ? bTime - aTime : aTime - bTime;
    });

  return (
    <>
      <Navbar />
      <main className="pt-16 px-4 max-w-6xl mx-auto"></main>
      <div className="p-6 max-w-6xl mx-auto text-white">
        <h1 className="text-2xl font-bold mb-4">管理員後台</h1>

        <div className="mb-4 flex flex-col sm:flex-row gap-2 sm:gap-4">
          <button
            onClick={() => handleSwitchView("summary")}
            className={`px-4 py-2 rounded ${view === "summary" ? "bg-blue-600 text-white" : "bg-black text-white border border-gray-600 hover:bg-gray-700"}`}
          >
            總覽模式
          </button>
          <button
            onClick={() => handleSwitchView("details")}
            className={`px-4 py-2 rounded ${view === "details" ? "bg-blue-600 text-white" : "bg-black text-white border border-gray-600 hover:bg-gray-700"}`}
          >
            詳細模式
          </button>
          <button
            onClick={() => navigate("/admin/items")}
            className="bg-black text-white border border-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
          >
            編輯器材內容
          </button>
        </div>

        {view === "details" && (
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 搜尋器材 / 姓名 / 電話 / 備註"
              className="border border-gray-600 p-2 rounded w-full sm:w-80 bg-gray-800 text-white placeholder-gray-400"
            />
            <button
              onClick={toggleSort}
              className="bg-black text-white border border-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
            >
              依時間排序：{sortDesc ? "新 → 舊" : "舊 → 新"}
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-gray-400">讀取中...</p>
        ) : view === "summary" ? (
          <div className="space-y-4">
            {summary.map((item, idx) => {
              const pending = item.borrowed - item.returned;
              return (
                <div key={idx} className="border border-gray-700 p-4 rounded shadow-sm bg-gray-800">
                  <p className="font-semibold text-lg">{item.itemName}</p>
                  {item.latestBorrower && (
                    <p className="text-sm text-gray-300">最近借用者：{item.latestBorrower}</p>
                  )}
                  <p className="text-sm text-gray-400">
                    出借：{item.borrowed} ｜ 歸還：{item.returned}
                  </p>
                  <p className="text-sm font-medium mt-1">
                    狀態：
                    {pending <= 0 ? (
                      <span className="text-green-400">全部歸還</span>
                    ) : (
                      <span className="text-red-400">尚有 {pending} 筆未歸還</span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full table-auto border-collapse text-white">
              <thead>
                <tr className="bg-gray-700">
                  <th className="p-2 border border-gray-600">類型</th>
                  <th className="p-2 border border-gray-600">器材名稱</th>
                  <th className="p-2 border border-gray-600">姓名</th>
                  <th className="p-2 border border-gray-600">電話</th>
                  <th className="p-2 border border-gray-600">備註</th>
                  <th className="p-2 border border-gray-600">時間</th>
                </tr>
              </thead>
              <tbody>
                {filteredDetails.map((d, i) => (
                  <tr key={i} className="bg-gray-800 border-t border-gray-700">
                    <td className="p-2 border border-gray-700 text-blue-400">{d.type}</td>
                    <td className="p-2 border border-gray-700">{d.itemName}</td>
                    <td className="p-2 border border-gray-700">{d.borrower}</td>
                    <td className="p-2 border border-gray-700">{d.phone}</td>
                    <td className="p-2 border border-gray-700">{d.note || "-"}</td>
                    <td className="p-2 border border-gray-700">{formatTime(d.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredDetails.length === 0 && (
              <p className="text-center text-gray-400 mt-4">查無符合資料</p>
            )}
          </div>
        )}
        <Footer />
      </div>
    </>
  );
}

export default AdminPage;

