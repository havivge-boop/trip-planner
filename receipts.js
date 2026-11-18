// Receipt photos: compressed in the browser and stored in IndexedDB
// (much more room than localStorage). Expenses only keep the receipt id,
// so a future sync (e.g. Firebase Storage) can upload by id.

const DB_NAME = "trip-receipts";
const STORE = "receipts";

let dbPromise = null;
function openDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { dbPromise = null; reject(req.error); };
    });
  }
  return dbPromise;
}

function tx(mode, fn) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

const putLocal = (id, blob) => tx("readwrite", s => s.put(blob, id));
const getLocal = id => tx("readonly", s => s.get(id));
const deleteLocal = id => tx("readwrite", s => s.delete(id));

// When sync is on, photos are also kept in the cloud (see sync.js → receiptRemote).
let remote = null;
export function setReceiptRemote(r) { remote = r; }

export async function putReceipt(id, blob) {
  await putLocal(id, blob);
  if (remote) remote.put(id, blob).catch(e => console.warn("receipt upload failed", e));
}
export async function getReceipt(id) {
  const b = await getLocal(id).catch(() => null);
  if (b || !remote) return b;
  const r = await remote.get(id).catch(() => null);
  if (r) putLocal(id, r).catch(() => {});
  return r;
}
export async function deleteReceipt(id) {
  await deleteLocal(id).catch(() => {});
  if (remote) remote.del(id).catch(() => {});
}
// Upload photos that exist only on this device (first time sync is turned on).
export async function uploadMissingReceipts(ids) {
  if (!remote) return;
  for (const id of ids) {
    try {
      if (await remote.has(id)) continue;
      const b = await getLocal(id);
      if (b) await remote.put(id, b);
    } catch (e) { console.warn("receipt backfill failed", id, e); }
  }
}

// Shrink a photo to max 1600px on the long side, JPEG ~70%.
export function compressImage(file, maxSide = 1600, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error("compress failed"))), "image/jpeg", quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
    img.src = url;
  });
}

// ─── Save to phone ────────────────────────────────────────────────────────────
// iPhone: opens the share sheet ("Save images" / "Save to Files").
// Elsewhere: downloads a single .zip with all receipts.

export async function saveFilesToDevice(files, zipName = "receipts.zip") {
  if (!files.length) return;
  if (navigator.canShare && navigator.canShare({ files })) {
    try { await navigator.share({ files }); return; }
    catch (e) { if (e.name === "AbortError") return; }
  }
  const blob = files.length === 1 ? files[0] : await makeZip(files);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = files.length === 1 ? files[0].name : zipName;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// Minimal ZIP writer (no compression; JPEGs are already compressed).
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function makeZip(files) {
  const enc = new TextEncoder();
  const parts = [], central = [];
  let offset = 0;
  for (const f of files) {
    const data = new Uint8Array(await f.arrayBuffer());
    const name = enc.encode(f.name);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // UTF-8 names
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    parts.push(local, name, data);

    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true);
    cen.setUint16(4, 20, true);
    cen.setUint16(6, 20, true);
    cen.setUint16(8, 0x0800, true);
    cen.setUint32(16, crc, true);
    cen.setUint32(20, data.length, true);
    cen.setUint32(24, data.length, true);
    cen.setUint16(28, name.length, true);
    cen.setUint32(42, offset, true);
    central.push(cen, name);
    offset += 30 + name.length + data.length;
  }
  const cenSize = central.reduce((s, p) => s + p.byteLength, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cenSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end], { type: "application/zip" });
}

export function receiptFileName(exp, idx = 0) {
  const clean = s => String(s || "").replace(/[\\/:*?"<>|\n\r]+/g, " ").trim().slice(0, 40);
  const base = [exp.date, clean(exp.desc), `${exp.amount}EUR`].filter(Boolean).join("_");
  return `${base || "receipt"}${idx ? "_" + idx : ""}.jpg`;
}
