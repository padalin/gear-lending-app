import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import Navbar from "./Navbar";

function ItemDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const ref = doc(db, "items", id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setItem({ id: snap.id, ...snap.data() });
        }
      } catch (err) {
        console.error("讀取器材失敗", err);
      }
    };

    fetchItem();
  }, [id]);

  if (!item) {
    return (
      <>
        <Navbar />
        <div className="p-6">載入中或找不到器材資料。</div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="p-6 max-w-3xl mx-auto">
        <img
          src={
            item.images?.[0] || "https://via.placeholder.com/300?text=No+Image"
          }
          alt={item.label || item.name}
          className="w-full max-w-md mx-auto mb-4 rounded"
        />
        <h1 className="text-2xl font-bold mb-2">{item.label || item.name}</h1>
        <p className="text-gray-700 mb-1">分類：{item.category || "無"}</p>
        <p className="text-gray-500 mb-4">{item.description || "無描述"}</p>
        <p className="text-sm text-gray-600">
          狀態：{item.available ? "可借出" : "借出中"}
        </p>
      </div>
    </>
  );
}

export default ItemDetail;
