// src/BulkEditPage.jsx
import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ImageUploader from "./ImageUploader";

function BulkEditPage() {
  const [items, setItems] = useState([]);
  const [originalItems, setOriginalItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadingMap, setUploadingMap] = useState({}); // 每列上傳狀態
  const [editingCategory, setEditingCategory] = useState(null); // 當前正在編輯的分類
  const [searchTerm, setSearchTerm] = useState(""); // 搜尋功能
  const [filteredItems, setFilteredItems] = useState([]); // 過濾後的項目

  // 智能排序函數
  const smartSort = (a, b) => {
    // 分割名稱和數字部分的正則表達式 - 改進版
    const regexPattern = /^(.*?)(\d+)(.*)$/;
    
    const matchA = a.label.match(regexPattern);
    const matchB = b.label.match(regexPattern);
    
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
    return a.label.localeCompare(b.label, "zh-TW");
  };

  useEffect(() => {
    async function fetchItems() {
      try {
        const snap = await getDocs(collection(db, "items"));
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 自定義類別優先順序
        const catPriority = { 
          AG: 1,
          EG: 2,
          microphone: 3,
          DI: 4,
          SGI: 5
        };

        // 排序：先按優先級別，再按分類，最後按智能排序
        data.sort((a, b) => {
          // 獲取類別優先級
          const catA = a.category || "";
          const catB = b.category || "";
          
          const priorityA = catPriority[catA] || Infinity;
          const priorityB = catPriority[catB] || Infinity;
          
          // 先按優先級排序
          if (priorityA !== priorityB) return priorityA - priorityB;
          
          // 再按分類排序
          if (catA !== catB) return catA.localeCompare(catB);
          
          // 同類別使用智能排序
          return smartSort(a, b);
        });

        setItems(data);
        setFilteredItems(data);
        setOriginalItems(JSON.parse(JSON.stringify(data)));
      } catch (err) {
        console.error("讀取器材失敗：", err);
        setError("讀取器材失敗，請稍後再試");
      } finally {
        setLoading(false);
      }
    }
    fetchItems();
  }, []);

  // 根據搜索項過濾器材
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredItems(items);
      return;
    }
    
    const keyword = searchTerm.toLowerCase();
    const filtered = items.filter(item => {
      const searchableText = `${item.label} ${item.category} ${item.brand} ${item.model} ${item.locate || ""} ${item.remarksA || ""} ${item.remarksB || ""}`.toLowerCase();
      return searchableText.includes(keyword);
    });
    
    setFilteredItems(filtered);
  }, [searchTerm, items]);

  const handleChange = (index, field, value) => {
    const updated = [...items];
    const originalIndex = items.findIndex(item => item.id === filteredItems[index].id);
    if (originalIndex !== -1) {
      updated[originalIndex][field] = field === "quantity" ? parseInt(value, 10) || 0 : value;
      setItems(updated);
    }
  };

  const handleImagesChange = (index, newImages) => {
    const updated = [...items];
    const originalIndex = items.findIndex(item => item.id === filteredItems[index].id);
    if (originalIndex !== -1) {
      updated[originalIndex].images = newImages;
      setItems(updated);
    }
  };

  const handleSetUploading = (index, flag) => {
    setUploadingMap(prev => ({ ...prev, [index]: flag }));
  };

  const handleSubmit = async () => {
    setError("");
    try {
      const updates = items.filter((item, i) =>
        JSON.stringify(item) !== JSON.stringify(originalItems[i])
      );
      
      if (updates.length === 0) {
        alert("沒有變更需要儲存");
        return;
      }
      
      const batchSize = 450; // Firestore 單批上限 500，保守取 450
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = writeBatch(db);
        for (const item of updates.slice(i, i + batchSize)) {
          const { id, ...rest } = item;
          batch.update(doc(db, "items", id), rest);
        }
        await batch.commit();
      }
      alert(`更新完成！共更新 ${updates.length} 筆資料`);
      setOriginalItems(JSON.parse(JSON.stringify(items)));
    } catch (err) {
      console.error("批次更新錯誤：", err);
      setError("更新失敗，請稍後再試");
    }
  };

  // 獲取分類列表
  const getCategories = () => {
    const categories = {};
    filteredItems.forEach(item => {
      if (item.category) {
        categories[item.category] = (categories[item.category] || 0) + 1;
      }
    });
    return Object.entries(categories).sort((a, b) => {
      const catPriority = { AG: 1, EG: 2, microphone: 3, DI: 4, SGI: 5 };
      const priorityA = catPriority[a[0]] || Infinity;
      const priorityB = catPriority[b[0]] || Infinity;
      return priorityA - priorityB;
    });
  };

  // 根據分類獲取項目
  const getItemsByCategory = (category) => {
    return filteredItems.filter(item => item.category === category).sort(smartSort);
  };

  // 包覆選項
  const coveredOptions = ["", "紙箱", "硬殼", "軟袋", "軟殼", "無"];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Navbar />
      <main className="pt-20 px-4 max-w-6xl mx-auto pb-32">
        <h1 className="text-2xl font-bold mb-4">批次編輯器材內容</h1>
        
        <button
          onClick={() => (window.location.href = "/admin/items")}
          className="mb-6 text-gray-300 hover:text-white hover:underline"
        >
          ← 返回器材管理
        </button>
        
        {error && <p className="text-red-500 mb-4">{error}</p>}

        {loading ? (
          <p>讀取中...</p>
        ) : (
          <>
            {/* 搜尋欄 */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="搜尋器材名稱、分類、品牌、位置..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 rounded bg-gray-800 border border-gray-700 text-white placeholder-gray-400"
              />
            </div>

            {/* 分類列表 */}
            <div className="space-y-4 mb-8">
              {getCategories().map(([category, count]) => (
                <div key={category} className="border border-gray-800 rounded overflow-hidden">
                  <button
                    onClick={() => setEditingCategory(editingCategory === category ? null : category)}
                    className="w-full text-left p-4 bg-gray-800 hover:bg-gray-700 text-white font-medium flex justify-between items-center"
                  >
                    <span>{category} ({count})</span>
                    <span>{editingCategory === category ? "▲" : "▼"}</span>
                  </button>
                  
                  {editingCategory === category && (
                    <div className="p-2 bg-gray-900">
                      {getItemsByCategory(category).map((item, idx) => (
                        <div key={item.id} className="border border-gray-800 rounded mb-4 p-3 bg-gray-800">
                          <div className="font-medium text-lg mb-2">{item.label}</div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                            {/* 左側欄位 */}
                            <div className="space-y-2">
                              <div>
                                <label className="block text-xs text-gray-400">品牌</label>
                                <input
                                  type="text"
                                  value={item.brand || ""}
                                  onChange={(e) => handleChange(
                                    filteredItems.findIndex(i => i.id === item.id),
                                    "brand",
                                    e.target.value
                                  )}
                                  className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs text-gray-400">型號</label>
                                <input
                                  type="text"
                                  value={item.model || ""}
                                  onChange={(e) => handleChange(
                                    filteredItems.findIndex(i => i.id === item.id),
                                    "model",
                                    e.target.value
                                  )}
                                  className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs text-gray-400">位置</label>
                                <input
                                  type="text"
                                  value={item.locate || ""}
                                  onChange={(e) => handleChange(
                                    filteredItems.findIndex(i => i.id === item.id),
                                    "locate",
                                    e.target.value
                                  )}
                                  className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs text-gray-400">包覆</label>
                                <select
                                  value={item.covered || ""}
                                  onChange={(e) => handleChange(
                                    filteredItems.findIndex(i => i.id === item.id),
                                    "covered",
                                    e.target.value
                                  )}
                                  className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white"
                                >
                                  {coveredOptions.map(option => (
                                    <option key={option} value={option}>
                                      {option || "（未指定）"}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            
                            {/* 右側欄位 */}
                            <div className="space-y-2">
                              <div>
                                <label className="block text-xs text-gray-400">數量</label>
                                <input
                                  type="number"
                                  value={item.quantity || 0}
                                  onChange={(e) => handleChange(
                                    filteredItems.findIndex(i => i.id === item.id),
                                    "quantity",
                                    e.target.value
                                  )}
                                  className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs text-gray-400">備註 A</label>
                                <input
                                  type="text"
                                  value={item.remarksA || ""}
                                  onChange={(e) => handleChange(
                                    filteredItems.findIndex(i => i.id === item.id),
                                    "remarksA",
                                    e.target.value
                                  )}
                                  className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs text-gray-400">備註 B</label>
                                <input
                                  type="text"
                                  value={item.remarksB || ""}
                                  onChange={(e) => handleChange(
                                    filteredItems.findIndex(i => i.id === item.id),
                                    "remarksB",
                                    e.target.value
                                  )}
                                  className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white"
                                />
                              </div>
                            </div>
                          </div>
                          
                          {/* 圖片上傳區域 */}
                          <div className="mt-3">
                            <label className="block text-xs text-gray-400 mb-1">圖片</label>
                            <ImageUploader
                              images={item.images || []}
                              setImages={(imgs) => handleImagesChange(
                                filteredItems.findIndex(i => i.id === item.id),
                                imgs
                              )}
                              setUploading={(flag) => handleSetUploading(
                                filteredItems.findIndex(i => i.id === item.id),
                                flag
                              )}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 儲存按鈕 - 底部 */}
            <div className="mt-6 mb-20">
              <button
                onClick={handleSubmit}
                disabled={Object.values(uploadingMap).some(x => x)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 w-full sm:w-auto"
              >
                儲存變更
              </button>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default BulkEditPage;