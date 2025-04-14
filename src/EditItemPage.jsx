import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "./firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import ItemForm from "./ItemForm";
import Navbar from "./Navbar";
import Footer from "./Footer";

function EditItemPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [itemData, setItemData] = useState(null);

  useEffect(() => {
    const fetchItem = async () => {
      const ref = doc(db, "items", id);
      const snapshot = await getDoc(ref);
      if (snapshot.exists()) {
        setItemData({ id: snapshot.id, ...snapshot.data() });
      } else {
        alert("找不到該筆資料");
        navigate("/admin/items");
      }
    };
    fetchItem();
  }, [id, navigate]);

  const handleUpdate = async (data) => {
    try {
      const ref = doc(db, "items", id);
      await updateDoc(ref, { ...data });
      alert("更新成功！");
      navigate("/admin/items");
    } catch (err) {
      console.error("更新失敗：", err);
      alert("更新失敗，請稍後再試");
    }
  };

  if (!itemData) return null;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-950 text-gray-100 pt-20 px-4 max-w-4xl mx-auto pb-24">
        <h1 className="text-2xl font-bold mb-6">編輯器材內容</h1>
        <ItemForm
          initialData={itemData}
          onSubmit={handleUpdate}
          onCancel={() => navigate("/admin/items")}
        />
        <Footer />
      </div>
    </>
  );
}

export default EditItemPage;
