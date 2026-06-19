import React, { useState } from "react";
import { db } from "./firebase";
import { addDoc, collection } from "firebase/firestore";
import ImageUploader from "./ImageUploader";
import Input from "./Input";
import Select from "./Select";

function NewItemForm({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    label: "",
    category: "",
    brand: "",
    model: "",
    class: "",
    colour: "",
    serialNumber: "",
    manufacturedDate: "",
    covered: "",
    remarksA: "",
    remarksB: "",
    quantity: 1,
    locate: "",
    images: [],
  });

  const [uploading, setUploading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "quantity" ? (parseInt(value, 10) || 0) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.label || !formData.category || !formData.quantity) {
      alert("請填寫標籤、分類與數量");
      return;
    }

    if (uploading) {
      alert("圖片尚未上傳完成");
      return;
    }

    try {
      await addDoc(collection(db, "items"), formData);
      onSuccess();
    } catch (error) {
      console.error("新增失敗", error);
      alert("新增失敗，請稍後再試");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-2 sm:p-4 bg-gray-900 text-white rounded">
      {/* 在小屏幕上使用单列布局，中等屏幕以上使用双列 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input name="label" label="Label" value={formData.label} onChange={handleChange} required />
        <Input name="category" label="Category" value={formData.category} onChange={handleChange} required />
        <Input name="brand" label="Brand" value={formData.brand} onChange={handleChange} />
        <Input name="model" label="Model" value={formData.model} onChange={handleChange} />
        <Input name="class" label="Class" value={formData.class} onChange={handleChange} />
        <Input name="colour" label="Colour" value={formData.colour} onChange={handleChange} />
        <Input name="serialNumber" label="Serial Number" value={formData.serialNumber} onChange={handleChange} />
        <Input name="manufacturedDate" label="Manufactured Date" value={formData.manufacturedDate} onChange={handleChange} />
        <Select name="covered" label="Covered" value={formData.covered} onChange={handleChange} options={["", "紙箱", "硬殼", "軟袋", "無"]} />
        <Input name="locate" label="Location" value={formData.locate} onChange={handleChange} />

        <div>
          <label className="block mb-1 font-medium text-white">數量</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  quantity: Math.max(1, prev.quantity - 1),
                }))
              }
              className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded"
            >
              -
            </button>
            <span className="w-8 text-center">{formData.quantity}</span>
            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  quantity: prev.quantity + 1,
                }))
              }
              className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* 備註區塊 - 單列顯示 */}
      <div className="space-y-3">
        <Input name="remarksA" label="備註 A" value={formData.remarksA} onChange={handleChange} />
        <Input name="remarksB" label="備註 B" value={formData.remarksB} onChange={handleChange} />
      </div>

      <div>
        <label className="block font-medium mb-1">上傳圖片</label>
        <div className="overflow-hidden">
          <ImageUploader
            images={formData.images}
            setImages={(newImages) => setFormData((prev) => ({ ...prev, images: newImages }))}
            setUploading={setUploading}
          />
        </div>
      </div>

      {/* 按鈕區塊 - 在手機上垂直堆疊，更大的間距 */}
      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 pb-16 mt-8">
        <button 
          type="button" 
          onClick={onClose} 
          className="bg-gray-600 hover:bg-gray-700 px-4 py-3 rounded w-full sm:w-auto"
        >
          取消
        </button>
        <button 
          type="submit" 
          className="bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded w-full sm:w-auto"
        >
          新增
        </button>
      </div>
    </form>
  );
}

export default NewItemForm;