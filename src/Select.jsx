import React from "react";

function Select({ name, label, value, onChange, options = [] }) {
  return (
    <div>
      <label htmlFor={name} className="block mb-1 font-medium text-white">
        {label}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full p-2 rounded bg-gray-800 border border-gray-600 text-white appearance-none focus:outline-none"
      >
        {options.map((option, idx) => (
          <option key={idx} value={option} className="text-black">
            {option || "（未指定）"}
          </option>
        ))}
      </select>
    </div>
  );
}

export default Select;
