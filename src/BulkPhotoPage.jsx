// src/BulkPhotoPage.jsx
// 批次照片上架：拖一批照片進來 → 預覽 → 配對到器材（檔名自動配 + 可搜尋手動選）
// → 一次上傳到 Cloudinary（沿用 uploadImageToCloudinary 的 env 設定，不含密鑰）
// → 寫回各器材的 images。
import React, { useEffect, useMemo, useRef, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs, doc, writeBatch } from "firebase/firestore";
import imageCompression from "browser-image-compression";
import heic2any from "heic2any";
import { uploadImageToCloudinary } from "./uploadImageToCloudinaryWithProgress";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useNavigate } from "react-router-dom";

// 偵測 HEIC（即使副檔名被存成 .jpg 也能認出，看檔頭 ftyp）
async function isHeicContent(file) {
  try {
    const buf = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
      const brand = String.fromCharCode(buf[8], buf[9], buf[10], buf[11]).toLowerCase();
      return ["heic", "heix", "hevc", "hevx", "mif1", "msf1", "heim", "heis", "hevm", "hevs"].includes(brand);
    }
  } catch (_) {}
  return false;
}

// 轉檔（HEIC→JPEG）+ 壓縮，產出可預覽也可上傳的檔案
async function processFile(file) {
  let working = file;
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const heic = ext === "heic" || ext === "heif" || (await isHeicContent(file));
  if (heic) {
    try {
      const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.8 });
      const jpeg = Array.isArray(out) ? out[0] : out;
      working = new File([jpeg], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
    } catch (_) {
      // 轉檔失敗就用原檔，至少不中斷
    }
  }
  if (working.size > 1024 * 1024) {
    try {
      working = await imageCompression(working, { maxSizeMB: 1, maxWidthOrHeight: 1280, useWebWorker: true });
    } catch (_) {}
  }
  return working;
}

// 從檔名推測器材編號：去副檔名 + 去掉 -1 / _2 這種「複數張」後綴（用分隔符避免誤刪結尾數字，如 J45）
function baseLabelFromName(filename) {
  let n = filename.replace(/\.[^.]+$/, "");
  n = n.replace(/[-_]\d+$/, "");
  return n.trim();
}

