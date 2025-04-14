import React, { useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { uploadImageToCloudinary } from "./uploadImageToCloudinaryWithProgress";

function ImageUploader({ images, setImages, setUploading }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [progressMap, setProgressMap] = useState({});
  const fileInputRef = useRef();

  if (!Array.isArray(images)) {
    console.error("⛔️ images 不是陣列：", images);
    return <div className="text-red-500">圖片資料異常，請重新整理</div>;
  }

  const handleUpload = async (files) => {
    if (!files.length) return;
    setUploading(true);

    try {
      const uploadedImages = [];

      for (const file of files) {
        console.log("🔄 上傳圖片：", file.name);

        const compressed = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1024,
        });

        const url = await uploadImageToCloudinary(compressed, (percent) => {
          setProgressMap((prev) => ({ ...prev, [file.name]: percent }));
        });

        uploadedImages.push(url);
        setProgressMap((prev) => {
          const copy = { ...prev };
          delete copy[file.name];
          return copy;
        });
      }

      setImages([...images, ...uploadedImages]);
    } catch (err) {
      alert("圖片上傳失敗，請重試");
      console.error("❌ 上傳錯誤：", err);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    handleUpload(e.target.files);
  };

  const handleDelete = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleDragStart = (index) => {
    setDragIndex(index);
  };

  const handleDrop = (index) => {
    if (dragIndex === null || dragIndex === index) return;
    const updated = [...images];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(index, 0, moved);
    setImages(updated);
    setDragIndex(null);
  };

  const handleDropFiles = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      console.log("📂 Drop files: ", files);
      handleUpload(files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* 拖曳／點擊上傳區塊 */}
      <div
        className={`w-full p-6 border-2 border-dashed rounded text-center text-sm cursor-pointer transition ${
          isDraggingOver
            ? "border-blue-400 bg-gray-800 text-white"
            : "border-gray-600 text-gray-400 hover:bg-gray-800"
        }`}
        onClick={triggerFileSelect}
        onDrop={handleDropFiles}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        📥 點擊或拖曳圖片到這裡上傳
      </div>

      {/* 隱藏的 input */}
      <input
        type="file"
        accept="image/*"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 圖片預覽 */}
      <div className="flex flex-wrap gap-2">
        {images.map((url, idx) => (
          <div
            key={idx}
            className="relative w-24 h-24 border rounded overflow-hidden cursor-move"
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(idx)}
          >
            <img src={url} alt={`img-${idx}`} className="object-cover w-full h-full" />
            <button
              type="button"
              onClick={() => handleDelete(idx)}
              className="absolute top-0 right-0 bg-black/60 text-white text-xs px-1"
            >
              x
            </button>
          </div>
        ))}
      </div>

      {/* 上傳中的進度條 */}
      {Object.entries(progressMap).map(([fileName, percent]) => (
        <div key={fileName} className="text-sm text-gray-300">
          {fileName}：{percent}%
          <div className="w-full bg-gray-700 rounded h-2 mt-1">
            <div
              className="bg-blue-500 h-2 rounded"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default ImageUploader;
