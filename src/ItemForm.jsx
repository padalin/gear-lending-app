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
    locate: initialData.locate || "",
    images: Array.isArray(initialData.images) ? [...initialData.images] : [],
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
      alert("圖片尚未上傳完成，請稍候再試");
      return;
    }

    onSubmit({
      ...formData,
      images: Array.isArray(formData.images) ? [...formData.images] : [],
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto">
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
        <Select name="covered" label="Covered" value={formData.covered} onChange={handleChange} options={["", "紙箱", "硬殼", "軟袋", "軟殼", "無"]} />
        <Input name="locate" label="Location" value={formData.locate} onChange={handleChange} />
        <Input name="quantity" label="數量" type="number" value={formData.quantity} onChange={handleChange} required />
      </div>

      {/* 備註區塊 - 單列顯示 */}
      <div className="space-y-3">
        <Input name="remarksA" label="備註 A" value={formData.remarksA} onChange={handleChange} />
        <Input name="remarksB" label="備註 B" value={formData.remarksB} onChange={handleChange} />
      </div>

      <div>
        <label className="block font-medium mb-1 text-white">上傳圖片</label>
        <div className="overflow-hidden">
          <ImageUploader
            images={formData.images}
            setImages={(newImages) =>
              setFormData((prev) => ({ ...prev, images: newImages }))
            }
            setUploading={setUploading}
          />
        </div>
      </div>

      {/* 按鈕區塊 - 在手機上垂直堆疊，更大的間距 */}
      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 pb-16 mt-8">
        <button 
          type="button" 
          onClick={onCancel} 
          className="px-4 py-3 bg-gray-500 hover:bg-gray-600 rounded text-white w-full sm:w-auto"
        >
          取消
        </button>
        <button 
          type="submit" 
          className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded w-full sm:w-auto"
        >
          確認
        </button>
      </div>
    </form>
  );
}

export default ItemForm;