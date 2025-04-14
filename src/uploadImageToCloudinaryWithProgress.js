// src/uploadImageToCloudinaryWithProgress.js

export async function uploadImageToCloudinary(file, onProgress) {
  const CLOUD_NAME = "dsgchndir"; // ✅ 換成你的 Cloudinary 帳號名稱
  const UPLOAD_PRESET = "gear_lending"; // ✅ 你的 unsigned upload preset

  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const xhr = new XMLHttpRequest();

    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`
    );

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && typeof onProgress === "function") {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response.secure_url);
        } catch (err) {
          reject(new Error("Cloudinary 回應解析失敗"));
        }
      } else {
        console.error("❌ Cloudinary 錯誤回應：", xhr.responseText);
        reject(new Error("Cloudinary 上傳失敗"));
      }
    };

    xhr.onerror = () => {
      reject(new Error("無法上傳到 Cloudinary"));
    };

    xhr.send(formData);
  });
}
