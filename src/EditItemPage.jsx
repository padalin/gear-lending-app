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
      
      // 成功更新後帶著滾動位置返回
      alert("更新成功！");
      
      // 從localStorage獲取保存的滾動位置
      const savedPosition = localStorage.getItem('adminItemsScrollPosition');
      
      // 導航回列表頁
      navigate("/admin/items", { replace: true });
      
      // 如果有保存的位置，在下一個事件循環中恢復滾動位置
      if (savedPosition) {
        setTimeout(() => {
          window.scrollTo(0, parseInt(savedPosition));
        }, 100);
      }
    } catch (err) {
      console.error("更新失敗：", err);
      alert("更新失敗，請稍後再試");
    }
  };

  if (!itemData) return null;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-950 text-gray-100 pt-20 px-4 pb-32">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">編輯器材內容</h1>
          
          <button
            onClick={() => {
              // 返回時恢復滾動位置
              const savedPosition = localStorage.getItem('adminItemsScrollPosition');
              navigate("/admin/items");
              if (savedPosition) {
                setTimeout(() => {
                  window.scrollTo(0, parseInt(savedPosition));
                }, 100);
              }
            }}
            className="mb-6 text-gray-300 hover:text-white hover:underline"
          >
            ← 返回上一層
          </button>
          
          <div className="pb-20"> {/* 增加額外底部間距容器 */}
            <ItemForm
              initialData={itemData}
              onSubmit={handleUpdate}
              onCancel={() => {
                // 取消時也恢復滾動位置
                const savedPosition = localStorage.getItem('adminItemsScrollPosition');
                navigate("/admin/items");
                if (savedPosition) {
                  setTimeout(() => {
                    window.scrollTo(0, parseInt(savedPosition));
                  }, 100);
                }
              }}
            />
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default EditItemPage;