// src/BulkEditPage.jsx
import React, { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
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

  useEffect(() => {
    async function fetchItems() {
      try {
        const snap = await getDocs(collection(db, "items"));
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 排序：先 EG, AG, Microphone，再其他依 Category 英數升冪，最後同類別內 Label 升冪
        const priority = { EG: 1, AG: 2, Microphone: 3 };
        data.sort((a, b) => {
          const pa = priority[a.category] || Infinity;
          const pb = priority[b.category] || Infinity;
          if (pa !== pb) return pa - pb;
          if (a.category !== b.category) {
            return a.category.localeCompare(b.category, "en-u-kn");
          }
          return a.label.localeCompare(b.label, "en-u-kn");
        });

        setItems(data);
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

  const handleChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = field === "quantity" ? parseInt(value, 10) || 0 : value;
    setItems(updated);
  };

  const handleImagesChange = (index, newImages) => {
    const updated = [...items];
    updated[index].images = newImages;
    setItems(updated);
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
      for (const item of updates) {
        const { id, ...rest } = item;
        await updateDoc(doc(db, "items", id), rest);
      }
      alert("更新完成！");
      setOriginalItems(JSON.parse(JSON.stringify(items)));
    } catch (err) {
      console.error("批次更新錯誤：", err);
      setError("更新失敗，請稍後再試");
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Navbar />
      <main className="pt-20 px-4 max-w-6xl mx-auto pb-24">
        <h1 className="text-2xl font-bold mb-4">批次編輯器材內容</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}

        {loading ? (
          <p>讀取中...</p>
        ) : (
          <div
            className="overflow-auto border border-gray-800 rounded"
            style={{ maxHeight: "70vh" }}  // 你可以依需要調整最大高度
          >
            <table className="w-full text-ms font-thin border-collapse">
              <thead className="bg-gray-800 text-white">
                <tr>
                  {[
                    "Label", "Category", "Brand", "Model", "Class",
                    "Colour", "SN", "Date", "Covered", "Qty",
                    "Remark A", "Remark B", "Images"
                  ].map((h) => (
                    <th
                      key={h}
                      className="p-2 sticky top-0 bg-gray-800 z-10 text-left"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id} className="border-t border-gray-800">
                    {[
                      "label","category","brand","model","class",
                      "colour","serialNumber","manufacturedDate","covered",
                      "quantity","remarksA","remarksB"
                    ].map((field) => (
                      <td key={field} className="p-1">
                        <input
                          type={field === "quantity" ? "number" : "text"}
                          value={item[field] ?? ""}
                          onChange={(e) =>
                            handleChange(idx, field, e.target.value)
                          }
                          className="w-full p-1 bg-gray-900 text-white border border-gray-700 rounded"
                        />
                      </td>
                    ))}

                    <td className="p-1">
                      <ImageUploader
                        images={item.images || []}
                        setImages={(imgs) => handleImagesChange(idx, imgs)}
                        setUploading={(flag) => handleSetUploading(idx, flag)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 text-right">
          <button
            onClick={handleSubmit}
            disabled={Object.values(uploadingMap).some(x => x)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
          >
            儲存變更
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default BulkEditPage;
