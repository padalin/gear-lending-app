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
    images: [],
  });

  const [uploading, setUploading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "quantity" ? parseInt(value) : value,
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
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-gray-900 text-white rounded">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input name="label" label="Label" value={formData.label} onChange={handleChange} required />
        <Input name="category" label="Category" value={formData.category} onChange={handleChange} required />
        <Input name="brand" label="Brand" value={formData.brand} onChange={handleChange} />
        <Input name="model" label="Model" value={formData.model} onChange={handleChange} />
        <Input name="class" label="Class" value={formData.class} onChange={handleChange} />
        <Input name="colour" label="Colour" value={formData.colour} onChange={handleChange} />
        <Input name="serialNumber" label="Serial Number" value={formData.serialNumber} onChange={handleChange} />
        <Input name="manufacturedDate" label="Manufactured Date" value={formData.manufacturedDate} onChange={handleChange} />
        <Select name="covered" label="Covered" value={formData.covered} onChange={handleChange} options={["", "紙箱", "硬殼", "軟袋", "無"]} />

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
            <span className="w-10 text-center">{formData.quantity}</span>
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

      <Input name="remarksA" label="備註 A" value={formData.remarksA} onChange={handleChange} />
      <Input name="remarksB" label="備註 B" value={formData.remarksB} onChange={handleChange} />

      <div>
        <label className="block font-medium mb-1">上傳圖片</label>
        <ImageUploader
          images={formData.images}
          setImages={(newImages) => setFormData((prev) => ({ ...prev, images: newImages }))}
          setUploading={setUploading}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded">
          取消
        </button>
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">
          新增
        </button>
      </div>
    </form>
  );
}

export default NewItemForm;