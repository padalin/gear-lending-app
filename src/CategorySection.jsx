// CategorySection.jsx
import React from "react";
import ItemCard from "./ItemCard";

function CategorySection({ category, items, expanded, onToggle, isAdmin, onEdit, onDelete }) {

  // 在這裡進行英數升冪排序 (不影響原本的items)
  const sortedItems = [...items].sort((a, b) => 
    a.label.localeCompare(b.label, 'en', { numeric: true })
  );

  return (
    <div className="mb-2">
      <button
        className="w-full text-left font-mono font-bold text-lg py-1 px-1 bg-gray-800 text-white rounded hover:bg-gray-700 mb-2 border border-white/10"
        onClick={onToggle}
      >
        {expanded ? "▼" : "▶"} {category}（{items.length}）
      </button>

      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-2">
          {sortedItems.map((item) => (   // 這裡使用排序後的sortedItems
            <ItemCard
              key={item.id}
              item={item}
              isAdmin={isAdmin}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default CategorySection;
