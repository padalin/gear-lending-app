// uploadImageToCloudinary.js

// ✅ 無進度條版本
export async function uploadImageToCloudinary(file) {
  const CLOUD_NAME = "dsgchndir"; // 你的 Cloudinary 帳號
  const UPLOAD_PRESET = "gear_lending"; // 你的 unsigned 上傳 preset

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Cloudinary response:", errorText);
    throw new Error("Cloudinary 上傳失敗");
  }

  const data = await response.json();
  return data.secure_url;
}

// ✅ 有進度條版本
export function uploadImageToCloudinaryWithProgress(file, onProgress) {
  const CLOUD_NAME = "dsgchndir";
  const UPLOAD_PRESET = "gear_lending";

  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const res = JSON.parse(xhr.responseText);
        resolve(res.secure_url);
      } else {
        reject(new Error("Cloudinary 上傳失敗"));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Cloudinary 上傳錯誤"));
    };

    xhr.send(formData);
  });
}
