// src/ItemCardSwipe.jsx
import React, { useState, useRef, useEffect } from "react";

export default function ItemCardSwipe({ item, isAdmin, onEdit, onDelete }) {
  const images = Array.isArray(item.images) ? item.images : [];
  const [idx, setIdx] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [startX, setStartX] = useState(null);
  const scrollRef = useRef(null);

  // 打開 Lightbox 並跳到指定 index
  const openModalAt = (index) => {
    setIdx(index);
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  // 共用滑動手勢
  const handleDragStart = x => setStartX(x);
  const handleDragEnd = x => {
    if (startX === null) return;
    const delta = x - startX;
    if (delta > 50) setIdx(i => (i - 1 + images.length) % images.length);
    if (delta < -50) setIdx(i => (i + 1) % images.length);
    setStartX(null);
  };

  // 縮圖區 auto‑scroll
  const thumbRef = useRef(null);
  useEffect(() => {
    if (thumbRef.current) {
      const w = thumbRef.current.clientWidth;
      thumbRef.current.scrollTo({ left: idx * w, behavior: "smooth" });
    }
  }, [idx]);

  return (
    <>
      {/* 圖卡本體：左右排列，3:2 比例 */}
      <div className="bg-black rounded-lg overflow-hidden flex gap-4 h-auto">
        {/* 縮圖區 (3/5) */}
        <div className="w-3/5 aspect-[3/2] overflow-hidden">
          <div
            ref={thumbRef}
            className="w-full h-full flex overflow-x-auto scroll-smooth snap-x snap-mandatory"
            style={{ scrollSnapType: "x mandatory" }}
            onPointerDown={e => handleDragStart(e.clientX)}
            onPointerUp={e => handleDragEnd(e.clientX)}
            onTouchStart={e => handleDragStart(e.touches[0].clientX)}
            onTouchEnd={e => handleDragEnd(e.changedTouches[0].clientX)}
            onClick={e => e.stopPropagation()}
          >
            {images.length > 0 ? images.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={item.label}
                className="flex-shrink-0 w-full h-full object-cover snap-start cursor-pointer"
                style={{ scrollSnapAlign: "start" }}
                onClick={() => openModalAt(i)}
              />
            )) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-700 text-gray-300">
                無圖
              </div>
            )}
          </div>
        </div>
        {/* 文字區 (2/5) */}
        <div className="w-2/5 p-4 text-white flex flex-col justify-between">
          <div className="space-y-1">
            <p className="text-xl font-bold">{item.label}</p>
            <p>分類：{item.category}</p>
            <p>品牌：{item.brand}</p>
            <p>型號：{item.model}</p>
            {item.colour && <p>顏色：{item.colour}</p>}
            {item.serialNumber && <p>序號：{item.serialNumber}</p>}
            <p>在庫：{item.stock}/{item.quantity || 0}</p>
            {item.covered && <p>包覆：{item.covered}</p>}
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <button onClick={()=>onEdit(item)} className="px-2 py-1 bg-blue-600 rounded">編輯</button>
              <button onClick={()=>onDelete(item)} className="px-2 py-1 bg-red-600 rounded">刪除</button>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-[90vw] max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div
              ref={scrollRef}
              className="w-full h-full flex overflow-x-auto scroll-smooth snap-x snap-mandatory"
              style={{ scrollSnapType: "x mandatory" }}
              onPointerDown={e => handleDragStart(e.clientX)}
              onPointerUp={e => handleDragEnd(e.clientX)}
              onTouchStart={e => handleDragStart(e.touches[0].clientX)}
              onTouchEnd={e => handleDragEnd(e.changedTouches[0].clientX)}
            >
              {images.length > 0 ? images.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`${item.label}-${i}`}
                  className="flex-shrink-0 w-full h-full object-contain snap-start"
                  style={{ scrollSnapAlign: "start" }}
                />
              )) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-700 text-gray-300">
                  無圖
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
