// CategorySection.jsx
import React from "react";
import ItemCard from "./ItemCard";

function CategorySection({ category, items, expanded, onToggle, isAdmin, onEdit, onDelete, view = "grid" }) {

  // 在這裡進行英數升冪排序 (不影響原本的items)
  const sortedItems = [...items].sort((a, b) =>
    (a.label || "").localeCompare(b.label || "", 'en', { numeric: true })
  );

  return (
    <div className="mb-2">
      <button
        className="w-full text-left text-sm font-semibold py-1.5 px-2 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 mb-1.5 border border-white/10"
        onClick={onToggle}
      >
        {expanded ? "▼" : "▶"} {category}（{items.length}）
      </button>

      {expanded && (
        <div className={view === "list" ? "flex flex-col gap-2" : "grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-2"}>
          {sortedItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              isAdmin={isAdmin}
              onEdit={onEdit}
              onDelete={onDelete}
              view={view}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default CategorySection;
