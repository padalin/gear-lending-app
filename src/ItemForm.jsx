import React, { useState } from "react";
import ImageUploader from "./ImageUploader";
import Input from "./Input";   // 或 "./components/Input" 取決於你檔案位置
import Select from "./Select";

function ItemForm({ initialData = {}, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    label: initialData.label || "",
    category: initialData.category || "",
    brand: initialData.brand || "",
    model: initialData.model || "",
    class: initialData.class || "",
    colour: initialData.colour || "",
    serialNumber: initialData.serialNumber || "",
    manufacturedDate: initialData.manufacturedDate || "",
    covered: initialData.covered || "",
    remarksA: initialData.remarksA || "",
    remarksB: initialData.remarksB || "",
    quantity: initialData.quantity || 1,
    images: Array.isArray(initialData.images) ? [...initialData.images] : [],
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
      alert("圖片尚未上傳完成，請稍候再試");
      return;
    }

    onSubmit({
      ...formData,
      images: Array.isArray(formData.images) ? [...formData.images] : [],
    });
  };

  console.log("images state in formData", formData.images);

  
  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto">
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
        <Input name="quantity" label="數量" type="number" value={formData.quantity} onChange={handleChange} required />
      </div>

      <Input name="remarksA" label="備註 A" value={formData.remarksA} onChange={handleChange} />
      <Input name="remarksB" label="備註 B" value={formData.remarksB} onChange={handleChange} />

      <div>
        <label className="block font-medium mb-1">上傳圖片</label>
        <ImageUploader
  images={formData.images}
  setImages={(newImages) =>
    setFormData((prev) => ({ ...prev, images: newImages }))
  }
  setUploading={setUploading}
/>

      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded">取消</button>
        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">新增</button>
      </div>
    </form>
  );
}

export default ItemForm;
