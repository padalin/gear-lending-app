// src/ItemCard.jsx
import React, { useState, useEffect, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { Pencil, Trash2 } from "lucide-react";

export default function ItemCard({ item, onEdit, onDelete, isAdmin = false }) {
  const [borrowCount, setBorrowCount] = useState(0);
  const [returnCount, setReturnCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [borrowSnap, returnSnap] = await Promise.all([
          getDocs(collection(db, "borrowRequests")),
          getDocs(collection(db, "returnRecords")),
        ]);

        let borrowTotal = 0;
        borrowSnap.docs.forEach((doc) => {
          const data = doc.data();
          if (Array.isArray(data.items)) {
            data.items.forEach((i) => {
              if (i.itemId === item.id) {
                borrowTotal += i.quantity || 1;
              }
            });
          } else if (data.itemId === item.id) {
            borrowTotal += 1;
          }
        });

        let returnTotal = 0;
        returnSnap.docs.forEach((doc) => {
          const data = doc.data();
          if (Array.isArray(data.items)) {
            data.items.forEach((i) => {
              if (i.itemId === item.id) {
                returnTotal += i.quantity || 1;
              }
            });
          } else if (data.itemId === item.id) {
            returnTotal += 1;
          }
        });

        setBorrowCount(borrowTotal);
        setReturnCount(returnTotal);
      } catch (err) {
        console.error("無法取得借還資料", err);
      }
    })();
  }, [item.id]);

  const quantity = item.quantity || 0;
  const inStock = Math.max(quantity - (borrowCount - returnCount), 0);
  const stockText = `${inStock}/${quantity}`;
  const isFull = inStock === quantity;

  const images = Array.isArray(item.images) ? item.images : [];
  const [imgIndex, setImgIndex] = useState(0);
  const [showFull, setShowFull] = useState(false);

  const thumbRef = useRef(null);
  const fullRef = useRef(null);

  const handleThumbScroll = (e) => {
    const scrollLeft = e.target.scrollLeft;
    const width = e.target.clientWidth;
    const newIndex = Math.round(scrollLeft / width);
    setImgIndex(newIndex);
  };

  const handleFullScroll = (e) => {
    const scrollLeft = e.target.scrollLeft;
    const width = e.target.clientWidth;
    const newIndex = Math.round(scrollLeft / width);
    setImgIndex(newIndex);
  };

  useEffect(() => {
    const thumbEl = thumbRef.current;
    const fullEl = fullRef.current;
    if (thumbEl) {
      thumbEl.scrollTo({ left: imgIndex * thumbEl.clientWidth, behavior: "smooth" });
    }
    if (fullEl) {
      fullEl.scrollTo({ left: imgIndex * fullEl.clientWidth, behavior: "smooth" });
    }
  }, [imgIndex]);

  return (
    <div className="relative flex w-full bg-black text-white rounded-xl border border-gray-700 overflow-hidden">
      {/* 圖片區 */}
      <div
        className="flex-none w-3/5 h-full cursor-pointer flex items-center justify-end overflow-hidden relative"
        onClick={() => setShowFull(true)}
      >
        <div
          ref={thumbRef}
          className="h-full flex overflow-x-auto scroll-smooth snap-x snap-mandatory hide-scrollbar"
          onScroll={handleThumbScroll}
        >
          {images.length > 0 ? (
            images.map((src, idx) => (
              <img
                key={idx}
                src={src}
                alt={`${item.label}-${idx}`}
                className="flex-shrink-0 h-full w-auto object-contain snap-start"
              />
            ))
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-700 text-gray-300 w-full">
              無圖
            </div>
          )}
        </div>
      </div>

      <div className="w-4 bg-gray-700" />

      {/* 資訊區 */}
      <div className="flex-none w-2/5 h-full overflow-y-auto">
        <div className="pl-4 pr-2 pt-3 text-sm">
          <h2 className="text-base font-semibold mb-2">{item.label}</h2>
          <p className="font-light">分類：{item.category}</p>
          {item.brand && <p className="font-light">品牌：{item.brand}</p>}
          {item.model && <p className="font-light">型號：{item.model}</p>}
          {item.class && <p className="font-light">類別：{item.class}</p>}
          {item.colour && <p className="font-light">顏色：{item.colour}</p>}
          {item.serialNumber && <p className="font-light">序號：{item.serialNumber}</p>}
          {item.manufacturedDate && <p className="font-light">製造日期：{item.manufacturedDate}</p>}
          <p className={`font-light ${isFull ? 'text-green-500' : 'text-red-500'}`}>在庫：{stockText}</p>
          {item.covered && <p className="font-light">包覆：{item.covered}</p>}
          {item.remarksA && <p className="font-light">備註 A：{item.remarksA}</p>}
          {item.remarksB && <p className="font-light">備註 B：{item.remarksB}</p>}
        </div>
      </div>

      {/* 管理者按鈕 */}
      {isAdmin && (
        <div className="absolute bottom-2 right-2 flex gap-2">
          <button onClick={() => onEdit(item)} className="text-white hover:text-blue-400">
            <Pencil size={20} />
          </button>
          <button onClick={() => onDelete(item)} className="text-white hover:text-red-400">
            <Trash2 size={20} />
          </button>
        </div>
      )}

      {/* Lightbox 大圖 */}
      {showFull && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setShowFull(false)}
        >
          <div
            ref={fullRef}
            className="relative w-full max-w-[90vw] max-h-[90vh] flex overflow-x-auto scroll-smooth snap-x snap-mandatory hide-scrollbar"
            onScroll={handleFullScroll}
            onClick={(e) => e.stopPropagation()}
          >
            {images.map((src, idx) => (
              <img
                key={idx}
                src={src}
                alt={`${item.label}-full-${idx}`}
                className="flex-shrink-0 max-w-full max-h-full m-auto object-contain snap-start"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
