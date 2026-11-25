// Live sync between the two travelers (Firebase Firestore + Google sign-in).
//
// Data layout in Firestore (all under one trip):
//   trips/main/sections/{name}  →  { json: "<JSON of that part of the app>", updatedAt, by }
//   trips/main/receipts/{id}    →  { data: "<base64 jpeg>" }
// Each part of the app (expenses, pins, ...) is its own document. When both of you edit at
// the same time, changes are merged item by item (3-way merge), so nothing gets lost.
// Firebase is loaded only when a config exists (firebase-config.js), so without it the app
// keeps working on this device only, exactly like before.

import { firebaseConfig } from "./firebase-config.js";

export const syncConfigured = !!(firebaseConfig && firebaseConfig.apiKey);
const TRIP = "main";
const BASE_KEY = "tripv4-syncbase";

let fb = null; // { auth, db, fs, authMod }
async function ensureFirebase() {
  if (fb) return fb;
  const [{ initializeApp }, authMod, fs] = await Promise.all([
    import("firebase/app"), import("firebase/auth"), import("firebase/firestore"),
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = authMod.getAuth(app);
  await authMod.setPersistence(auth, authMod.browserLocalPersistence).catch(() => {});
  const db = fs.initializeFirestore(app, { ignoreUndefinedProperties: true });
  authMod.getRedirectResult(auth).catch(() => {}); // finish a redirect sign-in, if one is in progress
  fb = { auth, db, fs, authMod };
  return fb;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export async function onAuth(cb) {
  if (!syncConfigured) { cb(null); return () => {}; }
  const { auth, authMod } = await ensureFirebase();
  return authMod.onAuthStateChanged(auth, cb);
}
export async function signIn() {
  const { auth, authMod } = await ensureFirebase();
  const provider = new authMod.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    return await authMod.signInWithPopup(auth, provider);
  } catch (e) {
    // Home-screen app on iPhone sometimes can't open a popup – fall back to a full-page redirect.
    if (/popup-blocked|operation-not-supported|web-storage-unsupported/.test(String(e?.code))) return authMod.signInWithRedirect(auth, provider);
    throw e;
  }
}
export async function signOutUser() {
  const { auth, authMod } = await ensureFirebase();
  return authMod.signOut(auth);
}

// ─── 3-way merge ──────────────────────────────────────────────────────────────
// base = what we last saw from the cloud, local = this device now, remote = cloud now.
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isIdArray = v => Array.isArray(v) && v.every(x => x && typeof x === "object" && "id" in x);
const isObj = v => v && typeof v === "object" && !Array.isArray(v);

export function merge3(base, local, remote) {
  const fresh = base === undefined; // never synced this before (e.g. a new phone)
  if (same(local, remote)) return remote;
  if (same(base, local)) return remote; // we changed nothing → take theirs
  if (same(base, remote)) return local; // they changed nothing → take ours
  if (base === undefined) base = Array.isArray(local) ? [] : isObj(local) ? {} : undefined;

  if ((isIdArray(local) || isIdArray(remote)) && Array.isArray(local) && Array.isArray(remote)) {
    const b = new Map((Array.isArray(base) ? base : []).map(x => [x.id, x]));
    const l = new Map(local.map(x => [x.id, x]));
    const out = [];
    const seen = new Set();
    remote.forEach(r => {
      seen.add(r.id);
      const inBase = b.has(r.id), inLocal = l.has(r.id);
      if (inBase && !inLocal) return; // we deleted it
      if (inLocal) out.push(merge3(b.get(r.id), l.get(r.id), r));
      else out.push(r);
    });
    local.forEach((x, i) => {
      if (seen.has(x.id) || b.has(x.id)) return; // exists remotely, or they deleted it
      // new on this device: keep its position roughly
      out.splice(Math.min(i, out.length), 0, x);
    });
    return out;
  }
  if (isObj(local) && isObj(remote)) {
    const b = isObj(base) ? base : {};
    const out = {};
    new Set([...Object.keys(remote), ...Object.keys(local)]).forEach(k => {
      const inL = k in local, inR = k in remote, inB = k in b;
      if (inL && inR) out[k] = merge3(b[k], local[k], remote[k]);
      else if (inR && !inL) { if (!inB || !same(b[k], remote[k])) out[k] = remote[k]; } // we deleted unless they changed it
      else if (inL && !inR) { if (!inB || !same(b[k], local[k])) out[k] = local[k]; }
    });
    return out;
  }
  // plain values: this device wins, except on a device that never synced (then the cloud wins)
  return fresh ? remote : local;
}

// ─── Sections ─────────────────────────────────────────────────────────────────
function loadBase() { try { return JSON.parse(localStorage.getItem(BASE_KEY)) || {}; } catch { return {}; } }
function saveBase(b) { try { localStorage.setItem(BASE_KEY, JSON.stringify(b)); } catch {} }

// Starts syncing. getLocal(name) → current value, applyRemote(name, value) → set state.
// Returns { push(name), stop() }.
export async function startSync({ names, getLocal, applyRemote, onStatus, user }) {
  const { db, fs } = await ensureFirebase();
  const col = fs.collection(db, "trips", TRIP, "sections");
  const base = loadBase();
  const pending = new Set();
  let firstSnapshot = true;

  const push = async name => {
    if (pending.has(name)) return;
    pending.add(name);
    onStatus("syncing");
    try {
      const ref = fs.doc(col, name);
      const merged = await fs.runTransaction(db, async tx => {
        const snap = await tx.get(ref);
        const remote = snap.exists() ? JSON.parse(snap.data().json) : undefined;
        const local = getLocal(name);
        const value = remote === undefined ? local : merge3(base[name], local, remote);
        if (remote === undefined || !same(value, remote)) {
          const json = JSON.stringify(value ?? null);
          if (json.length > 900000) throw new Error(`too-big:${name}`);
          tx.set(ref, { json, updatedAt: fs.serverTimestamp(), by: user?.email || "" });
        }
        return value;
      });
      base[name] = merged;
      saveBase(base);
      if (!same(merged, getLocal(name))) applyRemote(name, merged);
      onStatus("ok");
    } catch (e) {
      console.warn("sync push failed", name, e);
      onStatus(String(e?.code || e?.message).includes("permission") ? "denied" : "error");
    } finally {
      pending.delete(name);
    }
  };

  const unsub = fs.onSnapshot(col, snap => {
    const seenNames = new Set();
    snap.docs.forEach(d => {
      seenNames.add(d.id);
      if (!names.includes(d.id) || d.metadata.hasPendingWrites) return;
      const remote = JSON.parse(d.data().json);
      if (same(remote, base[d.id])) return;
      const local = getLocal(d.id);
      const merged = merge3(base[d.id], local, remote);
      base[d.id] = remote;
      saveBase(base);
      if (!same(merged, local)) applyRemote(d.id, merged);
      if (!same(merged, remote)) push(d.id); // we had changes they don't have yet
    });
    if (firstSnapshot) {
      firstSnapshot = false;
      // sections that don't exist in the cloud yet: upload what this device has
      names.filter(n => !seenNames.has(n)).forEach(n => push(n));
    }
    onStatus("ok");
  }, e => {
    console.warn("sync listen failed", e);
    onStatus(String(e?.code || e?.message).includes("permission") ? "denied" : "error");
  });

  return { push, stop: unsub, isSynced: name => same(base[name], getLocal(name)) };
}

// ─── Receipts (photos) ────────────────────────────────────────────────────────
const toB64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(blob); });
const fromB64 = b64 => { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: "image/jpeg" }); };

export async function receiptRemote() {
  const { db, fs } = await ensureFirebase();
  const ref = id => fs.doc(db, "trips", TRIP, "receipts", id);
  return {
    async get(id) { const s = await fs.getDoc(ref(id)); return s.exists() ? fromB64(s.data().data) : null; },
    async put(id, blob) { await fs.setDoc(ref(id), { data: await toB64(blob) }); },
    async del(id) { await fs.deleteDoc(ref(id)); },
    async has(id) { return (await fs.getDoc(ref(id))).exists(); },
  };
}
