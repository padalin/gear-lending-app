import React, { useState } from "react";
import Papa from "papaparse";
import { db } from "./firebase";
import { collection, addDoc } from "firebase/firestore";
import Navbar from "./Navbar";
import Footer from "./Footer";

const requiredFields = ["label", "category", "quantity"];

function BulkAddPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const parsed = results.data.map((row) => ({
          label: row["Label C"]?.trim() || "",
          category: row["Instrument & Photo"]?.trim() || "",
          brand: row["Brand"]?.trim() || "",
          model: row["Model"]?.trim() || "",
          class: row["Class"]?.trim() || "",
          colour: row["Colour"]?.trim() || "",
          serialNumber: row["SN"]?.trim() || "",
          manufacturedDate: row["Manufactured Date"]?.trim() || "",
          covered: row["Covered"]?.trim() || "",
          remarksA: row["Remarks"]?.trim() || "",
          remarksB: row["Remarks.1"]?.trim() || "",
          quantity: 1,
        }));
        setItems(parsed);
      },
      error: (err) => {
        console.error("CSV parse error", err);
        setError("CSV 讀取錯誤，請確認格式");
      },
    });
  };

  const handleChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = field === "quantity" ? parseInt(value) || 1 : value;
    setItems(updated);
  };

  const addEmptyRow = () => {
    setItems([...items, { label: "", category: "", quantity: 1 }]);
  };

  const removeRow = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setError("");
    const validItems = items.filter(
      (item) => item.label && item.category && item.quantity > 0
    );
    if (validItems.length === 0) {
      setError("請至少填寫一筆有效資料（Label、Category 與數量）");
      return;
    }

    try {
      for (const item of validItems) {
        const clean = Object.fromEntries(
          Object.entries(item).filter(([_, v]) => v !== "")
        );
        await addDoc(collection(db, "items"), clean);
      }
      alert("新增成功！");
      setItems([]);
    } catch (err) {
      console.error("批次新增錯誤", err);
      setError("新增失敗，請稍後再試");
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <main className="pt-20 px-4 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">📦 批次新增器材</h1>

        <div className="mb-6">
          <label className="block mb-2 font-medium">上傳 CSV 檔案：</label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="bg-gray-800 text-white p-2 rounded border border-gray-600"
          />
        </div>

        <button
          onClick={addEmptyRow}
          className="mb-4 px-4 py-2 bg-white text-black rounded hover:bg-gray-200"
        >
          ➕ 新增一列
        </button>

        {error && <p className="text-red-400 mb-4">{error}</p>}

        <div className="overflow-auto border border-gray-700 rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-800">
              <tr>
                <th className="p-2">Label*</th>
                <th className="p-2">Category*</th>
                <th className="p-2">Quantity*</th>
                <th className="p-2">Brand</th>
                <th className="p-2">Model</th>
                <th className="p-2">Class</th>
                <th className="p-2">Colour</th>
                <th className="p-2">SN</th>
                <th className="p-2">Date</th>
                <th className="p-2">Covered</th>
                <th className="p-2">Remarks A</th>
                <th className="p-2">Remarks B</th>
                <th className="p-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-t border-gray-700">
                  {[
                    "label",
                    "category",
                    "quantity",
                    "brand",
                    "model",
                    "class",
                    "colour",
                    "serialNumber",
                    "manufacturedDate",
                    "covered",
                    "remarksA",
                    "remarksB",
                  ].map((field) => (
                    <td key={field} className="p-1">
                      <input
                        type={field === "quantity" ? "number" : "text"}
                        value={item[field] || ""}
                        onChange={(e) => handleChange(idx, field, e.target.value)}
                        className="w-full p-1 bg-gray-800 text-white border border-gray-600 rounded"
                      />
                    </td>
                  ))}
                  <td className="text-center">
                    <button
                      onClick={() => removeRow(idx)}
                      className="text-red-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={13} className="text-center py-4 text-gray-500">
                    尚未輸入任何資料
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <button
          onClick={handleSubmit}
          className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
        >
          批次新增
        </button>
      </main>
      <Footer />
    </div>
  );
}

export default BulkAddPage;