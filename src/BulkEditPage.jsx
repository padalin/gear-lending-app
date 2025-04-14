import React, { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "./firebase";
import Navbar from "./Navbar";
import ImageEditorCell from "./ImageEditorCell";
import Footer from "./Footer";

function BulkEditPage() {
  const [items, setItems] = useState([]);
  const [originalItems, setOriginalItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchItems = async () => {
      const snapshot = await getDocs(collection(db, "items"));
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setItems(data);
      setOriginalItems(data);
      setLoading(false);
    };
    fetchItems();
  }, []);

  const handleChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = field === "quantity" ? parseInt(value) || 0 : value;
    setItems(updated);
  };

  const handleImagesChange = (index, newImages) => {
    const updated = [...items];
    updated[index].images = newImages;
    setItems(updated);
  };

  const handleSubmit = async () => {
    try {
      const updates = items.filter((item, i) => JSON.stringify(item) !== JSON.stringify(originalItems[i]));
      for (const item of updates) {
        const { id, ...rest } = item;
        await updateDoc(doc(db, "items", id), rest);
      }
      alert("更新完成！");
    } catch (err) {
      console.error("批次更新錯誤：", err);
      setError("更新失敗，請稍後再試");
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <main className="pt-24 px-4 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">批次編輯器材內容</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {loading ? (
          <p>讀取中...</p>
        ) : (
          <div className="overflow-auto border border-gray-800 rounded">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="p-2">Label</th>
                  <th className="p-2">Category</th>
                  <th className="p-2">Brand</th>
                  <th className="p-2">Model</th>
                  <th className="p-2">Class</th>
                  <th className="p-2">Colour</th>
                  <th className="p-2">SN</th>
                  <th className="p-2">Date</th>
                  <th className="p-2">Covered</th>
                  <th className="p-2">Qty</th>
                  <th className="p-2">Remark A</th>
                  <th className="p-2">Remark B</th>
                  <th className="p-2">Images</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id} className="border-t border-gray-800">
                    {["label", "category", "brand", "model", "class", "colour", "serialNumber", "manufacturedDate", "covered", "quantity", "remarksA", "remarksB"].map((field) => (
                      <td key={field} className="p-1">
                        <input
                          type={field === "quantity" ? "number" : "text"}
                          value={item[field] || ""}
                          onChange={(e) => handleChange(idx, field, e.target.value)}
                          className="w-full p-1 bg-gray-900 text-white border border-gray-700 rounded"
                        />
                      </td>
                    ))}
                    <td className="p-1">
                      <ImageEditorCell images={item.images || []} onChange={(imgs) => handleImagesChange(idx, imgs)} />
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
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
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