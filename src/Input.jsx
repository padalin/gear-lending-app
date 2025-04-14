import React from "react";

function Input({ name, label, value, onChange, type = "text", required = false }) {
  return (
    <div>
      <label htmlFor={name} className="block mb-1 font-medium text-white">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full p-2 rounded bg-gray-800 border border-gray-600 text-white placeholder-gray-400"
      />
    </div>
  );
}

export default Input;
