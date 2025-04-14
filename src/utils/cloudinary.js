export async function uploadImageToCloudinary(file) {
  const url = `https://api.cloudinary.com/v1_1/dsgchndir/image/upload`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "gear_lending");
  formData.append("folder", "gear-app");

  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json();
    console.error("Cloudinary upload error:", error);
    throw new Error("圖片上傳失敗");
  }

  const data = await res.json();
  return data.secure_url;
}
