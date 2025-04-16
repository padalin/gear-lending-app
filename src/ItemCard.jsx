// ItemCard.jsx
import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { Pencil, Trash2 } from "lucide-react";

function ItemCard({ item, onEdit, onDelete, isAdmin = false }) {
  const [borrowCount, setBorrowCount] = useState(0);
  const [returnCount, setReturnCount] = useState(0);

  useEffect(() => {
    const fetchBorrowData = async () => {
      try {
        const borrowSnap = await getDocs(collection(db, "borrowRequests"));
        const returnSnap = await getDocs(collection(db, "returnRecords"));

        const borrowed = borrowSnap.docs.filter(doc => doc.data().itemId === item.id).length;
        const returned = returnSnap.docs.filter(doc => doc.data().itemId === item.id).length;

        setBorrowCount(borrowed);
        setReturnCount(returned);
      } catch (err) {
        console.error("無法取得借還資料", err);
      }
    };

    fetchBorrowData();
  }, [item.id]);

  const quantity = item.quantity || 0;
  const inStock = Math.max(quantity - (borrowCount - returnCount), 0);
  const stockText = `${inStock}/${quantity}`;

  const [imgIndex, setImgIndex] = useState(0);
  const [showFull, setShowFull] = useState(false);
  const images = Array.isArray(item.images) ? item.images : [];

  const showPrev = () => setImgIndex((prev) => (prev - 1 + images.length) % images.length);
  const showNext = () => setImgIndex((prev) => (prev + 1) % images.length);

  return (
    <div className="relative flex w-full bg-black text-white rounded-xl border border-gray-700 overflow-hidden gap-4">
      {/* Image Column */}
      <div className="relative w-3/5 cursor-pointer" onClick={() => setShowFull(true)}>
        <img
          src={images[imgIndex]}
          alt={`img-${imgIndex}`}
          className="w-full h-full object-cover"
        />
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); showPrev(); }}
              className="absolute top-1/2 left-1 -translate-y-1/2 bg-white/70 hover:bg-white text-gray-800 px-2 py-1 rounded-full text-xs"
            >←</button>
            <button
              onClick={(e) => { e.stopPropagation(); showNext(); }}
              className="absolute top-1/2 right-1 -translate-y-1/2 bg-white/70 hover:bg-white text-gray-800 px-2 py-1 rounded-full text-xs"
            >→</button>
          </>
        )}
      </div>

      {/* Info Column */}
      <div className="w-2/5 py-3 pr-3 space-y-1 text-sm text-white">
        <h2 className="text-base font-semibold text-white">{item.label}</h2>
        <p>分類：{item.category}</p>
        {item.brand && <p>品牌：{item.brand}</p>}
        {item.model && <p>型號：{item.model}</p>}
        {item.class && <p>類別：{item.class}</p>}
        {item.colour && <p>顏色：{item.colour}</p>}
        {item.serialNumber && <p>序號：{item.serialNumber}</p>}
        {item.manufacturedDate && <p>製造日期：{item.manufacturedDate}</p>}
        <p className="font-medium">在庫：{stockText}</p>
        {item.covered && <p>包覆：{item.covered}</p>}
        {item.remarksA && <p>備註 A：{item.remarksA}</p>}
        {item.remarksB && <p>備註 B：{item.remarksB}</p>}
      </div>

      {isAdmin && (
  <div className="absolute bottom-2 right-2 flex gap-2">
    <button
      onClick={() => onEdit(item)}
      className="text-white hover:text-blue-400 bg-transparent hover:bg-transparent transition"
      aria-label="編輯"
    >
      <Pencil size={20} />
    </button>
    <button
      onClick={() => onDelete(item)}
      className="text-white hover:text-red-400 bg-transparent hover:bg-transparent transition"
      aria-label="刪除"
    >
      <Trash2 size={20} />
    </button>
  </div>
)}



      {showFull && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
          onClick={() => setShowFull(false)}
        >
          <div className="relative max-w-full max-h-full w-[90%] h-[80%] flex items-center justify-center">
            <img
              src={images[imgIndex]}
              alt="preview"
              className="max-w-full max-h-full object-contain"
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); showPrev(); }}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 px-3 py-2 rounded-full"
                >←</button>
                <button
                  onClick={(e) => { e.stopPropagation(); showNext(); }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 px-3 py-2 rounded-full"
                >→</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ItemCard;