// 可搜尋的器材選擇器（用於底部「批次指定」列；下拉往上開）
function ItemPicker({ items, onPick, placeholder }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return items
      .filter((it) => `${it.label || ""} ${it.brand || ""} ${it.model || ""} ${it.category || ""}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, items]);
  return (
    <div className="relative flex-1 min-w-0">
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full bg-gray-900 border border-gray-600 text-white text-sm p-2 rounded placeholder-gray-500"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-40 left-0 right-0 bottom-full mb-1 bg-gray-800 border border-gray-600 rounded max-h-48 overflow-auto">
          {results.map((it) => (
            <li key={it.id}>
              <button
                onClick={() => { onPick(it.id); setOpen(false); setQuery(""); }}
                className="w-full text-left px-2 py-1 text-sm hover:bg-gray-700"
              >
                <span className="text-white">{it.label}</span>{" "}
                <span className="text-gray-400 text-xs">{it.brand} {it.model}　{it.category}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PhotoCard({ photo, items, onAssign, onRemove, selected, onToggleSelect }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const assigned = items.find((it) => it.id === photo.itemId);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return items
      .filter((it) => `${it.label || ""} ${it.brand || ""} ${it.model || ""} ${it.category || ""}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, items]);

  return (
    <div className={`flex gap-3 border rounded bg-gray-900 p-3 ${selected ? "border-blue-500" : "border-gray-700"}`}>
      <input type="checkbox" checked={selected} onChange={() => onToggleSelect(photo.id)} className="mt-1 self-start w-4 h-4" />
      <div className="w-24 h-24 flex-shrink-0 bg-gray-800 rounded overflow-hidden flex items-center justify-center">
        {photo.status === "processing" ? (
          <span className="text-xs text-gray-400">處理中…</span>
        ) : photo.previewUrl ? (
          <img src={photo.previewUrl} alt={photo.name} className="object-cover w-full h-full" />
        ) : (
          <span className="text-xs text-red-400">無法預覽</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-gray-400 truncate">{photo.name}</p>
          <button onClick={() => onRemove(photo.id)} className="text-red-400 hover:text-red-600 text-xs whitespace-nowrap">移除</button>
        </div>

        {assigned ? (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-green-400">→ {assigned.label}</span>
            <span className="text-xs text-gray-500">{assigned.brand} {assigned.model}</span>
            <button onClick={() => onAssign(photo.id, null)} className="text-xs text-gray-400 hover:text-white underline">改</button>
          </div>
        ) : (
          <div className="mt-2 relative">
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              placeholder="搜尋器材（名稱/品牌/型號）指定"
              className="w-full bg-gray-800 border border-gray-600 text-white text-sm p-2 rounded placeholder-gray-500"
            />
            {open && results.length > 0 && (
              <ul className="absolute z-20 left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded max-h-48 overflow-auto">
                {results.map((it) => (
                  <li key={it.id}>
                    <button
                      onClick={() => { onAssign(photo.id, it.id); setOpen(false); setQuery(""); }}
                      className="w-full text-left px-2 py-1 text-sm hover:bg-gray-700"
                    >
                      <span className="text-white">{it.label}</span>{" "}
                      <span className="text-gray-400 text-xs">{it.brand} {it.model}　{it.category}　現{it.images?.length || 0}張</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BulkPhotoPage({ embedded = false }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [photos, setPhotos] = useState([]); // {id,name,raw,file,previewUrl,status,itemId}
  const [replaceMode, setReplaceMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef();
  const counterRef = useRef(0);
  const itemsRef = useRef([]);
  itemsRef.current = items;

  const [selected, setSelected] = useState(new Set());
  const toggleSelect = (id) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const clearSelection = () => setSelected(new Set());
  const selectAllReady = () => setSelected(new Set(photos.filter((p) => p.status === "ready").map((p) => p.id)));
  const bulkAssign = (itemId) => {
    setPhotos((prev) => prev.map((p) => (selected.has(p.id) && p.status === "ready" ? { ...p, itemId } : p)));
    clearSelection();
  };

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "items"));
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.label || "").localeCompare(b.label || "", "zh-Hant", { numeric: true }));
        setItems(list);
      } catch (e) {
        setError("讀取器材清單失敗：" + e.message);
      } finally {
        setLoadingItems(false);
      }
    })();
  }, []);

  const addFiles = async (fileList) => {
    setResult(null);
    setError("");
    const files = Array.from(fileList).filter(
      (f) => (f.type && f.type.startsWith("image/")) || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name)
    );
    if (files.length === 0) return;

    const newOnes = files.map((f) => ({
      id: `p${++counterRef.current}`,
      name: f.name,
      raw: f,
      file: null,
      previewUrl: null,
      status: "processing",
      itemId: null,
    }));
    setPhotos((prev) => [...prev, ...newOnes]);

    for (const p of newOnes) {
      try {
        const processed = await processFile(p.raw);
        const previewUrl = URL.createObjectURL(processed);
        const base = baseLabelFromName(p.name).toLowerCase();
        const match = itemsRef.current.find((it) => (it.label || "").trim().toLowerCase() === base);
        setPhotos((prev) =>
          prev.map((x) =>
            x.id === p.id ? { ...x, file: processed, previewUrl, status: "ready", itemId: match ? match.id : null } : x
          )
        );
      } catch (e) {
        setPhotos((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: "error" } : x)));
      }
    }
  };

  const handleAssign = (photoId, itemId) => {
    setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, itemId } : p)));
  };

  const handleRemove = (photoId) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === photoId);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== photoId);
    });
    setSelected((prev) => {
      const n = new Set(prev);
      n.delete(photoId);
      return n;
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  };

  const counts = useMemo(() => {
    const ready = photos.filter((p) => p.status === "ready");
    const assigned = ready.filter((p) => p.itemId);
    return {
      total: photos.length,
      processing: photos.filter((p) => p.status === "processing").length,
      assigned: assigned.length,
      unassigned: ready.length - assigned.length,
    };
  }, [photos]);

  const handleUpload = async () => {
    setError("");
    setResult(null);
    const toUpload = photos.filter((p) => p.status === "ready" && p.itemId && p.file);
    if (toUpload.length === 0) {
      setError("目前沒有「已配對」的照片可上傳。請先把照片指定到器材。");
      return;
    }
    setUploading(true);
    setProgress({ done: 0, total: toUpload.length });

    const byItem = {};
    const failedIds = new Set();
    for (const p of toUpload) {
      try {
        const url = await uploadImageToCloudinary(p.file);
        (byItem[p.itemId] = byItem[p.itemId] || []).push(url);
      } catch (e) {
        failedIds.add(p.id);
      } finally {
        setProgress((pr) => ({ ...pr, done: pr.done + 1 }));
      }
    }

    try {
      const affected = Object.keys(byItem);
      if (affected.length > 0) {
        const batch = writeBatch(db);
        for (const id of affected) {
          const it = items.find((x) => x.id === id);
          const existing = Array.isArray(it?.images) ? it.images : [];
          const finalImages = replaceMode ? byItem[id] : [...existing, ...byItem[id]];
          batch.update(doc(db, "items", id), { images: finalImages });
        }
        await batch.commit();
        setItems((prev) =>
          prev.map((it) =>
            affected.includes(it.id)
              ? { ...it, images: replaceMode ? byItem[it.id] : [...(Array.isArray(it.images) ? it.images : []), ...byItem[it.id]] }
              : it
          )
        );
      }

      setResult({
        uploaded: toUpload.length - failedIds.size,
        items: Object.keys(byItem).length,
        failed: toUpload.filter((p) => failedIds.has(p.id)).map((p) => p.name),
        mode: replaceMode ? "取代" : "附加",
      });

      // 清掉已成功的卡片，保留失敗的與未配對的
      setPhotos((prev) =>
        prev.filter((p) => {
          const wasUploadedOk = p.status === "ready" && p.itemId && p.file && !failedIds.has(p.id);
          if (wasUploadedOk && p.previewUrl) URL.revokeObjectURL(p.previewUrl);
          return !wasUploadedOk;
        })
      );
      clearSelection();
    } catch (e) {
      setError("照片已上傳，但寫入資料庫失敗：" + e.message + "（可重試一次）");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={embedded ? "text-white" : "min-h-screen bg-gray-950 text-white"}>
      {!embedded && <Navbar />}
      <main className={embedded ? "pb-32" : "pt-20 px-4 max-w-5xl mx-auto pb-32"}>
        {!embedded && <h1 className="text-2xl font-bold mb-2">批次照片上架</h1>}
        {!embedded && (
          <button onClick={() => navigate("/admin/items")} className="mb-4 text-gray-300 hover:text-white hover:underline">
            ← 返回器材管理
          </button>
        )}

        <div className="text-sm text-gray-400 mb-4 leading-relaxed">
          拖一批照片進來 → 系統自動轉檔(含 HEIC)、產生預覽。每張用搜尋指定到器材；
          <span className="text-gray-200">同一器材的多張照片，把它們「勾選」起來，在下方一次指定即可</span>（檔名不必相同）。
          檔名若剛好等於器材 label 也會自動配對，但非必要。
        </div>

        {/* 上傳模式 */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <span className="text-sm text-gray-300">寫入方式：</span>
          <label className="flex items-center gap-1 text-sm">
            <input type="radio" name="mode" checked={!replaceMode} onChange={() => setReplaceMode(false)} />
            附加到現有照片
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input type="radio" name="mode" checked={replaceMode} onChange={() => setReplaceMode(true)} />
            取代原有照片
          </label>
        </div>

        {/* 拖放區 */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="w-full p-8 border-2 border-dashed border-gray-600 rounded text-center text-gray-400 hover:bg-gray-900 cursor-pointer mb-4"
        >
          📥 點擊或拖曳照片到這裡（可一次多張，支援 HEIC/JPG/PNG）
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.heic,.heif,.jpg,.jpeg,.png,.webp"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />

        {error && <p className="text-red-400 border border-red-500 bg-red-900/20 rounded p-2 mb-4">{error}</p>}

        {result && (
          <div className="text-green-300 border border-green-700 bg-green-900/20 rounded p-3 mb-4 text-sm">
            ✅ 完成：上傳 {result.uploaded} 張到 {result.items} 個器材（{result.mode}）。
            {result.failed.length > 0 && (
              <div className="text-red-300 mt-1">失敗 {result.failed.length} 張：{result.failed.join("、")}</div>
            )}
          </div>
        )}

        {/* 統計 */}
        {photos.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-300 mb-2">
            <span>共 {counts.total} 張</span>
            {counts.processing > 0 && <span className="text-yellow-400">處理中 {counts.processing}</span>}
            <span>已配對 <span className="text-green-400">{counts.assigned}</span></span>
            <span>未配對 <span className="text-red-400">{counts.unassigned}</span></span>
            <span className="text-blue-300">已勾選 {selected.size}</span>
            <button onClick={selectAllReady} className="text-xs underline text-gray-300 hover:text-white">全選</button>
            <button onClick={clearSelection} className="text-xs underline text-gray-300 hover:text-white">清除勾選</button>
          </div>
        )}

        {/* 照片清單 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {photos.map((p) => (
            <PhotoCard
              key={p.id}
              photo={p}
              items={items}
              onAssign={handleAssign}
              onRemove={handleRemove}
              selected={selected.has(p.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>

        {loadingItems && <p className="text-gray-400 mt-4">載入器材清單中…</p>}
      </main>

      {/* 底部上傳列 */}
      {photos.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 border-t border-gray-700 p-3">
          <div className="max-w-5xl mx-auto space-y-2">
            {selected.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-300 whitespace-nowrap">已勾選 {selected.size} 張 →</span>
                <ItemPicker items={items} onPick={bulkAssign} placeholder="搜尋器材，一次指定給勾選的照片" />
                <button onClick={clearSelection} className="text-xs text-gray-300 underline whitespace-nowrap">清除</button>
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-300">
                {uploading ? `上傳中… ${progress.done}/${progress.total}` : `準備上傳 ${counts.assigned} 張（${replaceMode ? "取代" : "附加"}）`}
              </span>
              <button
                onClick={handleUpload}
                disabled={uploading || counts.assigned === 0 || counts.processing > 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded"
              >
                {uploading ? "上傳中…" : "開始上傳"}
              </button>
            </div>
          </div>
        </div>
      )}
      {!embedded && <Footer />}
    </div>
  );
}
