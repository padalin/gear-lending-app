// scripts/cleanup-cloudinary.mjs
//
// 清理 Cloudinary 上「沒有被任何器材使用」的孤兒照片，回收免費版空間。
// 預設為「乾跑(dry-run)」：只列出會刪哪些、不真的刪。確認無誤後加 DELETE=yes 才會真的刪除。
//
// 密鑰只透過環境變數帶入，不要寫進檔案、不要 commit。
// 取得 key/secret：Cloudinary 後台 → Settings → API Keys。
//
// 用法：
//   先乾跑（看會刪什麼）：
//     CLOUDINARY_API_KEY=你的key CLOUDINARY_API_SECRET=你的secret node scripts/cleanup-cloudinary.mjs
//   確認沒問題後真的刪：
//     CLOUDINARY_API_KEY=你的key CLOUDINARY_API_SECRET=你的secret DELETE=yes node scripts/cleanup-cloudinary.mjs

const CLOUD_NAME      = process.env.CLOUDINARY_CLOUD_NAME || "dsgchndir";
const API_KEY         = process.env.CLOUDINARY_API_KEY;
const API_SECRET      = process.env.CLOUDINARY_API_SECRET;
const PROJECT_ID      = process.env.FIREBASE_PROJECT_ID || "gear-lending";
// items 是公開可讀，用公開的 web API key 即可讀取（這把 key 本來就在前端，公開無妨）
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || "AIzaSyANHn3PUZWqz9_s3YBRudz7A1ywl7_omyU";
// 若你的圖有上傳到某個 Cloudinary 資料夾，填前綴只清那個夾；留空=整個帳號
const FOLDER          = process.env.CLOUDINARY_FOLDER || "";
const DO_DELETE       = process.env.DELETE === "yes";

if (!API_KEY || !API_SECRET) {
  console.error("❌ 缺少 CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET。請在指令前帶入，例如：");
  console.error("   CLOUDINARY_API_KEY=xxx CLOUDINARY_API_SECRET=yyy node scripts/cleanup-cloudinary.mjs");
  process.exit(1);
}

const authHeader = "Basic " + Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64");

// 從 Cloudinary 完整網址取出 public_id（含資料夾、去掉版本號與副檔名）
function publicIdFromUrl(url) {
  if (typeof url !== "string") return null;
  const i = url.indexOf("/upload/");
  if (i === -1) return null;
  let rest = url.slice(i + "/upload/".length); // 例：v123/folder/abc.jpg 或 v123/abc.jpg
  rest = rest.replace(/^v\d+\//, "");          // 去掉 v123/
  rest = rest.replace(/\.[^./]+$/, "");        // 去掉副檔名
  return rest;
}

// 1) 從 Firestore 讀所有器材，蒐集「使用中」的 public_id
async function fetchInUsePublicIds() {
  const inUse = new Set();
  let pageToken = "";
  do {
    const url =
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/items` +
      `?pageSize=300&key=${FIREBASE_API_KEY}` +
      (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`讀取 Firestore 失敗：${res.status} ${await res.text()}`);
    const data = await res.json();
    for (const doc of data.documents || []) {
      const imgs = doc.fields?.images?.arrayValue?.values || [];
      for (const v of imgs) {
        const pid = publicIdFromUrl(v.stringValue);
        if (pid) inUse.add(pid);
      }
    }
    pageToken = data.nextPageToken || "";
  } while (pageToken);
  return inUse;
}

// 2) 列出 Cloudinary 上所有圖片
async function listAllCloudinary() {
  const all = [];
  let cursor = "";
  do {
    const url =
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image?max_results=500&type=upload` +
      (FOLDER ? `&prefix=${encodeURIComponent(FOLDER)}` : "") +
      (cursor ? `&next_cursor=${encodeURIComponent(cursor)}` : "");
    const res = await fetch(url, { headers: { Authorization: authHeader } });
    if (!res.ok) throw new Error(`列出 Cloudinary 失敗：${res.status} ${await res.text()}`);
    const data = await res.json();
    for (const r of data.resources || []) all.push({ public_id: r.public_id, bytes: r.bytes || 0 });
    cursor = data.next_cursor || "";
  } while (cursor);
  return all;
}

// 3) 批次刪除（一次最多 100 個）
async function deleteResources(publicIds) {
  let deleted = 0;
  for (let i = 0; i < publicIds.length; i += 100) {
    const batch = publicIds.slice(i, i + 100);
    const params = batch.map((id) => `public_ids[]=${encodeURIComponent(id)}`).join("&");
    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image/upload?${params}`;
    const res = await fetch(url, { method: "DELETE", headers: { Authorization: authHeader } });
    if (!res.ok) throw new Error(`刪除失敗：${res.status} ${await res.text()}`);
    deleted += batch.length;
    console.log(`  已刪除 ${deleted}/${publicIds.length}`);
  }
  return deleted;
}

(async () => {
  console.log(`雲端帳號：${CLOUD_NAME}　資料庫：${PROJECT_ID}${FOLDER ? `　資料夾前綴：${FOLDER}` : ""}`);
  console.log("讀取資料庫使用中的照片…");
  const inUse = await fetchInUsePublicIds();
  console.log(`  使用中照片：${inUse.size} 張`);

  // 安全防護：使用中為 0 很可能是讀取失敗，停手以免誤刪全部
  if (inUse.size === 0) {
    console.error("⚠️ 使用中照片為 0，為避免誤刪全部，已中止。請確認 Firestore 讀取正常、items 確實有圖片。");
    process.exit(1);
  }

  console.log("列出 Cloudinary 上的照片…");
  const all = await listAllCloudinary();
  console.log(`  Cloudinary 共：${all.length} 張`);

  const orphans = all.filter((r) => !inUse.has(r.public_id));
  const orphanBytes = orphans.reduce((s, r) => s + r.bytes, 0);

  console.log(`\n孤兒照片（沒有任何器材使用）：${orphans.length} 張，約 ${(orphanBytes / 1048576).toFixed(1)} MB`);
  for (const r of orphans) console.log(`  - ${r.public_id}`);

  if (orphans.length === 0) {
    console.log("\n✅ 沒有孤兒照片，無須清理。");
    return;
  }

  if (!DO_DELETE) {
    console.log("\n（這是乾跑，沒有真的刪除。確認上面清單沒問題後，在指令最前面加 DELETE=yes 再跑一次即可刪除。）");
    return;
  }

  console.log(`\n開始刪除 ${orphans.length} 張…`);
  const n = await deleteResources(orphans.map((r) => r.public_id));
  console.log(`\n✅ 完成，已刪除 ${n} 張孤兒照片。`);
})().catch((err) => {
  console.error("❌ 發生錯誤：", err.message);
  process.exit(1);
});
