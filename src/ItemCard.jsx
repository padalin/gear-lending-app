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
              if (i.itemId === item.id) borrowTotal += i.quantity || 1;
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
              if (i.itemId === item.id) returnTotal += i.quantity || 1;
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

  // 在庫狀態標籤：滿庫綠、部分借出琥珀、全借出紅
  let badge;
  if (quantity === 0) {
    badge = { cls: "text-gray-200 bg-gray-700", label: "—" };
  } else if (inStock <= 0) {
    badge = { cls: "text-red-200 bg-red-900/70", label: `已借出 0/${quantity}` };
  } else if (inStock < quantity) {
    badge = { cls: "text-amber-200 bg-amber-900/70", label: `在庫 ${inStock}/${quantity}` };
  } else {
    badge = { cls: "text-emerald-200 bg-emerald-900/70", label: `在庫 ${inStock}/${quantity}` };
  }

  const images = Array.isArray(item.images) ? item.images : [];
  const [imgIndex, setImgIndex] = useState(0);
  const [showFull, setShowFull] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const thumbRef = useRef(null);
  const fullRef = useRef(null);

  const handleScroll = (setter) => (e) => {
    const w = e.target.clientWidth;
    setImgIndex(w ? Math.round(e.target.scrollLeft / w) : 0);
  };

  useEffect(() => {
    if (thumbRef.current) thumbRef.current.scrollTo({ left: imgIndex * thumbRef.current.clientWidth, behavior: "smooth" });
    if (fullRef.current) fullRef.current.scrollTo({ left: imgIndex * fullRef.current.clientWidth, behavior: "smooth" });
  }, [imgIndex]);

  const hasDetail =
    item.serialNumber || item.class || item.colour || item.manufacturedDate || item.covered || item.remarksA || item.remarksB;

  return (
    <div className="bg-black text-white rounded-xl border border-gray-700 overflow-hidden flex flex-col">
      {/* 大圖區（可左右滑、點擊放大） */}
      <div
        className="relative w-full aspect-[4/3] bg-gray-900 cursor-pointer"
        onClick={() => images.length > 0 && setShowFull(true)}
      >
        <div
          ref={thumbRef}
          className="h-full flex overflow-x-auto scroll-smooth snap-x snap-mandatory hide-scrollbar"
          onScroll={handleScroll(setImgIndex)}
        >
          {images.length > 0 ? (
            images.map((src, idx) => (
              <img
                key={idx}
                src={src}
                alt={`${item.label}-${idx}`}
                loading="lazy"
                className="flex-shrink-0 w-full h-full object-contain snap-start"
              />
            ))
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">無圖</div>
          )}
        </div>

        {/* 在庫標籤疊在右上 */}
        <span className={`absolute top-2 right-2 text-xs font-semibold rounded-full px-2.5 py-1 ${badge.cls}`}>
          {badge.label}
        </span>

        {/* 多圖小圓點 */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === imgIndex ? "bg-white" : "bg-white/40"}`} />
            ))}
          </div>
        )}
      </div>

      {/* 資訊區 */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold leading-tight">{item.label}</h2>
          {isAdmin && (
            <div className="flex gap-3 flex-shrink-0 pt-1">
              <button onClick={() => onEdit(item)} className="text-gray-300 hover:text-blue-400" aria-label="編輯"><Pencil size={18} /></button>
              <button onClick={() => onDelete(item)} className="text-gray-300 hover:text-red-400" aria-label="刪除"><Trash2 size={18} /></button>
            </div>
          )}
        </div>

        {item.locate && (
          <p className="text-sm mt-1">
            <span className="text-blue-400">位置</span>：<span className="font-medium">{item.locate}</span>
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          {item.category}{item.brand ? ` · ${item.brand}` : ""} {item.model || ""}
        </p>

        {hasDetail && (
          <>
            <button onClick={() => setShowDetail((v) => !v)} className="text-xs text-gray-400 hover:text-white mt-2">
              {showDetail ? "收合 ▲" : "詳細 ▼"}
            </button>
            {showDetail && (
              <div className="mt-2 border-t border-gray-800 pt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-300">
                {item.serialNumber && <div><span className="text-gray-500">序號</span> {item.serialNumber}</div>}
                {item.class && <div><span className="text-gray-500">類別</span> {item.class}</div>}
                {item.colour && <div><span className="text-gray-500">顏色</span> {item.colour}</div>}
                {item.manufacturedDate && <div><span className="text-gray-500">製造</span> {item.manufacturedDate}</div>}
                {item.covered && <div><span className="text-gray-500">包覆</span> {item.covered}</div>}
                <div><span className="text-gray-500">總數</span> {quantity}</div>
                {item.remarksA && <div className="col-span-2"><span className="text-gray-500">備註A</span> {item.remarksA}</div>}
                {item.remarksB && <div className="col-span-2"><span className="text-gray-500">備註B</span> {item.remarksB}</div>}
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox 大圖 */}
      {showFull && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setShowFull(false)}
        >
          <div
            ref={fullRef}
            className="relative w-full max-w-[90vw] max-h-[90vh] flex overflow-x-auto scroll-smooth snap-x snap-mandatory hide-scrollbar"
            onScroll={handleScroll(setImgIndex)}
            onClick={(e) => e.stopPropagation()}
          >
            {images.map((src, idx) => (
              <img
                key={idx}
                src={src}
                alt={`${item.label}-full-${idx}`}
                className="flex-shrink-0 w-full max-h-[90vh] m-auto object-contain snap-start"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
