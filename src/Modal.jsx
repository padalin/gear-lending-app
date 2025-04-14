// Modal.jsx
import React from "react";

function Modal({ onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 relative">
        {children}
      </div>
    </div>
  );
}

export default Modal;
