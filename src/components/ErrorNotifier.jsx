// components/ErrorNotifier.jsx
import React, { useEffect, useState } from "react";


function ErrorNotifier({ error }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (error) {
      setVisible(true);
    }
  }, [error]);

  if (!visible || !error) return null;

  const messages = {
    FIRESTORE_READ: {
      title: "後台讀取錯誤",
      detail: "單兵告報告：後台讀取流量不足，請稍後再試或檢查 Firebase 狀態！",
    },
    FIRESTORE_WRITE: {
      title: "資料寫入失敗",
      detail: "資料可能未儲存成功，請確認網路連線與 Firebase 配額。",
    },
    IMAGE_UPLOAD: {
      title: "圖片上傳失敗",
      detail: "Cloudinary 可能拒收了你的小可愛，請重新上傳或壓縮後再試。",
    },
    TIMEOUT: {
      title: "伺服器回應逾時",
      detail: "等待已久但尚未完成，建議稍後再試。",
    },
    UNKNOWN: {
      title: "未知錯誤",
      detail: "無法辨識的異常狀況，請檢查後台或重新整理頁面。",
    },
    PERMISSION_DENIED: {
      title: "權限不足",
      detail: "單兵告報告：您沒有進行此操作的權限，請聯繫指揮官取得授權。",
    },
    QUOTA_EXCEEDED: {
      title: "Firebase 配額超出",
      detail: "Firebase 免費額度已爆，請等等看它會不會自動 reset（或者先沖杯咖啡）。",
    },
  };

  const msg = messages[error.type] || messages.UNKNOWN;

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-800 text-white px-4 py-3 rounded shadow-lg z-50 w-[90%] max-w-md">
      <strong className="block text-lg mb-1">⚠️ {msg.title}</strong>
      <p className="text-sm whitespace-pre-line">{msg.detail}</p>
      <button
        className="mt-3 px-3 py-1 bg-black text-white rounded border border-gray-600 hover:bg-gray-700"
        onClick={() => setVisible(false)}
      >
        朕知道了。
      </button>
    </div>
  );
}

export default ErrorNotifier;
