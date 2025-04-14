// FormCategorySection.jsx
import React from "react";

function FormCategorySection({
  category,
  items,
  expanded,
  onToggle,
  renderItem
}) {
  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left font-mono font-bold text-lg py-2 px-4 bg-gray-100 text-black rounded hover:bg-gray-200"
      >
        {expanded ? "▼" : "▶"} {category}
      </button>

      {expanded && (
        <div className="grid grid-cols-1 gap-4 mt-2">
          {items.map((item) => (
            <div key={item.id} className="">
              {renderItem(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FormCategorySection;