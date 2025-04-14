import React, { useState } from "react";
import imageCompression from "browser-image-compression";
import { uploadImageToCloudinary } from "./uploadImageToCloudinaryWithProgress";

function ImageEditorCell({ images, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);

  const handleDelete = (idx) => {
    const updated = images.filter((_, i) => i !== idx);
    onChange(updated);
  };

  const handleUpload = async (files) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const newImages = [];
      for (const file of files) {
        const compressed = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1024,
        });
        const url = await uploadImageToCloudinary(compressed);
        newImages.push(url);
      }
      onChange([...images, ...newImages]);
    } catch (err) {
      alert("圖片上傳失敗");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e) => {
    handleUpload(e.target.files);
  };

  const handleDropFiles = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      handleUpload(e.dataTransfer.files);
    }
  };

  const handleDragStart = (idx) => setDragIndex(idx);
  const handleDrop = (idx) => {
    if (dragIndex === null || dragIndex === idx) return;
    const updated = [...images];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(idx, 0, moved);
    onChange(updated);
    setDragIndex(null);
  };

  return (
    <div
      className="space-y-1 border border-gray-600 p-2 rounded"
      onDrop={handleDropFiles}
      onDragOver={(e) => e.preventDefault()}
    >
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleInputChange}
        className="text-sm text-white"
        disabled={uploading}
      />
      <div className="flex flex-wrap gap-1 mt-2">
        {images.map((url, idx) => (
          <div
            key={idx}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(idx)}
            className="relative w-16 h-16 border border-gray-600 rounded overflow-hidden"
          >
            <img
              src={url}
              alt={`img-${idx}`}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => handleDelete(idx)}
              className="absolute top-0 right-0 bg-black/70 text-white text-xs px-1"
            >
              x
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ImageEditorCell;