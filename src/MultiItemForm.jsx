import { useState } from "react";
import Navbar from "./Navbar";
import { db } from "./firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const groupByCategory = (list) => {
  const grouped = {};
  list.forEach((item) => {
    if (!grouped[item.category]) {
      grouped[item.category] = [];
    }
    grouped[item.category].push(item);
  });
  return grouped;
};

function MultiItemForm({
  title,
  submitLabel,
  firebaseCollection,
  buttonColor = "blue",
}) {
  const navigate = useNavigate();
  const groupedItems = groupByCategory(items);

  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    note: "",
    selections: items.map((item) => ({
      itemId: item.id,
      itemName: item.name,
      quantity: 0,
    })),
  });

  const [openCategories, setOpenCategories] = useState(
    Object.keys(groupedItems).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {})
  );

  const toggleCategory = (category) => {
    setOpenCategories({
      ...openCategories,
      [category]: !openCategories[category],
    });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleQuantityChange = (itemId, value) => {
    const updated = formData.selections.map((s) =>
      s.itemId === itemId ? { ...s, quantity: parseInt(value) || 0 } : s
    );
    setFormData({ ...formData, selections: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("請輸入姓名(借還需相同)");
      return;
    }

    if (!/^\d{8,}$/.test(formData.contact)) {
      alert("請輸入有效聯絡方式（至少 8 位數字；借還需相同）");
      return;
    }

    const selected = formData.selections.filter((s) => s.quantity > 0);
    if (selected.length === 0) {
      alert("請至少選擇一項器材並指定數量");
      return;
    }

    try {
      const timestamp = Timestamp.now();
      await Promise.all(
        selected.map((s) =>
          addDoc(collection(db, firebaseCollection), {
            itemId: s.itemId,
            itemName: s.itemName,
            quantity: s.quantity,
            name: formData.name,
            contact: formData.contact,
            note: formData.note,
            timestamp,
          })
        )
      );
      navigate("/success");
    } catch (error) {
      console.error("寫入失敗：", error);
      alert("送出失敗，請稍後再試");
    }
  };

  return (
    <>
      <Navbar />
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-xl font-bold mb-4">{title}</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 分類區塊 */}
          {Object.keys(groupedItems).map((category) => (
            <div key={category} className="border rounded mb-4">
              <button
                type="button"
                className="w-full text-left px-4 py-2 bg-gray-100 font-semibold"
                onClick={() => toggleCategory(category)}
              >
                {openCategories[category] ? "▾" : "▸"} {category}
              </button>
              {openCategories[category] && (
                <div className="p-4 space-y-3">
                  {groupedItems[category].map((item) => {
                    const selected = formData.selections.find(
                      (s) => s.itemId === item.id
                    );
                    return (
                      <div key={item.id} className="flex items-center gap-4">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 object-cover border rounded"
                        />
                        <label className="w-64">{item.name}</label>
                        <input
                          type="number"
                          min="0"
                          className="border p-1 w-20 rounded"
                          value={selected.quantity}
                          onChange={(e) =>
                            handleQuantityChange(item.id, e.target.value)
                          }
                          disabled={!item.available}
                        />
                        <span
                          className={item.available ? "text-green-600" : "text-red-600"}
                        >
                          {item.available ? "可借用" : "不可借"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {/* 使用者資料 */}
          <div>
            <label className="block text-sm font-medium">姓名</label>
            <input
              type="text"
              name="name"
              className="w-full border p-2 rounded"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">聯絡方式</label>
            <input
              type="text"
              name="contact"
              className="w-full border p-2 rounded"
              value={formData.contact}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">備註</label>
            <textarea
              name="note"
              rows="3"
              className="w-full border p-2 rounded"
              value={formData.note}
              onChange={handleChange}
            ></textarea>
          </div>

          <button
            type="submit"
            className={`bg-${buttonColor}-600 text-white px-4 py-2 rounded hover:bg-${buttonColor}-700`}
          >
            {submitLabel}
          </button>
        </form>
      </div>
    </>
  );
}

export default MultiItemForm;
