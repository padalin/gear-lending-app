// AdminPage.jsx（修復讀取問題）
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
  const [error, setError] = useState(null); // 增加錯誤狀態跟踪
  const [summarySort, setSummarySort] = useState({ key: "borrower", dir: "asc" });

  // 專門處理有數字的項目名稱排序的函數
  const smartSort = (a, b) => {
    try {
      // 安全的字串比較
      if (typeof a !== 'string' || typeof b !== 'string') {
        return 0; // 不可比較的值視為相等
      }
      
      // 分割名稱和數字部分的正則表達式
      const regexPattern = /^(.*?)(\d+)(.*)$/;
      
      const matchA = a.match(regexPattern);
      const matchB = b.match(regexPattern);
      
      // 如果兩個都有數字部分
      if (matchA && matchB) {
        // 首先比較字符串前綴的前幾個字元，以處理類似前綴的情況
        const prefixA = matchA[1].trim();
        const prefixB = matchB[1].trim();
        
        // 提取前綴的前2-3個字元進行比較
        const prefixTypeA = prefixA.substring(0, Math.min(prefixA.length, 3));
        const prefixTypeB = prefixB.substring(0, Math.min(prefixB.length, 3));
        
        if (prefixTypeA === prefixTypeB) {
          // 如果前綴基本相同，那麼按數字大小比較
          const numA = parseInt(matchA[2], 10);
          const numB = parseInt(matchB[2], 10);
          if (numA !== numB) return numA - numB;
          
          // 數字相同時，比較完整前綴
          if (prefixA !== prefixB) return prefixA.localeCompare(prefixB, "zh-TW");
          
          // 最後比較後綴
          return (matchA[3] || "").localeCompare((matchB[3] || ""), "zh-TW");
        }
      }
      
      // 如果上述條件不適用，則進行一般字符串比較
      return a.localeCompare(b, "zh-TW");
    } catch (err) {
      console.error("排序錯誤:", err);
      return 0; // 返回相等以防止排序錯誤
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);  // 重置錯誤狀態

      try {
        console.log("開始讀取資料...");

        const [itemSnap, borrowSnap, returnSnap] = await Promise.all([
          getDocs(collection(db, "items")),
          getDocs(query(collection(db, "borrowRequests"))),
          getDocs(query(collection(db, "returnRecords"))),
        ]);

        console.log("資料讀取完成");

        // 建立所有器材的資料集
        const itemMap = {};
        itemSnap.docs.forEach((doc) => {
          itemMap[doc.id] = doc.data();
        });
        setItemsMeta(itemMap);

        // （已移除舊版「每個器材」總覽計算 summaryMap / summaryList，
        //   現改用下方未歸還明細 outstandingList）

        // 生成「未歸還明細」：以 (器材 + 借用人 + 電話) 為單位，借出減歸還 > 0 即為未還
        const outstandingMap = {};
        const addBorrow = (itemId, qty, borrower, phone, itemName, ts, note) => {
          if (!itemId) return;
          const key = `${itemId}|${borrower || ""}|${phone || ""}`;
          if (!outstandingMap[key]) {
            outstandingMap[key] = { itemId, borrower: borrower || "", phone: phone || "", itemName: itemName || "", note: "", borrowed: 0, returned: 0, borrowTs: null };
          }
          const entry = outstandingMap[key];
          entry.borrowed += qty;
          if (itemName && !entry.itemName) entry.itemName = itemName;
          if (ts && (!entry.borrowTs || (ts.seconds || 0) > (entry.borrowTs.seconds || 0))) {
            entry.borrowTs = ts;
            if (note) entry.note = note; // 取最近一次借出的備註
          }
        };
        const addReturn = (itemId, qty, borrower, phone) => {
          if (!itemId) return;
          const key = `${itemId}|${borrower || ""}|${phone || ""}`;
          if (!outstandingMap[key]) {
            outstandingMap[key] = { itemId, borrower: borrower || "", phone: phone || "", itemName: itemMap[itemId]?.label || "", note: "", borrowed: 0, returned: 0, borrowTs: null };
          }
          outstandingMap[key].returned += qty;
        };

        borrowSnap.docs.forEach((doc) => {
          const data = doc.data();
          if (Array.isArray(data.items)) {
            data.items.forEach((it) => addBorrow(it.itemId, it.quantity || 1, data.borrower, data.phone, it.itemName || it.label, data.timestamp, data.note));
          } else {
            addBorrow(data.itemId, 1, data.borrower, data.phone, data.itemName, data.timestamp, data.note);
          }
        });
        returnSnap.docs.forEach((doc) => {
          const data = doc.data();
          if (Array.isArray(data.items)) {
            data.items.forEach((it) => addReturn(it.itemId, it.quantity || 1, data.borrower, data.phone));
          } else {
            addReturn(data.itemId, 1, data.borrower, data.phone);
          }
        });

        const outstandingList = Object.values(outstandingMap)
          .map((o) => ({
            ...o,
            pending: o.borrowed - o.returned,
            label: itemMap[o.itemId]?.label || o.itemName || "未知器材",
            locate: itemMap[o.itemId]?.locate || "",
          }))
          .filter((o) => o.pending > 0);

        // 依借用人排序（同一人放一起），再依最近借出時間
        outstandingList.sort((a, b) => {
          const nameCmp = (a.borrower || "").localeCompare(b.borrower || "", "zh-TW");
          if (nameCmp !== 0) return nameCmp;
          return (b.borrowTs?.seconds || 0) - (a.borrowTs?.seconds || 0);
        });

        // 所有明細記錄處理
        console.log("處理明細記錄");
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
        
        // 改進分組邏輯：使用借用人+日期作為主鍵，而不是精確時間戳
        const grouped = {};
        
        // 按照日期分組
        allDetails.forEach((d) => {
          if (!d.timestamp) return;

          // 主鍵：每一次送出為一筆。
          // 新紀錄帶有 sessionId（同一次借用的多筆共用同一代號）→ 合併成一張卡；
          // 舊紀錄沒有 sessionId，改以該筆 doc id 為鍵 → 每筆各自一張，不再依日合併。
          const groupId = d.sessionId || d.id;
          const key = `${d.type}|${groupId}`;
          
          if (!grouped[key]) {
            grouped[key] = {
              timestamp: d.timestamp,
              type: d.type,
              borrower: d.borrower || "",
              phone: d.phone || "",
              note: d.note || "",
              items: {},
              // 保存最新時間戳，用於排序
              latestTimestamp: d.timestamp,
            };
          } else {
            // 如果有多個紀錄，使用最新的備註
            if (d.note && (!grouped[key].note || (d.timestamp.seconds > grouped[key].latestTimestamp.seconds))) {
              grouped[key].note = d.note;
            }
            
            // 更新最新時間戳
            if (d.timestamp.seconds > grouped[key].latestTimestamp.seconds) {
              grouped[key].latestTimestamp = d.timestamp;
            }
          }

          // 處理單筆或陣列格式的項目
          try {
            const items = Array.isArray(d.items) 
              ? d.items
              : d.itemId ? [{ label: d.itemName, itemId: d.itemId, quantity: 1 }] : [];
            
            items.forEach((item) => {
              if (!item) return;
              
              const id = item.itemId;
              if (!id) return; // 跳過無效資料
              
              const label = item.label || item.itemName || itemMap[id]?.label || "未知商品";
              const category = (itemMap[id]?.category || "").toLowerCase();
              
              if (!grouped[key].items[label]) {
                grouped[key].items[label] = { count: 0, category };
              }
              grouped[key].items[label].count += item.quantity || 1;
            });
          } catch (err) {
            console.error("處理項目時發生錯誤:", err, d);
          }
        });

        // 自定義類別優先順序 - 修改為指定的順序
        const catPriority = { 
          "ag": 1,
          "eg": 2,
          "microphone": 3,
          "di": 4,
          "sgi": 5
        };
        
        console.log("生成最終明細列表");
        try {
          const groupedDetails = Object.values(grouped).map((d) => {
            // 項目排序
            const sortedItems = Object.entries(d.items).sort(([labelA, itemA], [labelB, itemB]) => {
              try {
                // 先取得類別（確保小寫以便比較）
                const categoryA = itemA.category || "";
                const categoryB = itemB.category || "";
                
                // 檢查是否在優先清單中
                const aInPriority = catPriority[categoryA] !== undefined;
                const bInPriority = catPriority[categoryB] !== undefined;
                
                // 優先處理分類順序
                if (aInPriority && bInPriority) {
                  return catPriority[categoryA] - catPriority[categoryB];
                }
                if (aInPriority) return -1;
                if (bInPriority) return 1;
                
                // 類別不同時按名稱排序
                if (categoryA !== categoryB) {
                  return categoryA.localeCompare(categoryB, "zh-TW");
                }
                
                // 同類別使用智能排序
                return smartSort(labelA, labelB);
              } catch (err) {
                console.error("項目排序錯誤:", err);
                return 0;
              }
            });
            
            return {
              ...d,
              timestamp: d.latestTimestamp,
              items: Object.fromEntries(sortedItems.map(([label, info]) => [label, info.count]))
            };
          });

          // 時間排序
          groupedDetails.sort((a, b) => {
            const aTime = a.timestamp?.seconds || 0;
            const bTime = b.timestamp?.seconds || 0;
            return sortDesc ? bTime - aTime : aTime - bTime;
          });

          console.log("資料處理完成");
          setSummary(outstandingList);
          setDetails(groupedDetails);
        } catch (err) {
          console.error("排序/分組處理錯誤:", err);
          setError("數據處理失敗: " + err.message);
        }
      } catch (err) {
        console.error("資料載入失敗:", err);
        setError("資料載入失敗: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sortDesc]);

  const formatTime = (ts) => {
    if (!ts || !ts.toDate) return "";
    try {
      const date = ts.toDate();
      return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
    } catch (err) {
      console.error("日期格式化錯誤:", err);
      return "格式錯誤";
    }
  };

  const handleSwitchView = (mode) => {
    setView(mode);
    if (mode === "summary") setSearchTerm("");
  };

  const toggleSort = () => setSortDesc((prev) => !prev);

  // 總覽（未歸還明細）：搜尋 + 可點欄位排序
  const handleSummarySort = (key) => {
    setSummarySort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  };

  const filteredSummary = summary.filter((r) => {
    const k = searchTerm.toLowerCase();
    if (!k) return true;
    return (
      (r.borrower || "").toLowerCase().includes(k) ||
      (r.phone || "").toLowerCase().includes(k) ||
      (r.label || "").toLowerCase().includes(k) ||
      (r.locate || "").toLowerCase().includes(k) ||
      (r.note || "").toLowerCase().includes(k)
    );
  });

  const sortedSummary = [...filteredSummary].sort((a, b) => {
    const { key, dir } = summarySort;
    const factor = dir === "asc" ? 1 : -1;
    if (key === "pending") return (a.pending - b.pending) * factor;
    if (key === "borrowTs") return ((a.borrowTs?.seconds || 0) - (b.borrowTs?.seconds || 0)) * factor;
    return (a[key] || "").toString().localeCompare((b[key] || "").toString(), "zh-TW", { numeric: true }) * factor;
  });

  // 修改 AdminPage.jsx 的 filteredDetails 函數
const filteredDetails = details.filter((d) => {
  const keyword = searchTerm.toLowerCase();
  return (
    d.borrower?.toLowerCase().includes(keyword) ||
    d.phone?.toLowerCase().includes(keyword) ||
    d.note?.toLowerCase().includes(keyword) ||
    Object.keys(d.items || {}).some((label) => label.toLowerCase().includes(keyword)) ||
    // 檢查每個項目的位置信息
    Object.keys(itemsMeta).some(id => {
      const item = itemsMeta[id];
      // 如果項目有位置信息，且該項目在這次交易中
      return item?.locate?.toLowerCase().includes(keyword) && 
             Object.keys(d.items || {}).some(label => 
               label.includes(item.label) || // 如果標籤包含此項目名稱
               (d.items[label]?.itemId === id) // 或者項目ID匹配
             );
    })
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

          {(view === "details" || view === "summary") && (
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={view === "summary" ? "搜尋借用人、電話、器材、位置、備註" : "搜尋器材名稱、分類、品牌、位置、備註"}
                className="border border-gray-600 p-2 rounded w-full sm:w-80 bg-gray-800 text-white placeholder-gray-400"
              />
              {view === "details" && (
                <button onClick={toggleSort} className="bg-black text-white border border-gray-600 hover:bg-gray-700 px-4 py-2 rounded">
                  依時間排序：{sortDesc ? "新 → 舊" : "舊 → 新"}
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="text-red-500 border border-red-500 p-3 rounded bg-red-900/20 mb-4">
              載入錯誤: {error}
            </div>
          )}

          {loading ? (
            <p className="text-gray-400">讀取中...</p>
          ) : view === "summary" ? (
            <div>
              {summary.length === 0 ? (
                <p className="text-center text-gray-400 mt-4">目前沒有未歸還的器材，全部已歸還。</p>
              ) : sortedSummary.length === 0 ? (
                <p className="text-center text-gray-400 mt-4">沒有符合搜尋的未歸還資料</p>
              ) : (
                <>
                  <p className="text-sm text-gray-400 mb-2">
                    未歸還共 {summary.reduce((s, r) => s + r.pending, 0)} 件 · {summary.length} 筆
                  </p>
                  <div className="overflow-x-auto border border-gray-700 rounded">
                    <table className="w-full text-sm whitespace-nowrap">
                      <thead className="bg-gray-800 text-gray-200 select-none">
                        <tr>
                          {[
                            { key: "borrower", label: "借用人", align: "text-left" },
                            { key: "phone", label: "電話", align: "text-left" },
                            { key: "label", label: "器材", align: "text-left" },
                            { key: "pending", label: "數量", align: "text-center" },
                            { key: "locate", label: "位置", align: "text-left" },
                            { key: "borrowTs", label: "借出", align: "text-left" },
                            { key: "note", label: "備註", align: "text-left" },
                          ].map((col) => (
                            <th
                              key={col.key}
                              onClick={() => handleSummarySort(col.key)}
                              className={`p-2 ${col.align} cursor-pointer hover:bg-gray-700`}
                            >
                              {col.label}
                              {summarySort.key === col.key ? (summarySort.dir === "asc" ? " ▲" : " ▼") : ""}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedSummary.map((r, i) => (
                          <tr key={i} className="border-t border-gray-700 hover:bg-gray-900">
                            <td className="p-2 font-medium">{r.borrower || "—"}</td>
                            <td className="p-2">
                              {r.phone ? (
                                <a href={`tel:${r.phone}`} className="text-blue-400 hover:underline">{r.phone}</a>
                              ) : "—"}
                            </td>
                            <td className="p-2">{r.label}</td>
                            <td className="p-2 text-center">{r.pending}</td>
                            <td className="p-2">{r.locate || "—"}</td>
                            <td className="p-2 text-gray-300">{formatTime(r.borrowTs)}</td>
                            <td className="p-2 text-gray-300">{r.note || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDetails.length === 0 ? (
                <p className="text-center text-gray-400 mt-4">沒有符合的資料</p>
              ) : (
                filteredDetails.map((d, i) => (
                  <div key={i} className="flex border border-gray-700 rounded bg-[#111]">
                    <div className={`w-16 sm:w-20 text-center py-4 text-sm sm:text-base text-white ${d.type === "出借" ? "bg-green-900/30" : "bg-blue-900/30"}`}>{d.type}</div>
                    <div className="flex-1 p-4 text-sm sm:text-base">
                      <div className="text-xs text-gray-400 mb-1">{formatTime(d.timestamp)}</div>
                      <div className="flex justify-between items-center flex-wrap gap-x-4">
                        <span className="text-white font-medium text-base sm:text-lg">{d.borrower}</span>
                        <span className="text-gray-300 text-sm sm:text-base">{d.phone}</span>
                      </div>
                      <ul className="text-white mb-2 mt-2">
                        {Object.entries(d.items || {}).map(([label, count], idx) => (
                          <li key={idx}>- {label} x{count}</li>
                        ))}
                      </ul>
                      {d.note && <div className="text-gray-300 text-sm">備註：{d.note}</div>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <Footer />
        </div>
      </main>
    </>
  );
}

export default AdminPage;