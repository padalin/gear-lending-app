// src/ImageUploader.jsx
import React, { useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import heic2any from "heic2any";
import { uploadImageToCloudinary } from "./uploadImageToCloudinaryWithProgress";

function ImageUploader({ images, setImages, setUploading }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [progressMap, setProgressMap] = useState({});
  const fileInputRef = useRef();

  // 如果 images 是 function，就先執行拿到陣列
  const resolvedImages = typeof images === "function" ? images() : images;
  if (!Array.isArray(resolvedImages)) {
    console.error("⛔️ images 不是陣列：", resolvedImages);
    return <div className="text-red-500">圖片資料異常，請重新整理</div>;
  }

  const handleUpload = async (fileList) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    setUploading(true);

    const uploadedUrls = [];

    for (let idx = 0; idx < files.length; idx++) {
      let file = files[idx];
      const uniqueKey = `${file.name}_${file.size}`; // 保證 key 不衝突
      console.log("🔄 處理檔案：", file.name);

      // 1. 如果是 HEIC/HEIF，就先轉成 JPEG
      const ext = file.name.split(".").pop().toLowerCase();
      if (ext === "heic" || ext === "heif") {
        try {
          const blob = await heic2any({
            blob: file,
            toType: "image/jpeg",
            quality: 0.8,
          });
          file = new File(
            [blob],
            file.name.replace(/\.\w+$/, ".jpg"),
            { type: "image/jpeg" }
          );
          console.log("🔄 已轉 HEIC → JPEG：", file.name);
        } catch (e) {
          console.warn("⚠️ HEIC 轉檔失敗，將嘗試直接上傳原檔", e);
        }
      }

      // 2. 只有大於 1MB 的才壓縮
      let toUpload = file;
      if (file.size > 1 * 1024 * 1024) {
        try {
          toUpload = await imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1024,
            useWebWorker: true,
          });
        } catch (e) {
          console.warn("⚠️ 壓縮失敗，使用原檔上傳", e);
          toUpload = file;
        }
      }

      // 3. 上傳到 Cloudinary，並顯示進度
      try {
        const url = await uploadImageToCloudinary(toUpload, (percent) => {
          setProgressMap((prev) => ({ ...prev, [uniqueKey]: percent }));
        });
        uploadedUrls.push(url);
      } catch (e) {
        console.error("❌ 上傳失敗：", e);
        alert(`檔案 ${file.name} 上傳失敗，請稍後再試`);
      } finally {
        // 移除進度條
        setProgressMap((prev) => {
          const copy = { ...prev };
          delete copy[uniqueKey];
          return copy;
        });
      }
    }

    setImages([...resolvedImages, ...uploadedUrls]);
    setUploading(false);
  };

  const handleFileChange = (e) => handleUpload(e.target.files);
  const handleDropFiles = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    handleUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };
  const handleDragLeave = () => setIsDraggingOver(false);

  const handleDelete = (i) => {
    setImages(resolvedImages.filter((_, idx) => idx !== i));
  };
  const handleDragStart = (i) => setDragIndex(i);
  const handleDropReorder = (i) => {
    if (dragIndex === null || dragIndex === i) return;
    const arr = [...resolvedImages];
    const [moved] = arr.splice(dragIndex, 1);
    arr.splice(i, 0, moved);
    setImages(arr);
    setDragIndex(null);
  };
  const triggerFileSelect = () => fileInputRef.current?.click();

  return (
    <div className="space-y-4">
      {/* 上傳區 */}
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
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 已上傳預覽 & 排序 & 刪除 */}
      <div className="flex flex-wrap gap-2">
        {resolvedImages.map((url, idx) => (
          <div
            key={idx}
            className="relative w-24 h-24 border rounded overflow-hidden cursor-move"
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDropReorder(idx)}
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

      {/* 上傳進度 */}
      {Object.entries(progressMap).map(([key, pct]) => (
        <div key={key} className="text-sm text-gray-300">
          {key}：{pct}%
          <div className="w-full bg-gray-700 rounded h-2 mt-1">
            <div
              className="bg-blue-500 h-2 rounded"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default ImageUploader;
