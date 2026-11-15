import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { putReceipt, getReceipt, deleteReceipt, compressImage, saveFilesToDevice, receiptFileName } from "./receipts.js";

// Fix default marker icons for Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const TRIP_START = new Date("2027-05-03");

const COUNTRIES = [
  { name: "בולגריה", emoji: "🇧🇬", weeks: 1, color: "#f97316", lat: 42.7, lng: 25.5 },
  { name: "יוון",    emoji: "🇬🇷", weeks: 2, color: "#3b82f6", lat: 39.5, lng: 22.0 },
  { name: "אלבניה", emoji: "🇦🇱", weeks: 1, color: "#ef4444", lat: 41.1, lng: 20.2 },
  { name: "מונטנגרו",emoji: "🇲🇪", weeks: 1, color: "#10b981", lat: 42.7, lng: 19.4 },
  { name: "קרואטיה", emoji: "🇭🇷", weeks: 2, color: "#e63946", lat: 45.1, lng: 15.5 },
  { name: "סלובניה", emoji: "🇸🇮", weeks: 1, color: "#22c55e", lat: 46.1, lng: 14.8 },
  { name: "אוסטריה", emoji: "🇦🇹", weeks: 2, color: "#dc2626", lat: 47.5, lng: 14.5 },
  { name: "איטליה",  emoji: "🇮🇹", weeks: 2, color: "#16a34a", lat: 45.5, lng: 11.0 },
  { name: "שוויץ",   emoji: "🇨🇭", weeks: 3, color: "#f43f5e", lat: 46.8, lng: 8.2  },
  { name: "נורווגיה",emoji: "🇳🇴", weeks: 3, color: "#1d4ed8", lat: 61.0, lng: 8.5  },
  { name: "שוודיה",  emoji: "🇸🇪", weeks: 1, color: "#0284c7", lat: 62.0, lng: 15.0 },
  { name: "דנמרק",   emoji: "🇩🇰", weeks: 1, color: "#be123c", lat: 56.0, lng: 10.0 },
];

const PIN_CATS = [
  { id: "accommodation", label: "לינה",    icon: "🏨", color: "#6366f1" },
  { id: "food",          label: "אוכל",    icon: "🍽️", color: "#f59e0b" },
  { id: "hike",          label: "טיול",    icon: "🥾", color: "#10b981" },
  { id: "attraction",    label: "אטרקציה", icon: "🏛️", color: "#8b5cf6" },
  { id: "viewpoint",     label: "תצפית",   icon: "📸", color: "#06b6d4" },
  { id: "other",         label: "אחר",     icon: "💡", color: "#94a3b8" },
];

const EXPENSE_CATS = [
  { id: "accommodation", label: "לינה",      icon: "🏨", color: "#6366f1" },
  { id: "food",          label: "אוכל",      icon: "🍽️", color: "#f59e0b" },
  { id: "transport",     label: "תחבורה",    icon: "🚌", color: "#06b6d4" },
  { id: "activity",      label: "פעילות",    icon: "🎯", color: "#10b981" },
  { id: "gear",          label: "ציוד",      icon: "🎒", color: "#8b5cf6" },
  { id: "health",        label: "בריאות",    icon: "💊", color: "#ef4444" },
  { id: "other",         label: "אחר",       icon: "💡", color: "#94a3b8" },
];

const GEAR_ITEMS = {
  "📄 מסמכים": [
    { id: "passport",  text: "דרכון בתוקף (6 חודשים לפחות אחרי חזרה)" },
    { id: "id",        text: "תעודת זהות" },
    { id: "insurance", text: "ביטוח נסיעות מלא" },
    { id: "eurail",    text: "Eurail / InterRail Pass" },
    { id: "cloud",     text: "סריקות תעודות בגוגל דרייב" },
    { id: "mfa",       text: "רישום משרד החוץ" },
  ],
  "🎒 תרמיל": [
    { id: "bigpack",   text: "תרמיל 50–60 ליטר" },
    { id: "daypack",   text: "תרמיל יום 20–25 ליטר" },
    { id: "sleepbag",  text: "שק שינה קיץ קל" },
    { id: "sleepsheet",text: "סדין שינה להוסטלים" },
    { id: "lock",      text: "מנעול לכבאגז'" },
    { id: "towel",     text: "מגבת מיקרופייבר" },
    { id: "adapter",   text: "מתאם חשמל אירופאי" },
    { id: "powerbank", text: "פאוורבנק גדול (20,000 mAh)" },
  ],
  "👟 ביגוד": [
    { id: "hikeshoes", text: "נעלי הליכה / טיפוס" },
    { id: "sandals",   text: "כפכפים" },
    { id: "rain",      text: "ז'קט גשם (waterproof)" },
    { id: "midlayer",  text: "ז'קט פליז / דאון" },
    { id: "clothes5",  text: "בגדים ל-5 ימים" },
    { id: "swimsuit",  text: "בגד ים" },
  ],
  "💊 בריאות": [
    { id: "firstaid",  text: "ערכת עזרה ראשונה" },
    { id: "meds",      text: "תרופות אישיות" },
    { id: "sunscreen", text: "קרם הגנה" },
    { id: "insect",    text: "ספריי יתושים" },
    { id: "diarrhea",  text: "תרופות לשלשול / עצירות" },
  ],
};

const ACCOMMODATION_TYPES = ["הוסטל", "בקתה", "Airbnb", "מלון", "קמפינג", "אחר"];

const DAILY_BUDGET = {
  בולגריה: 40, יוון: 70, אלבניה: 35, מונטנגרו: 55,
  קרואטיה: 65, סלובניה: 65, אוסטריה: 90, איטליה: 80,
  שוויץ: 130, נורווגיה: 130, שוודיה: 100, דנמרק: 110,
};

// ─── UTILS ────────────────────────────────────────────────────────────────────

const KEY = "tripv4";
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const persist = (d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {} };

function getDates(countries) {
  let d = new Date(TRIP_START);
  return countries.map(c => {
    const start = new Date(d);
    d.setDate(d.getDate() + c.weeks * 7);
    return { start, end: new Date(d.getTime() - 86400000) };
  });
}
const fmt = d => d.toLocaleDateString("he-IL", { day: "numeric", month: "short" });
const fmtDate = d => new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "2-digit" });

// ─── THEME ────────────────────────────────────────────────────────────────────

const T = {
  bg: "#070a12",
  surface: "linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.035))",
  surfaceBorder: "rgba(255,255,255,0.10)",
  surfaceHover: "rgba(255,255,255,0.09)",
  primary: "#5b8cff",
  primaryDim: "rgba(91,140,255,0.16)",
  primaryBorder: "rgba(91,140,255,0.40)",
  grad: "linear-gradient(135deg, #7c5cff 0%, #5b8cff 55%, #22c3e6 100%)",
  accent: "#ff8a3d",
  text: "#eef2ff",
  muted: "#8b95ab",
  faint: "rgba(14,19,34,0.75)",
  navBg: "rgba(13,17,30,0.72)",
  green: "#34d399",
  red: "#f87171",
};

const card = (extra = {}) => ({
  background: T.surface, border: `1px solid ${T.surfaceBorder}`,
  borderRadius: 18, padding: "14px 16px", marginBottom: 10,
  boxShadow: "0 10px 30px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)",
  ...extra,
});

const glass = (extra = {}) => ({
  background: T.navBg, border: `1px solid ${T.surfaceBorder}`,
  backdropFilter: "blur(20px) saturate(160%)", WebkitBackdropFilter: "blur(20px) saturate(160%)",
  ...extra,
});

const inputStyle = (extra = {}) => ({
  width: "100%", background: T.faint, border: `1px solid ${T.surfaceBorder}`, borderRadius: 12,
  color: T.text, fontFamily: "'Heebo',sans-serif", fontSize: 16, padding: "10px 12px", boxSizing: "border-box", ...extra,
});

const chip = (active, color = T.primary, extra = {}) => ({
  background: active ? color : "rgba(255,255,255,0.06)",
  border: `1px solid ${active ? "transparent" : T.surfaceBorder}`, borderRadius: 20, color: "#fff",
  padding: "6px 12px", cursor: "pointer", fontSize: 13, whiteSpace: "nowrap",
  fontFamily: "'Heebo',sans-serif", flexShrink: 0, transition: "background .2s, transform .15s", ...extra,
});

const primaryBtn = (extra = {}) => ({
  width: "100%", background: T.grad, border: "none", borderRadius: 14, color: "#fff", padding: "12px",
  cursor: "pointer", fontFamily: "'Heebo',sans-serif", fontWeight: 700, fontSize: 15,
  boxShadow: "0 8px 24px rgba(91,140,255,0.35)", ...extra,
});

const GLOBAL_CSS = `
html, body, #root { height: 100%; margin: 0; background: #070a12; }
body {
  background:
    radial-gradient(60vmax 60vmax at 110% -10%, rgba(124,92,255,0.22), transparent 60%),
    radial-gradient(50vmax 50vmax at -20% 30%, rgba(34,195,230,0.14), transparent 60%),
    radial-gradient(60vmax 50vmax at 50% 120%, rgba(91,140,255,0.16), transparent 60%),
    #070a12;
  background-attachment: fixed;
  overscroll-behavior: none;
}
* { -webkit-tap-highlight-color: transparent; }
button { transition: transform .15s ease, background .2s ease, opacity .2s ease; }
button:active { transform: scale(0.96); }
input, select, textarea { font-size: 16px !important; outline: none; transition: border-color .2s, box-shadow .2s; }
input:focus, select:focus, textarea:focus { border-color: rgba(91,140,255,0.6) !important; box-shadow: 0 0 0 3px rgba(91,140,255,0.15); }
input::placeholder, textarea::placeholder { color: #6b7590; }
select option { background: #121829; }
::-webkit-scrollbar { width: 0; height: 0; }
.scr { -webkit-overflow-scrolling: touch; }
@keyframes inFromLeft  { from { opacity: 0; transform: translateX(-28px); } to { opacity: 1; transform: none; } }
@keyframes inFromRight { from { opacity: 0; transform: translateX(28px); }  to { opacity: 1; transform: none; } }
@keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes sheetUp { from { transform: translateY(100%); } to { transform: none; } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.enter-left  { animation: inFromLeft  .34s cubic-bezier(.2,.8,.2,1) backwards; }
.enter-right { animation: inFromRight .34s cubic-bezier(.2,.8,.2,1) backwards; }
.map-in { animation: fadeIn .3s ease backwards; }
.fade-up { animation: fadeUp .3s cubic-bezier(.2,.8,.2,1) backwards; }
.leaflet-container { background: #0e1322; font-family: 'Heebo', sans-serif; }
.leaflet-popup-content-wrapper, .leaflet-popup-tip { border-radius: 14px; }
`;

// Bottom sheet / modal
function Sheet({ onClose, children, title }) {
  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(3,5,10,0.6)", animation: "fadeIn .2s both", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} className="scr" style={{
        ...glass({ background: "rgba(16,21,36,0.92)" }), width: "100%", maxWidth: 560, maxHeight: "88vh", overflowY: "auto",
        borderRadius: "24px 24px 0 0", padding: "10px 16px calc(18px + env(safe-area-inset-bottom))", boxSizing: "border-box",
        animation: "sheetUp .32s cubic-bezier(.2,.8,.2,1) both", direction: "rtl", color: T.text, fontFamily: "'Heebo', sans-serif",
      }}>
        <div style={{ width: 40, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.2)", margin: "0 auto 12px" }} />
        {title && (
          <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
            <div style={{ flex: 1, fontWeight: 800, fontSize: 17 }}>{title}</div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: T.text, width: 32, height: 32, borderRadius: "50%", cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}

// Segmented control with a sliding highlight
function Segmented({ options, value, onChange, size = 15 }) {
  const idx = options.findIndex(o => o.id === value);
  return (
    <div style={{ position: "relative", display: "flex", background: "rgba(255,255,255,0.05)", border: `1px solid ${T.surfaceBorder}`, borderRadius: 14, padding: 4 }}>
      <div style={{ position: "absolute", top: 4, bottom: 4, right: 4, width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${-Math.max(0, idx) * 100}%)`, opacity: idx < 0 ? 0 : 1, background: T.grad, borderRadius: 10, transition: "transform .35s cubic-bezier(.2,.8,.2,1)", boxShadow: "0 4px 14px rgba(91,140,255,0.35)" }} />
      {options.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)} style={{ position: "relative", flex: 1, background: "none", border: "none", color: o.id === value ? "#fff" : T.muted, padding: "9px 6px", cursor: "pointer", fontFamily: "'Heebo',sans-serif", fontSize: size, fontWeight: 700 }}>{o.label}</button>
      ))}
    </div>
  );
}

// ─── MAP SCREEN ───────────────────────────────────────────────────────────────

const COUNTRY_CODES = { בולגריה: "bg", יוון: "gr", אלבניה: "al", מונטנגרו: "me", קרואטיה: "hr", סלובניה: "si", אוסטריה: "at", איטליה: "it", שוויץ: "ch", נורווגיה: "no", שוודיה: "se", דנמרק: "dk" };

// Each style has backup servers: if the first one fails to load, we switch automatically.
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";
// Only servers that need no API key. (CARTO was removed: it started returning "API key required" images.)
const TILE_STYLES = {
  light: { label: "🗺️", name: "רגילה", sources: [
    { url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", attr: "© OpenStreetMap" },
    { url: `${ESRI}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`, attr: "© Esri" },
  ] },
  dark: { label: "🌙", name: "כהה", sources: [
    { url: `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`, attr: "© Esri", maxNative: 16, labels: `${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}` },
  ] },
  sat: { label: "🛰️", name: "לוויין", sources: [
    { url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, attr: "© Esri", labels: `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}` },
  ] },
};
const STYLE_ORDER = ["light", "dark", "sat"];
const navLinks = (lat, lng) => ({
  google: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
  waze: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
});

// Free place search (OpenStreetMap Nominatim). Max ~1 request per second.
async function geoSearch(q, cc, limit = 6) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=${limit}&accept-language=he,en&q=${encodeURIComponent(q)}${cc ? `&countrycodes=${cc}` : ""}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("geo " + r.status);
  return (await r.json()).map(x => ({ lat: parseFloat(x.lat), lng: parseFloat(x.lon), name: x.name || x.display_name.split(",")[0], full: x.display_name }));
}

const distKm = (a, b) => {
  const R = 6371, toR = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toR, dLng = (b.lng - a.lng) * toR;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

// Trip stops: the cities from the plan tab (once located), or the country itself if it has none yet.
function buildStops(countries, cities) {
  const dates = getDates(countries);
  const stops = [];
  countries.forEach((c, i) => {
    const list = cities[c.name] || [];
    const located = list.filter(x => x.lat != null);
    if (!located.length) {
      stops.push({ key: c.name, country: c, name: c.name, lat: c.lat, lng: c.lng, start: dates[i].start, end: dates[i].end, days: Math.round(c.weeks * 7), isCountry: true });
      return;
    }
    let d = new Date(dates[i].start);
    list.forEach(city => {
      const st = new Date(d);
      d.setDate(d.getDate() + (city.days || 1));
      if (city.lat != null) stops.push({ key: `${c.name}-${city.id}`, country: c, name: city.name, lat: city.lat, lng: city.lng, start: st, end: new Date(d.getTime() - 86400000), days: city.days, accommodation: city.accommodation, notes: city.notes });
    });
  });
  return stops;
}

function MapScreen({ visible, countries, cities, setCities, pins, onPinsChange, tracks, onTracksChange, compares, expenses, focus }) {
  const pinMarkers = useRef({});
  const mapRef = useRef(null);
  const mapInst = useRef(null);
  const tileLayer = useRef(null);
  const layers = useRef({ route: [], stops: [], pins: [], tracks: [] });
  const cardsRef = useRef(null);
  const addModeRef = useRef(false);
  const gpxInputRef = useRef(null);

  const [style, setStyle] = useState(() => { try { return TILE_STYLES[localStorage.getItem("trip-map-style3")] ? localStorage.getItem("trip-map-style3") : "light"; } catch { return "light"; } });
  const [srcIdx, setSrcIdx] = useState(0);
  const [toast, setToast] = useState("");
  const [active, setActive] = useState(-1); // -1 = whole trip
  const [addMode, setAddMode] = useState(false);
  const [pending, setPending] = useState(null); // {lat, lng, name?}
  const [hiddenCats, setHiddenCats] = useState({});
  const [showLayers, setShowLayers] = useState(false);
  const [editPin, setEditPin] = useState(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [geoQueue, setGeoQueue] = useState(0);
  const [geoTick, setGeoTick] = useState(0);

  const stops = buildStops(countries, cities);
  const stopsSig = stops.map(s => `${s.key}:${s.lat},${s.lng}`).join("|");
  addModeRef.current = addMode;

  // Create the map once and keep it alive (it stays mounted while other tabs are open).
  useEffect(() => {
    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: true, worldCopyJump: true }).setView([48, 14], 4);
    map.attributionControl.setPrefix(false);
    map.on("click", e => {
      if (!addModeRef.current) return;
      setPending({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    mapInst.current = map;
    return () => { map.remove(); mapInst.current = null; };
  }, []);

  // Tiles (with automatic fallback to a backup server)
  const labelLayer = useRef(null);
  useEffect(() => {
    const map = mapInst.current;
    const sources = TILE_STYLES[style].sources;
    const src = sources[Math.min(srcIdx, sources.length - 1)];
    [tileLayer.current, labelLayer.current].forEach(l => l && map.removeLayer(l));
    labelLayer.current = null;
    let loaded = 0, failed = 0;
    const layer = L.tileLayer(src.url, { attribution: src.attr, maxZoom: 19, maxNativeZoom: src.maxNative || 19, keepBuffer: 4, crossOrigin: false });
    layer.on("tileload", () => { loaded++; });
    layer.on("tileerror", () => {
      failed++;
      if (failed >= 3 && loaded === 0 && srcIdx < sources.length - 1) {
        setSrcIdx(i => i + 1);
        setToast("השרת של המפה לא ענה, עברתי לשרת חלופי");
      }
    });
    tileLayer.current = layer.addTo(map);
    if (src.labels) labelLayer.current = L.tileLayer(src.labels, { maxZoom: 19, maxNativeZoom: src.maxNative || 19, pane: "overlayPane" }).addTo(map);
    try { localStorage.setItem("trip-map-style3", style); } catch {}
  }, [style, srcIdx]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 3500); return () => clearTimeout(t); }, [toast]);
  const cycleStyle = () => {
    const next = STYLE_ORDER[(STYLE_ORDER.indexOf(style) + 1) % STYLE_ORDER.length];
    setSrcIdx(0); setStyle(next); setToast(`מפה ${TILE_STYLES[next].name}`);
  };

  // Map was hidden – fix its size when shown
  useEffect(() => { if (visible && mapInst.current) setTimeout(() => mapInst.current?.invalidateSize(), 50); }, [visible]);

  const clear = key => { layers.current[key].forEach(l => mapInst.current.removeLayer(l)); layers.current[key] = []; };

  // Route + numbered stops
  useEffect(() => {
    const map = mapInst.current;
    clear("route"); clear("stops");
    const pts = stops.map(s => [s.lat, s.lng]);
    if (pts.length > 1) {
      layers.current.route.push(L.polyline(pts, { color: "#7c5cff", weight: 10, opacity: 0.18, lineCap: "round", lineJoin: "round", interactive: false }).addTo(map));
      layers.current.route.push(L.polyline(pts, { color: "#5b8cff", weight: 3, opacity: 0.95, lineCap: "round", lineJoin: "round", interactive: false }).addTo(map));
    }
    stops.forEach((s, i) => {
      const on = i === active;
      const size = on ? 34 : 24;
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${s.country.color};color:#fff;display:flex;align-items:center;justify-content:center;font:800 ${on ? 14 : 11}px Heebo,sans-serif;border:2px solid #fff;box-shadow:0 0 0 ${on ? 6 : 0}px ${s.country.color}55,0 3px 10px rgba(0,0,0,.5)">${i + 1}</div>`,
        iconSize: [size, size], iconAnchor: [size / 2, size / 2],
      });
      const m = L.marker([s.lat, s.lng], { icon, zIndexOffset: on ? 1000 : 500 }).addTo(map);
      m.on("click", () => selectStop(i, true));
      layers.current.stops.push(m);
    });
  }, [stopsSig, active]);

  // My pins
  useEffect(() => {
    clear("pins");
    pinMarkers.current = {};
    pins.filter(p => !hiddenCats[p.cat] && p.lat != null).forEach(pin => {
      const cat = PIN_CATS.find(c => c.id === pin.cat) || PIN_CATS[5];
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:${cat.color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,.9);box-shadow:0 3px 10px rgba(0,0,0,.5)"><span style="transform:rotate(45deg);font-size:14px">${cat.icon}</span></div>`,
        iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -26],
      });
      const esc = t => String(t).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
      const n = navLinks(pin.lat, pin.lng);
      const btn = "display:inline-block;margin:6px 0 0 6px;padding:4px 9px;border-radius:9px;background:#eef2ff;color:#1e293b;text-decoration:none;font-size:12px;font-weight:600";
      const sub = [pin.country, pin.date ? fmtDay(pin.date) : ""].filter(Boolean).join(" · ");
      const safeLink = isUrl(pin.link) ? esc(pin.link.trim()) : "";
      const m = L.marker([pin.lat, pin.lng], { icon }).addTo(mapInst.current)
        .bindPopup(`<div style="font-family:Heebo,sans-serif;direction:rtl;min-width:160px"><b>${cat.icon} ${esc(pin.name)}</b>${sub ? `<br/><span style="color:#64748b;font-size:12px">${esc(sub)}</span>` : ""}${pin.note ? `<br/><span style="color:#475569">${esc(pin.note)}</span>` : ""}<br/><a style="${btn}" href="${n.google}" target="_blank" rel="noreferrer">🧭 גוגל מפות</a><a style="${btn}" href="${n.waze}" target="_blank" rel="noreferrer">🚗 Waze</a>${safeLink ? `<a style="${btn}" href="${safeLink}" target="_blank" rel="noreferrer">🔗 קישור</a>` : ""}</div>`);
      layers.current.pins.push(m);
      pinMarkers.current[pin.id] = m;
    });
  }, [pins, hiddenCats]);

  // GPX tracks
  useEffect(() => {
    clear("tracks");
    tracks.forEach(trk => {
      if (!trk.points?.length) return;
      layers.current.tracks.push(L.polyline(trk.points, { color: trk.color || T.accent, weight: 4, opacity: 0.9 }).addTo(mapInst.current).bindPopup(`<b>${trk.name}</b>`));
    });
  }, [tracks]);

  // "Show on map" from another tab
  useEffect(() => {
    if (!visible || !focus) return;
    const pin = pins.find(p => p.id === focus.id);
    if (!pin || pin.lat == null) return;
    setTimeout(() => {
      mapInst.current?.flyTo([pin.lat, pin.lng], 15, { duration: 0.9 });
      setTimeout(() => pinMarkers.current[pin.id]?.openPopup(), 950);
    }, 120);
  }, [focus, visible]);

  // Find coordinates for cities typed in the plan tab (only while the map is open).
  const geoBusy = useRef(false);
  useEffect(() => {
    if (!visible || geoBusy.current) return;
    const todo = [];
    Object.entries(cities).forEach(([country, list]) => (list || []).forEach(city => {
      const name = (city.name || "").trim();
      if (name && city.geoName !== name && city.geoFail !== name) todo.push({ country, id: city.id, name });
    }));
    setGeoQueue(todo.length);
    if (!todo.length) return;
    geoBusy.current = true;
    (async () => {
      for (const t of todo) {
        let res = null;
        try { res = (await geoSearch(t.name, COUNTRY_CODES[t.country], 1))[0] || null; } catch {}
        setCities(p => ({ ...p, [t.country]: (p[t.country] || []).map(c => c.id === t.id && (c.name || "").trim() === t.name
          ? (res ? { ...c, lat: res.lat, lng: res.lng, geoName: t.name, geoFail: undefined } : { ...c, geoFail: t.name })
          : c) }));
        setGeoQueue(q => Math.max(0, q - 1));
        await new Promise(r => setTimeout(r, 1100));
      }
      geoBusy.current = false;
      setGeoTick(t => t + 1);
    })();
  }, [visible, cities, geoTick]);

  const fitAll = () => {
    if (!stops.length) return;
    mapInst.current.flyToBounds(L.latLngBounds(stops.map(s => [s.lat, s.lng])), { paddingTopLeft: [30, 80], paddingBottomRight: [30, 200], duration: 0.8 });
  };
  const selectStop = (i, scrollCard) => {
    setActive(i);
    if (i < 0) fitAll();
    else {
      const s = stops[i];
      mapInst.current.flyToBounds(L.latLng(s.lat, s.lng).toBounds(s.isCountry ? 350000 : 12000), { paddingTopLeft: [20, 80], paddingBottomRight: [20, 200], duration: 0.9 });
    }
    if (scrollCard) cardsRef.current?.children[i + 1]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  // First open: show the whole trip
  const didFit = useRef(false);
  useEffect(() => { if (visible && !didFit.current && stops.length) { didFit.current = true; setTimeout(fitAll, 120); } }, [visible]);

  // Swiping the cards moves the map
  const scrollTimer = useRef(null);
  const onCardsScroll = () => {
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      const box = cardsRef.current;
      if (!box) return;
      const mid = box.getBoundingClientRect().left + box.clientWidth / 2;
      let best = 0, bestD = Infinity;
      [...box.children].forEach((el, k) => { const r = el.getBoundingClientRect(); const d = Math.abs(r.left + r.width / 2 - mid); if (d < bestD) { bestD = d; best = k; } });
      if (best - 1 !== active) selectStop(best - 1, false);
    }, 140);
  };

  const doSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try { setResults(await geoSearch(query.trim())); } catch { setResults([]); }
    setSearching(false);
  };
  const pickResult = r => {
    setResults(null);
    mapInst.current.flyTo([r.lat, r.lng], 14, { duration: 0.9 });
    setPending({ lat: r.lat, lng: r.lng, name: r.name });
  };

  const handleGPX = e => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const xml = new DOMParser().parseFromString(ev.target.result, "text/xml");
      const name = xml.querySelector("metadata > name, trk > name")?.textContent || file.name.replace(/\.gpx$/i, "");
      const pts = Array.from(xml.querySelectorAll("trkpt, rtept")).map(pt => [parseFloat(pt.getAttribute("lat")), parseFloat(pt.getAttribute("lon"))]);
      if (pts.length < 2) { alert("לא מצאתי מסלול בקובץ"); return; }
      onTracksChange([...tracks, { id: Date.now(), name, color: T.accent, points: pts }]);
      setShowLayers(false);
      mapInst.current.flyToBounds(L.polyline(pts).getBounds(), { padding: [30, 30], duration: 0.8 });
    };
    reader.readAsText(file);
  };

  const TRAIL_COLORS = ["#ff8a3d", "#34d399", "#5b8cff", "#a78bfa", "#f43f5e", "#22c3e6"];
  const fab = (extra = {}) => ({ ...glass({ borderRadius: 16 }), width: 44, height: 44, color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px rgba(0,0,0,.4)", ...extra });
  const totalDays = stops.reduce((s, x) => s + (x.days || 0), 0);

  return (
    <div style={{ position: "relative", height: "100%", overflow: "hidden" }}>
      <div ref={mapRef} style={{ position: "absolute", inset: 0, zIndex: 0, background: "#0e1322" }} />

      {/* Search */}
      <div style={{ position: "absolute", top: 10, right: 10, left: 10, zIndex: 500, display: "flex", gap: 8 }}>
        <div style={{ ...glass({ borderRadius: 16 }), flex: 1, display: "flex", alignItems: "center", padding: "0 12px", boxShadow: "0 6px 18px rgba(0,0,0,.35)" }}>
          <span style={{ fontSize: 15, opacity: 0.8 }}>{searching ? "⏳" : "🔍"}</span>
          <input value={query} onChange={e => { setQuery(e.target.value); if (!e.target.value) setResults(null); }} onKeyDown={e => e.key === "Enter" && doSearch()}
            placeholder="חיפוש מקום (למשל Dubrovnik)" enterKeyHint="search"
            style={{ flex: 1, background: "none", border: "none", color: T.text, fontFamily: "'Heebo',sans-serif", padding: "11px 8px", minWidth: 0, boxShadow: "none" }} />
          {query && <button onClick={() => { setQuery(""); setResults(null); }} style={{ background: "none", border: "none", color: T.muted, fontSize: 16, cursor: "pointer" }}>✕</button>}
        </div>
        <button onClick={cycleStyle} style={fab()}>{TILE_STYLES[style].label}</button>
        <button onClick={() => setShowLayers(true)} style={fab()}>☰</button>
      </div>

      {results && (
        <div className="fade-up" style={{ ...glass({ borderRadius: 16, background: "rgba(16,21,36,0.95)" }), position: "absolute", top: 62, right: 10, left: 10, zIndex: 600, maxHeight: "45%", overflowY: "auto" }}>
          {results.length === 0 && <div style={{ padding: 14, color: T.muted, fontSize: 14 }}>לא נמצא. נסו באנגלית או עם שם העיר.</div>}
          {results.map((r, k) => (
            <div key={k} onClick={() => pickResult(r)} style={{ padding: "11px 14px", borderBottom: `1px solid ${T.surfaceBorder}`, cursor: "pointer" }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>📍 {r.name}</div>
              <div style={{ fontSize: 12, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.full}</div>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="fade-up" style={{ ...glass({ borderRadius: 12 }), position: "absolute", top: 104, left: "50%", transform: "translateX(-50%)", zIndex: 600, padding: "6px 12px", fontSize: 12, whiteSpace: "nowrap" }}>{toast}</div>
      )}
      {geoQueue > 0 && visible && (
        <div style={{ ...glass({ borderRadius: 12 }), position: "absolute", top: 62, left: "50%", transform: "translateX(-50%)", zIndex: 500, padding: "6px 12px", fontSize: 12, color: T.muted, whiteSpace: "nowrap" }}>📍 ממקם ערים על המפה… ({geoQueue})</div>
      )}
      {addMode && !pending && (
        <div style={{ ...glass({ borderRadius: 12, border: `1px solid ${T.primaryBorder}` }), position: "absolute", top: 62, left: "50%", transform: "translateX(-50%)", zIndex: 500, padding: "8px 14px", fontSize: 13, whiteSpace: "nowrap" }}>👆 געו במפה במקום שרוצים להוסיף</div>
      )}

      {/* Add point */}
      <button onClick={() => { setAddMode(v => !v); setPending(null); }} style={fab({ position: "absolute", left: 12, bottom: 172, zIndex: 500, width: 52, height: 52, borderRadius: 18, fontSize: 24, background: addMode ? "rgba(248,113,113,0.9)" : T.grad, border: "none", boxShadow: "0 8px 22px rgba(91,140,255,.45)" })}>{addMode ? "✕" : "+"}</button>

      {/* Stop cards */}
      <div ref={cardsRef} onScroll={onCardsScroll} className="scr" style={{ position: "absolute", bottom: 10, right: 0, left: 0, zIndex: 500, display: "flex", gap: 10, overflowX: "auto", scrollSnapType: "x mandatory", padding: "0 10vw 2px" }}>
        <div onClick={() => selectStop(-1, true)} style={{ ...glass({ borderRadius: 20, background: "rgba(16,21,36,0.86)", border: `1px solid ${active === -1 ? T.primaryBorder : T.surfaceBorder}` }), flex: "0 0 min(78vw, 320px)", scrollSnapAlign: "center", padding: 14, boxSizing: "border-box", cursor: "pointer", minHeight: 140 }}>
          <div style={{ fontSize: 12, color: T.muted }}>כל הטיול</div>
          <div style={{ fontWeight: 900, fontSize: 20, margin: "2px 0 4px" }}>🌍 {countries.length} מדינות · {stops.length} תחנות</div>
          <div style={{ fontSize: 13, color: T.muted }}>{fmt(getDates(countries)[0].start)} → {fmt(getDates(countries)[countries.length - 1].end)}</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 8 }}>👈 מחליקים לתחנה הבאה. ערים שמוסיפים בטאב "מסלול" יופיעו כאן כתחנות.</div>
        </div>
        {stops.map((s, i) => {
          const sIso = isoDay(s.start), eIso = isoDay(s.end);
          const dayPlaces = pins.filter(p => p.date && p.date >= sIso && p.date <= eIso);
          const near = pins.filter(p => p.lat != null && !dayPlaces.includes(p) && distKm(p, s) < (s.isCountry ? 250 : 40));
          const chosen = compares.filter(g => g.country === s.country.name && g.chosenId).map(g => g.options.find(o => o.id === g.chosenId)).filter(Boolean);
          const on = active === i;
          return (
            <div key={s.key} onClick={() => selectStop(i, true)} style={{ ...glass({ borderRadius: 20, background: "rgba(16,21,36,0.86)", border: `1px solid ${on ? s.country.color + "aa" : T.surfaceBorder}` }), flex: "0 0 min(78vw, 320px)", scrollSnapAlign: "center", padding: 14, boxSizing: "border-box", cursor: "pointer", minHeight: 140, transition: "border-color .3s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: s.country.color, color: "#fff", fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
                <div style={{ fontSize: 12, color: T.muted }}>{s.country.emoji} {s.country.name}</div>
              </div>
              <div style={{ fontWeight: 900, fontSize: 20, margin: "4px 0 2px" }}>{s.name}</div>
              <div style={{ fontSize: 13, color: T.muted }}>{fmt(s.start)} – {fmt(s.end)} · {s.days} ימים{s.accommodation ? ` · 🏨 ${s.accommodation}` : ""}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {chosen.slice(0, 2).map(o => <span key={o.id} style={{ fontSize: 11, background: "rgba(52,211,153,0.15)", color: T.green, borderRadius: 8, padding: "2px 8px" }}>✓ {o.name}</span>)}
                {dayPlaces.slice(0, 3).map(p => <span key={p.id} onClick={ev => { ev.stopPropagation(); if (p.lat != null) { mapInst.current.flyTo([p.lat, p.lng], 15); setTimeout(() => pinMarkers.current[p.id]?.openPopup(), 900); } }} style={{ fontSize: 11, background: "rgba(255,138,61,0.15)", color: "#ffb37a", borderRadius: 8, padding: "2px 8px" }}>📅 {fmtDay(p.date).split(" ")[0]} {p.name}</span>)}
                {dayPlaces.length > 3 && <span style={{ fontSize: 11, color: T.muted }}>+{dayPlaces.length - 3}</span>}
                {near.length > 0 && <span style={{ fontSize: 11, background: T.primaryDim, color: "#c7d4ff", borderRadius: 8, padding: "2px 8px" }}>📍 עוד {near.length} באזור</span>}
                {s.isCountry && <span style={{ fontSize: 11, color: T.muted }}>עוד אין ערים בטאב "מסלול"</span>}
                {s.notes && <span style={{ fontSize: 11, color: T.muted }}>📝 {s.notes}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* New place */}
      {pending && (
        <PlaceForm initial={{ lat: pending.lat, lng: pending.lng, name: pending.name || "", country: nearestCountry(countries, cities, pending.lat, pending.lng) }}
          countries={countries} onClose={() => setPending(null)}
          onSave={data => { onPinsChange([...pins, { ...data, id: Date.now() }]); setPending(null); setAddMode(false); setQuery(""); }} />
      )}
      {editPin && (
        <PlaceForm initial={editPin} countries={countries} onClose={() => setEditPin(null)}
          onSave={data => { onPinsChange(pins.map(p => (p.id === editPin.id ? { ...p, ...data } : p))); setEditPin(null); }}
          onDelete={() => { onPinsChange(pins.filter(p => p.id !== editPin.id)); setEditPin(null); }} />
      )}

      {/* Layers & list */}
      {showLayers && (
        <Sheet onClose={() => setShowLayers(false)} title="🗺️ מה מוצג במפה">
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 6, fontWeight: 600 }}>קטגוריות (לחיצה מסתירה/מציגה)</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {PIN_CATS.map(cat => <button key={cat.id} onClick={() => setHiddenCats(h => ({ ...h, [cat.id]: !h[cat.id] }))} style={chip(!hiddenCats[cat.id], cat.color, { fontSize: 12, padding: "5px 10px", opacity: hiddenCats[cat.id] ? 0.5 : 1 })}>{cat.icon} {cat.label}</button>)}
          </div>

          <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
            <div style={{ flex: 1, fontSize: 12, color: T.muted, fontWeight: 600 }}>מסלולי GPX ({tracks.length})</div>
            <button onClick={() => gpxInputRef.current?.click()} style={chip(false, T.primary, { fontSize: 12, padding: "4px 10px" })}>⛰️ ייבוא GPX</button>
            <input ref={gpxInputRef} type="file" accept=".gpx,application/gpx+xml" style={{ display: "none" }} onChange={handleGPX} />
          </div>
          {tracks.map((trk, i) => (
            <div key={trk.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: `1px solid ${T.surfaceBorder}` }}>
              <span onClick={() => { setShowLayers(false); mapInst.current.flyToBounds(L.polyline(trk.points).getBounds(), { padding: [30, 30] }); }} style={{ flex: 1, fontSize: 14, cursor: "pointer" }}>🥾 {trk.name}</span>
              {TRAIL_COLORS.map(col => <div key={col} onClick={() => onTracksChange(tracks.map((t, j) => (j === i ? { ...t, color: col } : t)))} style={{ width: 16, height: 16, borderRadius: "50%", background: col, cursor: "pointer", border: trk.color === col ? "2px solid #fff" : "none" }} />)}
              <button onClick={() => { if (confirm(`למחוק את המסלול "${trk.name}"?`)) onTracksChange(tracks.filter((_, j) => j !== i)); }} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 18 }}>×</button>
            </div>
          ))}

          <div style={{ fontSize: 12, color: T.muted, margin: "14px 0 6px", fontWeight: 600 }}>הנקודות שלי ({pins.length})</div>
          {pins.length === 0 && <div style={{ fontSize: 13, color: T.muted }}>עוד אין. לוחצים + או מחפשים מקום למעלה.</div>}
          {pins.map(pin => {
            const cat = PIN_CATS.find(c => c.id === pin.cat) || PIN_CATS[5];
            return (
              <div key={pin.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: `1px solid ${T.surfaceBorder}` }}>
                <div onClick={() => { if (pin.lat == null) return; setShowLayers(false); mapInst.current.flyTo([pin.lat, pin.lng], 14, { duration: 0.8 }); setTimeout(() => pinMarkers.current[pin.id]?.openPopup(), 850); }} style={{ flex: 1, minWidth: 0, cursor: "pointer", opacity: pin.lat == null ? 0.6 : 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{cat.icon} {pin.name}</div>
                  {pin.note && <div style={{ fontSize: 12, color: T.muted }}>{pin.note}</div>}
                </div>
                <button onClick={() => { setShowLayers(false); setEditPin(pin); }} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 15 }}>✏️</button>
              </div>
            );
          })}
        </Sheet>
      )}
    </div>
  );
}

// ─── PLACES (pins with a country / day) ──────────────────────────────────────

const isoDay = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmtDay = iso => new Date(iso + "T00:00").toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "numeric" });
function countryDays(countries, name) {
  const i = countries.findIndex(c => c.name === name);
  if (i < 0) return [];
  const { start, end } = getDates(countries)[i];
  const out = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) out.push(isoDay(d));
  return out;
}
function nearestCountry(countries, cities, lat, lng) {
  let best = null, bestD = Infinity;
  countries.forEach(c => {
    const pts = [{ lat: c.lat, lng: c.lng }, ...(cities[c.name] || []).filter(x => x.lat != null)];
    pts.forEach(pt => { const d = distKm(pt, { lat, lng }); if (d < bestD) { bestD = d; best = c.name; } });
  });
  return best || "";
}

function PlaceForm({ initial, countries, onSave, onClose, onDelete }) {
  const [f, setF] = useState({ cat: "attraction", name: "", note: "", link: "", country: "", date: "", lat: null, lng: null, maps: "", ...initial });
  const [locQ, setLocQ] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const set = p => setF(x => ({ ...x, ...p }));
  const days = countryDays(countries, f.country);

  const [resolving, setResolving] = useState(false);
  const onLoc = async v => {
    setLocQ(v);
    const c = parseLatLng(v);
    if (c) { set({ lat: c.lat, lng: c.lng, maps: isUrl(v) ? v.trim() : f.maps }); setResults(null); return; }
    if (isUrl(v)) {
      set({ maps: v.trim() });
      setResults(null);
      setResolving(true);
      const r = await resolveMapsLink(v, COUNTRY_CODES[f.country]);
      setResolving(false);
      if (r?.lat != null) setF(x => ({ ...x, lat: r.lat, lng: r.lng }));
      if (r?.name) setF(x => (x.name ? x : { ...x, name: r.name.split(",")[0] }));
    }
  };
  const search = async () => {
    const q = locQ.trim() || f.name.trim();
    if (!q || isUrl(q)) return;
    setSearching(true);
    try { setResults(await geoSearch(q, COUNTRY_CODES[f.country])); } catch { setResults([]); }
    setSearching(false);
  };
  const save = () => {
    if (!f.name.trim()) return;
    onSave({ ...f, name: f.name.trim(), note: f.note.trim(), link: f.link.trim() });
  };
  const hasLoc = f.lat != null;
  const label = { fontSize: 12, color: T.muted, margin: "12px 0 6px", fontWeight: 600 };

  return (
    <Sheet onClose={onClose} title={initial?.id ? "עריכת מקום" : "📍 מקום חדש"}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {PIN_CATS.map(cat => <button key={cat.id} onClick={() => set({ cat: cat.id })} style={chip(f.cat === cat.id, cat.color, { fontSize: 12, padding: "5px 10px" })}>{cat.icon} {cat.label}</button>)}
      </div>
      <input value={f.name} onChange={e => set({ name: e.target.value })} placeholder="שם המקום *" style={inputStyle()} />

      <div style={label}>מיקום</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={locQ} onChange={e => onLoc(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} placeholder="חיפוש, או הדבקת קישור מגוגל מפות" style={inputStyle({ flex: 1 })} />
        <button onClick={search} style={{ ...chip(false), padding: "0 14px", borderRadius: 12 }}>{searching ? "⏳" : "🔍"}</button>
      </div>
      {results && (
        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, marginTop: 6, maxHeight: 200, overflowY: "auto" }}>
          {results.length === 0 && <div style={{ padding: 10, fontSize: 13, color: T.muted }}>לא נמצא. נסו באנגלית.</div>}
          {results.map((r, k) => (
            <div key={k} onClick={() => { set({ lat: r.lat, lng: r.lng, name: f.name || r.name }); setResults(null); setLocQ(r.name); }} style={{ padding: "9px 12px", borderBottom: `1px solid ${T.surfaceBorder}`, cursor: "pointer" }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>📍 {r.name}</div>
              <div style={{ fontSize: 11, color: T.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.full}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ fontSize: 12, marginTop: 6, color: hasLoc ? T.green : f.maps ? "#fbbf24" : T.muted }}>
        {resolving ? "⏳ מזהה את המיקום מהקישור…" : hasLoc ? `✓ יש מיקום, יופיע במפה ואפשר לנווט אליו` : f.maps ? "לא הצלחתי לזהות מיקום מהקישור. הוא יישמר לניווט, ואפשר לחפש את המקום בשם כדי שיופיע במפה." : "מחפשים לפי שם, או מדביקים קישור מגוגל מפות"}
        {hasLoc && <button onClick={() => set({ lat: null, lng: null })} style={{ background: "none", border: "none", color: T.muted, fontSize: 12, cursor: "pointer", marginRight: 6 }}>הסר</button>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
        <select value={f.country} onChange={e => set({ country: e.target.value, date: "" })} style={inputStyle()}>
          <option value="">בלי מדינה</option>
          {countries.map(c => <option key={c.name} value={c.name}>{c.emoji} {c.name}</option>)}
        </select>
        <select value={f.date} onChange={e => set({ date: e.target.value })} style={inputStyle()} disabled={!f.country}>
          <option value="">📌 כללי, בלי יום</option>
          {days.map(d => <option key={d} value={d}>{fmtDay(d)}</option>)}
          {f.date && !days.includes(f.date) && <option value={f.date}>{fmtDay(f.date)}</option>}
        </select>
      </div>
      <input value={f.link} onChange={e => set({ link: e.target.value })} placeholder="🔗 קישור (Booking, אתר, כרטיסים…)" style={inputStyle({ marginTop: 8 })} />
      <input value={f.note} onChange={e => set({ note: e.target.value })} placeholder="הערה (צ׳ק-אין 15:00, קוד הזמנה…)" style={inputStyle({ marginTop: 8 })} />
      <button onClick={save} style={primaryBtn({ marginTop: 14 })}>שמור מקום</button>
      {onDelete && <button onClick={() => { if (confirm(`למחוק את "${f.name}"?`)) onDelete(); }} style={{ width: "100%", marginTop: 8, background: "none", border: `1px solid ${T.surfaceBorder}`, borderRadius: 14, color: T.red, padding: 10, cursor: "pointer", fontFamily: "'Heebo',sans-serif" }}>מחק מקום</button>}
    </Sheet>
  );
}

const smallBtn = { background: "rgba(255,255,255,0.07)", border: `1px solid ${T.surfaceBorder}`, borderRadius: 10, color: T.text, padding: "5px 9px", fontSize: 12, cursor: "pointer", fontFamily: "'Heebo',sans-serif", textDecoration: "none", whiteSpace: "nowrap", display: "inline-block" };

function NavButtons({ place }) {
  if (place.lat == null && !place.maps) return null;
  const google = place.lat != null ? navLinks(place.lat, place.lng).google : place.maps;
  return <>
    <a href={google} target="_blank" rel="noreferrer" style={smallBtn}>🧭 גוגל מפות</a>
    <a href={wazeHref(place.lat, place.lng, place.name)} target="_blank" rel="noreferrer" style={smallBtn}>🚗 Waze</a>
  </>;
}

function PlaceCard({ place, expenses, onEdit, onShowMap, onUpdate }) {
  const [locating, setLocating] = useState(false);
  const locate = async () => {
    setLocating(true);
    const r = await resolveMapsLink(place.maps, COUNTRY_CODES[place.country]);
    setLocating(false);
    if (r?.lat != null) onUpdate({ lat: r.lat, lng: r.lng });
    else alert("לא הצלחתי לזהות מיקום מהקישור. אפשר לערוך ולחפש את המקום בשם.");
  };
  const cat = PIN_CATS.find(c => c.id === place.cat) || PIN_CATS[5];
  const linked = expenses.filter(e => e.placeId === place.id);
  const sum = linked.reduce((s, e) => s + e.amount, 0);
  const receipts = linked.filter(e => e.receiptId).length;
  return (
    <div style={{ ...card({ marginBottom: 8, padding: "11px 13px" }) }}>
      <div onClick={onEdit} style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
        <div style={{ width: 36, height: 36, borderRadius: 11, background: cat.color + "22", border: `1px solid ${cat.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{cat.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{place.name}</div>
          <div style={{ fontSize: 12, color: T.muted }}>{place.date ? `📅 ${fmtDay(place.date)}` : "📌 כללי"}{place.note ? ` · ${place.note}` : ""}</div>
          {linked.length > 0 && <div style={{ fontSize: 12, color: T.green, marginTop: 2 }}>💰 {money(sum)}{receipts ? ` · 🧾 ${receipts}` : ""}</div>}
        </div>
        <span style={{ color: T.muted, fontSize: 14 }}>✏️</span>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
        <NavButtons place={place} />
        {place.lat != null && <button onClick={onShowMap} style={smallBtn}>🗺️ במפה</button>}
        {place.lat == null && place.maps && onUpdate && <button onClick={locate} style={smallBtn}>{locating ? "⏳" : "📍 הוסף למפה"}</button>}
        {place.link && <a href={place.link} target="_blank" rel="noreferrer" style={smallBtn}>🔗 קישור</a>}
      </div>
    </div>
  );
}

function CountryPlaces({ country, countries, pins, setPins, expenses, onShowMap }) {
  const [editing, setEditing] = useState(null); // null | {} new | pin
  const list = pins.filter(p => p.country === country.name)
    .sort((a, b) => (a.date || "") < (b.date || "") ? -1 : (a.date || "") > (b.date || "") ? 1 : 0);
  const general = list.filter(p => !p.date);
  const byDay = list.filter(p => p.date);
  const save = data => {
    if (editing?.id) setPins(pins.map(p => (p.id === editing.id ? { ...p, ...data } : p)));
    else setPins([...pins, { ...data, id: Date.now() }]);
    setEditing(null);
  };
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>📍 מקומות ({list.length})</div>
        <button onClick={() => setEditing({ country: country.name })} style={chip(false, T.primary, { fontSize: 12 })}>+ מקום</button>
      </div>
      {list.length === 0 && <div style={{ fontSize: 13, color: T.muted, marginBottom: 8 }}>לינות, אטרקציות, טרקים… אפשר לשייך ליום מסוים או סתם למדינה.</div>}
      {general.map(p => <PlaceCard key={p.id} place={p} expenses={expenses} onEdit={() => setEditing(p)} onShowMap={() => onShowMap(p)} onUpdate={patch => setPins(pins.map(x => (x.id === p.id ? { ...x, ...patch } : x)))} />)}
      {byDay.map((p, k) => (
        <div key={p.id}>
          {(k === 0 || byDay[k - 1].date !== p.date) && <div style={{ fontSize: 12, color: T.muted, fontWeight: 700, margin: "10px 2px 6px" }}>📅 {fmtDay(p.date)}</div>}
          <PlaceCard place={p} expenses={expenses} onEdit={() => setEditing(p)} onShowMap={() => onShowMap(p)} onUpdate={patch => setPins(pins.map(x => (x.id === p.id ? { ...x, ...patch } : x)))} />
        </div>
      ))}
      {editing && <PlaceForm initial={editing} countries={countries} onSave={save} onClose={() => setEditing(null)}
        onDelete={editing.id ? () => { setPins(pins.filter(p => p.id !== editing.id)); setEditing(null); } : null} />}
    </div>
  );
}

// ─── PLAN SCREEN ─────────────────────────────────────────────────────────────

function PlanScreen({ countries, setCountries, cities, setCities, notes, setNotes, pins, setPins, expenses, onShowMap }) {
  const [view, setView] = useState("overview"); // "overview" | countryName
  const dates = getDates(countries);
  const totalWeeks = countries.reduce((s, c) => s + c.weeks, 0);

  const activeC = countries.find(c => c.name === view);
  const activeIdx = countries.findIndex(c => c.name === view);

  const setWeeks = (name, delta) =>
    setCountries(prev => prev.map(c => c.name === name ? { ...c, weeks: Math.max(0.5, Math.round((c.weeks + delta) * 2) / 2) } : c));

  const addCity = (country, name) => {
    if (!name.trim()) return;
    setCities(p => ({ ...p, [country]: [...(p[country] || []), { id: Date.now(), name: name.trim(), days: 2, accommodation: "הוסטל", notes: "" }] }));
  };
  const updateCity = (country, id, field, val) =>
    setCities(p => ({ ...p, [country]: p[country].map(c => c.id === id ? { ...c, [field]: val } : c) }));
  const removeCity = (country, id) =>
    setCities(p => ({ ...p, [country]: p[country].filter(c => c.id !== id) }));

  const [newCity, setNewCity] = useState("");

  if (view !== "overview" && activeC) {
    const plannedDays = (cities[activeC.name] || []).reduce((s, c) => s + c.days, 0);
    return (
      <div className="scr" style={{ padding: "16px 14px 24px", overflowY: "auto", height: "100%", boxSizing: "border-box" }}>
        <button onClick={() => setView("overview")} style={{ background: "none", border: "none", color: T.primary, cursor: "pointer", fontFamily: "'Heebo',sans-serif", fontSize: 14, marginBottom: 14, display: "flex", alignItems: "center", gap: 6, padding: 0 }}>
          ← חזרה
        </button>

        {/* Country header */}
        <div style={{ ...card(), background: `linear-gradient(135deg, ${activeC.color}18, ${activeC.color}06)`, border: `1px solid ${activeC.color}35`, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 40 }}>{activeC.emoji}</span>
            <div>
              <div style={{ fontWeight: 900, fontSize: 22, color: T.text }}>{activeC.name}</div>
              <div style={{ fontSize: 13, color: T.muted }}>{fmt(dates[activeIdx].start)} – {fmt(dates[activeIdx].end)} · {activeC.weeks} שבועות</div>
            </div>
          </div>
          {/* weeks control */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
            <span style={{ fontSize: 13, color: T.muted }}>שבועות:</span>
            <button onClick={() => setWeeks(activeC.name, -0.5)} style={{ width: 28, height: 28, borderRadius: "7px 0 0 7px", background: "rgba(255,255,255,0.07)", border: `1px solid ${T.surfaceBorder}`, color: T.text, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
            <div style={{ width: 44, height: 28, background: T.primaryDim, border: `1px solid ${T.primaryBorder}`, borderLeft: "none", borderRight: "none", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: T.primary, fontSize: 15 }}>{activeC.weeks}</div>
            <button onClick={() => setWeeks(activeC.name, 0.5)} style={{ width: 28, height: 28, borderRadius: "0 7px 7px 0", background: "rgba(255,255,255,0.07)", border: `1px solid ${T.surfaceBorder}`, color: T.text, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            <span style={{ fontSize: 12, color: T.muted, marginRight: "auto" }}>{plannedDays} ימים מתוכננים</span>
          </div>
        </div>

        {/* Cities */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 10 }}>🏙️ ערים</div>
          {(cities[activeC.name] || []).map((city, i) => (
            <div key={city.id} style={card({ marginBottom: 8 })}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ color: T.muted, fontSize: 12 }}>{i + 1}.</span>
                <input value={city.name} onChange={e => updateCity(activeC.name, city.id, "name", e.target.value)}
                  style={{ flex: 1, background: "transparent", border: "none", borderBottom: `1px solid ${T.surfaceBorder}`, color: T.text, fontFamily: "'Heebo',sans-serif", fontSize: 15, fontWeight: 600, padding: "2px 4px", outline: "none" }} />
                <button onClick={() => removeCity(activeC.name, city.id)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 18 }}>×</button>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12, color: T.muted }}>ימים:</span>
                  <button onClick={() => updateCity(activeC.name, city.id, "days", Math.max(1, city.days - 1))} style={{ width: 24, height: 24, borderRadius: "6px 0 0 6px", background: "rgba(255,255,255,0.06)", border: `1px solid ${T.surfaceBorder}`, color: T.text, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                  <div style={{ width: 32, height: 24, background: T.primaryDim, border: `1px solid ${T.primaryBorder}`, borderLeft: "none", borderRight: "none", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: T.primary }}>{city.days}</div>
                  <button onClick={() => updateCity(activeC.name, city.id, "days", city.days + 1)} style={{ width: 24, height: 24, borderRadius: "0 6px 6px 0", background: "rgba(255,255,255,0.06)", border: `1px solid ${T.surfaceBorder}`, color: T.text, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                </div>
                <select value={city.accommodation} onChange={e => updateCity(activeC.name, city.id, "accommodation", e.target.value)}
                  style={{ flex: 1, background: T.faint, border: `1px solid ${T.surfaceBorder}`, borderRadius: 6, color: T.text, fontFamily: "'Heebo',sans-serif", fontSize: 13, padding: "3px 8px", minWidth: 100 }}>
                  {ACCOMMODATION_TYPES.map(t => <option key={t} style={{ background: "#1a1a2e" }}>{t}</option>)}
                </select>
              </div>
              <input value={city.notes} onChange={e => updateCity(activeC.name, city.id, "notes", e.target.value)} placeholder="הערה..."
                style={{ width: "100%", marginTop: 8, background: "transparent", border: `1px solid ${T.surfaceBorder}`, borderRadius: 6, color: T.muted, fontFamily: "'Heebo',sans-serif", fontSize: 12, padding: "5px 9px", boxSizing: "border-box" }} />
            </div>
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            <input value={newCity} onChange={e => setNewCity(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { addCity(activeC.name, newCity); setNewCity(""); } }}
              placeholder="+ הוסף עיר..." style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px dashed ${T.surfaceBorder}`, borderRadius: 8, color: T.text, fontFamily: "'Heebo',sans-serif", fontSize: 14, padding: "8px 12px" }} />
            <button onClick={() => { addCity(activeC.name, newCity); setNewCity(""); }} style={{ background: T.primaryDim, border: `1px solid ${T.primaryBorder}`, borderRadius: 8, color: T.primary, padding: "8px 14px", cursor: "pointer", fontFamily: "'Heebo',sans-serif", fontWeight: 700, fontSize: 14 }}>+</button>
          </div>
        </div>

        <CountryPlaces country={activeC} countries={countries} pins={pins} setPins={setPins} expenses={expenses} onShowMap={onShowMap} />

        {/* Notes */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 8 }}>📝 הערות</div>
          <textarea value={notes[activeC.name] || ""} onChange={e => setNotes(p => ({ ...p, [activeC.name]: e.target.value }))}
            placeholder="מה אתה רוצה לזכור?" style={{ width: "100%", background: T.faint, border: `1px solid ${T.surfaceBorder}`, borderRadius: 10, color: T.text, fontFamily: "'Heebo',sans-serif", fontSize: 14, padding: 12, resize: "vertical", minHeight: 80, boxSizing: "border-box" }} />
        </div>

        {/* Country nav */}
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
          {activeIdx > 0 && (
            <button onClick={() => setView(countries[activeIdx - 1].name)} style={{ background: T.surface, border: `1px solid ${T.surfaceBorder}`, borderRadius: 8, color: T.muted, padding: "8px 14px", cursor: "pointer", fontFamily: "'Heebo',sans-serif", fontSize: 13 }}>← {countries[activeIdx - 1].emoji} {countries[activeIdx - 1].name}</button>
          )}
          <div style={{ flex: 1 }} />
          {activeIdx < countries.length - 1 && (
            <button onClick={() => setView(countries[activeIdx + 1].name)} style={{ background: T.surface, border: `1px solid ${T.surfaceBorder}`, borderRadius: 8, color: T.muted, padding: "8px 14px", cursor: "pointer", fontFamily: "'Heebo',sans-serif", fontSize: 13 }}>{countries[activeIdx + 1].emoji} {countries[activeIdx + 1].name} →</button>
          )}
        </div>
      </div>
    );
  }

  // Overview
  const weeksColor = T.primary;
  return (
    <div className="scr" style={{ padding: "16px 14px 24px", overflowY: "auto", height: "100%", boxSizing: "border-box" }}>
      {/* Weeks summary */}
      <div style={{ ...card({ marginBottom: 16 }), background: `${weeksColor}12`, border: `1px solid ${weeksColor}35`, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ fontSize: 38, fontWeight: 900, color: weeksColor, lineHeight: 1 }}>{totalWeeks}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>
            שבועות בסך הכל
          </div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{fmt(TRIP_START)} → {fmt(dates[dates.length - 1].end)}</div>
        </div>
      </div>

      {/* Timeline bar */}
      <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", height: 24, marginBottom: 16 }}>
        {countries.map(c => (
          <div key={c.name} title={`${c.name}: ${c.weeks} שב'`} onClick={() => setView(c.name)}
            style={{ flex: c.weeks, background: c.color + "cc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, overflow: "hidden", cursor: "pointer" }}>
            {c.weeks >= 1.5 ? c.emoji : ""}
          </div>
        ))}
      </div>

      {/* Country list */}
      {countries.map((c, i) => {
        const citiesCount = (cities[c.name] || []).length;
        const plannedDays = (cities[c.name] || []).reduce((s, x) => s + x.days, 0);
        return (
          <div key={c.name} onClick={() => setView(c.name)} style={{ ...card({ cursor: "pointer", transition: "background 0.15s" }) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: c.color + "20", border: `1px solid ${c.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{c.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 16, color: T.text }}>{c.name}</span>
                  <span style={{ background: c.color + "20", color: c.color, borderRadius: 20, padding: "1px 9px", fontSize: 11, fontWeight: 600 }}>{c.weeks} שב'</span>
                  <span style={{ fontSize: 11, color: T.muted }}>{fmt(dates[i].start)} – {fmt(dates[i].end)}</span>
                </div>
                <div style={{ fontSize: 12, color: citiesCount > 0 ? "#10b981" : T.muted, marginTop: 3 }}>
                  {citiesCount > 0 ? `✓ ${citiesCount} ערים · ${plannedDays} ימים` : "לחץ לתכנון ←"}
                </div>
              </div>
              <span style={{ color: T.muted, fontSize: 16 }}>›</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── BUDGET SCREEN ────────────────────────────────────────────────────────────

// Who paid and how an expense is split. Old expenses (before this existed)
// only have `person` ("shared" | "person1" | "person2") = whose expense it is.
const expPayer = e => (e.paidBy !== undefined ? e.paidBy : e.person === "shared" ? null : e.person);
const expSplit = e => e.split || (e.person === "person1" || e.person === "person2" ? e.person : "equal");
function expShares(e) {
  const a = e.amount, sp = expSplit(e);
  if (sp === "person1") return [a, 0];
  if (sp === "person2") return [0, a];
  if (sp === "custom") { const p1 = Math.min(a, Math.max(0, parseFloat(e.p1Share) || 0)); return [p1, a - p1]; }
  return [a / 2, a / 2];
}
function calcBalance(expenses) {
  const paid = [0, 0], owed = [0, 0];
  let unknown = 0;
  expenses.forEach(e => {
    const payer = expPayer(e);
    if (payer !== "person1" && payer !== "person2") { unknown++; return; }
    const [s1, s2] = expShares(e);
    paid[payer === "person1" ? 0 : 1] += e.amount;
    owed[0] += s1; owed[1] += s2;
  });
  return { paid, owed, net1: paid[0] - owed[0], unknown };
}
const money = n => `€${(Math.round(n * 100) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function ReceiptThumb({ id, onClick, size = 44 }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let u = null, alive = true;
    getReceipt(id).then(b => { if (b && alive) { u = URL.createObjectURL(b); setUrl(u); } }).catch(() => {});
    return () => { alive = false; if (u) URL.revokeObjectURL(u); };
  }, [id]);
  return (
    <div onClick={onClick} style={{ width: size, aspectRatio: "1", borderRadius: 10, flexShrink: 0, cursor: "pointer", background: url ? `center/cover url(${url})` : "rgba(255,255,255,0.06)", border: `1px solid ${T.surfaceBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{url ? "" : "🧾"}</div>
  );
}

function ReceiptViewer({ exp, onClose }) {
  const [url, setUrl] = useState(null);
  const [blob, setBlob] = useState(null);
  useEffect(() => {
    let u = null;
    getReceipt(exp.receiptId).then(b => { if (b) { setBlob(b); u = URL.createObjectURL(b); setUrl(u); } });
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [exp.receiptId]);
  const save = () => blob && saveFilesToDevice([new File([blob], receiptFileName(exp), { type: "image/jpeg" })]);
  return (
    <Sheet onClose={onClose} title={`🧾 ${exp.desc || "קבלה"} · ${money(exp.amount)}`}>
      {url ? <img src={url} alt="" style={{ width: "100%", borderRadius: 14, display: "block", marginBottom: 12 }} /> : <div style={{ color: T.muted, textAlign: "center", padding: 30 }}>טוען…</div>}
      <button onClick={save} style={primaryBtn()}>⬇️ שמור בטלפון</button>
    </Sheet>
  );
}

function ReceiptsFolder({ expenses, onClose, onOpen }) {
  const withR = expenses.filter(e => e.receiptId).slice().reverse();
  const [busy, setBusy] = useState(false);
  const saveAll = async () => {
    setBusy(true);
    try {
      const files = [];
      for (const e of withR) {
        const b = await getReceipt(e.receiptId);
        if (b) files.push(new File([b], receiptFileName(e, files.length), { type: "image/jpeg" }));
      }
      await saveFilesToDevice(files, "קבלות-הטיול.zip");
    } finally { setBusy(false); }
  };
  return (
    <Sheet onClose={onClose} title={`📁 תיקיית קבלות (${withR.length})`}>
      {withR.length === 0 ? (
        <div style={{ color: T.muted, textAlign: "center", padding: "24px 0" }}>עוד אין קבלות. מוסיפים תמונה כשמוסיפים הוצאה.</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
            {withR.map(e => (
              <div key={e.id} onClick={() => onOpen(e)} style={{ cursor: "pointer" }}>
                <ReceiptThumb id={e.receiptId} size="100%" />
                <div style={{ fontSize: 11, color: T.muted, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.desc || "קבלה"} · {money(e.amount)}</div>
              </div>
            ))}
          </div>
          <button onClick={saveAll} disabled={busy} style={primaryBtn({ opacity: busy ? 0.6 : 1 })}>{busy ? "מכין…" : `⬇️ שמור את כל הקבלות בטלפון`}</button>
          <div style={{ fontSize: 12, color: T.muted, textAlign: "center", marginTop: 8 }}>באייפון ייפתח חלון שיתוף: אפשר לבחור "שמור תמונות" או "שמור בקבצים"</div>
        </>
      )}
    </Sheet>
  );
}

const emptyExpense = () => ({ amount: "", cat: "food", desc: "", date: new Date().toISOString().split("T")[0], country: "יוון", paidBy: "person1", split: "equal", p1Share: "", receiptId: null, placeId: null });

function ExpenseForm({ initial, countries, persons, pins, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [newReceipts, setNewReceipts] = useState([]); // added in this form session
  const fileRef = useRef(null);
  const set = patch => setForm(f => ({ ...f, ...patch }));

  const onFile = async e => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const blob = await compressImage(file);
      const id = "r" + Date.now() + Math.random().toString(36).slice(2, 6);
      await putReceipt(id, blob);
      setNewReceipts(r => [...r, id]);
      set({ receiptId: id });
    } catch { alert("לא הצלחתי לטעון את התמונה"); }
    setUploading(false);
  };

  const cleanupUnused = keepId => newReceipts.filter(id => id !== keepId).forEach(id => deleteReceipt(id).catch(() => {}));
  const save = () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) return;
    cleanupUnused(form.receiptId);
    const person = form.split === "person1" || form.split === "person2" ? form.split : "shared";
    onSave({ ...form, amount, person, p1Share: form.split === "custom" ? parseFloat(form.p1Share) || 0 : "" });
  };
  const cancel = () => { cleanupUnused(null); onCancel(); };

  const amt = parseFloat(form.amount) || 0;
  const p1c = Math.min(amt, parseFloat(form.p1Share) || 0);
  const label = { fontSize: 12, color: T.muted, margin: "10px 0 6px", fontWeight: 600 };

  return (
    <div className="fade-up">
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
        {EXPENSE_CATS.map(cat => (
          <button key={cat.id} onClick={() => set({ cat: cat.id })} style={chip(form.cat === cat.id, cat.color, { fontSize: 12, padding: "5px 10px" })}>{cat.icon} {cat.label}</button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
        <input type="number" inputMode="decimal" value={form.amount} onChange={e => set({ amount: e.target.value })} placeholder="סכום (€)" style={inputStyle({ fontWeight: 700 })} />
        <input type="date" value={form.date} onChange={e => set({ date: e.target.value })} style={inputStyle()} />
      </div>
      <input value={form.desc} onChange={e => set({ desc: e.target.value })} placeholder="תיאור (למשל: סופר באתונה)" style={inputStyle({ marginTop: 8 })} />
      <select value={form.country} onChange={e => set({ country: e.target.value })} style={inputStyle({ marginTop: 8 })}>
        {countries.map(c => <option key={c.name} value={c.name}>{c.emoji} {c.name}</option>)}
      </select>

      {(() => {
        const opts = pins.filter(p => p.country === form.country || p.id === form.placeId);
        if (!opts.length) return null;
        return (
          <select value={form.placeId || ""} onChange={e => set({ placeId: e.target.value ? Number(e.target.value) : null })} style={inputStyle({ marginTop: 8 })}>
            <option value="">📍 לשייך למקום? (לא חובה)</option>
            {opts.map(p => <option key={p.id} value={p.id}>{(PIN_CATS.find(c => c.id === p.cat) || PIN_CATS[5]).icon} {p.name}{p.date ? ` · ${fmtDay(p.date)}` : ""}</option>)}
          </select>
        );
      })()}

      <div style={label}>מי שילם?</div>
      <Segmented value={form.paidBy || ""} onChange={v => set({ paidBy: v })} options={[{ id: "person1", label: persons[0] }, { id: "person2", label: persons[1] }]} />

      <div style={label}>איך מתחלקים?</div>
      <Segmented size={13} value={form.split} onChange={v => set({ split: v })} options={[
        { id: "equal", label: "חצי-חצי" }, { id: "person1", label: `רק ${persons[0]}` }, { id: "person2", label: `רק ${persons[1]}` }, { id: "custom", label: "אחר" },
      ]} />
      {form.split === "custom" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }} className="fade-up">
          <span style={{ fontSize: 13, color: T.muted, whiteSpace: "nowrap" }}>החלק של {persons[0]}:</span>
          <input type="number" inputMode="decimal" value={form.p1Share} onChange={e => set({ p1Share: e.target.value })} placeholder="€" style={inputStyle({ flex: 1 })} />
          <span style={{ fontSize: 13, color: T.muted, whiteSpace: "nowrap" }}>{persons[1]}: {money(Math.max(0, amt - p1c))}</span>
        </div>
      )}

      <div style={label}>קבלה</div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {form.receiptId && <ReceiptThumb id={form.receiptId} size={56} />}
        <button onClick={() => fileRef.current?.click()} style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: `1px dashed ${T.primaryBorder}`, borderRadius: 14, color: T.text, padding: 12, cursor: "pointer", fontFamily: "'Heebo',sans-serif", fontSize: 14 }}>
          {uploading ? "⏳ מכווץ…" : form.receiptId ? "📷 החלף תמונה" : "📷 צלם או בחר קבלה"}
        </button>
        {form.receiptId && <button onClick={() => set({ receiptId: null })} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 13 }}>הסר</button>}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onFile} />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button onClick={save} disabled={uploading} style={primaryBtn({ flex: 1 })}>שמור הוצאה</button>
        <button onClick={cancel} style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${T.surfaceBorder}`, borderRadius: 14, color: T.muted, padding: "0 18px", cursor: "pointer", fontFamily: "'Heebo',sans-serif", fontSize: 15 }}>ביטול</button>
      </div>
    </div>
  );
}

function BudgetScreen({ countries, expenses, setExpenses, persons, pins }) {
  const [editing, setEditing] = useState(null); // null | "new" | expense
  const [filterPerson, setFilterPerson] = useState("all");
  const [viewReceipt, setViewReceipt] = useState(null);
  const [showFolder, setShowFolder] = useState(false);

  const totalBudget = countries.reduce((s, c) => s + DAILY_BUDGET[c.name] * c.weeks * 7, 0);
  const filteredExp = expenses.filter(e => {
    if (filterPerson === "all") return true;
    const [s1, s2] = expShares(e);
    if (filterPerson === "person1") return s1 > 0;
    if (filterPerson === "person2") return s2 > 0;
    return s1 > 0 && s2 > 0;
  });
  const allSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const spentPct = Math.min((allSpent / totalBudget) * 100, 100);
  const bal = calcBalance(expenses);
  const receiptCount = expenses.filter(e => e.receiptId).length;

  const catTotals = EXPENSE_CATS.map(cat => ({
    ...cat, total: expenses.filter(e => e.cat === cat.id).reduce((s, e) => s + e.amount, 0)
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  const saveExpense = data => {
    if (editing === "new") setExpenses(p => [...p, { id: Date.now(), ...data }]);
    else {
      if (editing.receiptId && editing.receiptId !== data.receiptId) deleteReceipt(editing.receiptId).catch(() => {});
      setExpenses(p => p.map(e => (e.id === editing.id ? { ...e, ...data } : e)));
    }
    setEditing(null);
  };
  const removeExpense = exp => {
    if (!confirm(`למחוק את "${exp.desc || "ההוצאה"}" (${money(exp.amount)})?`)) return;
    if (exp.receiptId) deleteReceipt(exp.receiptId).catch(() => {});
    setExpenses(p => p.filter(e => e.id !== exp.id));
  };

  const net = bal.net1;
  const settled = Math.abs(net) < 0.01;

  return (
    <div className="scr" style={{ padding: "16px 14px 24px", overflowY: "auto", height: "100%", boxSizing: "border-box" }}>
      {/* Summary */}
      <div style={{ ...card({ marginBottom: 12, background: "linear-gradient(135deg, rgba(52,211,153,0.16), rgba(34,195,230,0.06))", border: "1px solid rgba(52,211,153,0.28)" }) }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 2 }}>תקציב משוער</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: T.green }}>€{Math.round(totalBudget).toLocaleString()}</div>
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 2 }}>שולם עד כה</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: allSpent > totalBudget ? T.red : T.text }}>€{Math.round(allSpent).toLocaleString()}</div>
          </div>
        </div>
        <div style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${spentPct}%`, background: allSpent > totalBudget ? T.red : "linear-gradient(90deg,#34d399,#22c3e6)", borderRadius: 4, transition: "width 0.6s cubic-bezier(.2,.8,.2,1)" }} />
        </div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 6 }}>{Math.round(spentPct)}% מהתקציב • ₪{Math.round(allSpent * 3.8).toLocaleString()}</div>
      </div>

      {/* Balance between us */}
      <div style={{ ...card({ marginBottom: 12 }) }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
          <div style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>🤝 החשבון בינינו</div>
          <button onClick={() => setShowFolder(true)} style={chip(false, T.primary, { fontSize: 12, padding: "5px 10px" })}>📁 קבלות ({receiptCount})</button>
        </div>
        <div style={{ textAlign: "center", padding: "6px 0 12px" }}>
          {settled ? (
            <div style={{ fontSize: 18, fontWeight: 800, color: T.green }}>✓ אתם מאוזנים</div>
          ) : (
            <div style={{ fontSize: 17, fontWeight: 800 }}>
              {net > 0 ? persons[1] : persons[0]} <span style={{ color: T.muted, fontWeight: 500 }}>חייב ל</span>{net > 0 ? persons[0] : persons[1]}
              <div style={{ fontSize: 28, fontWeight: 900, background: T.grad, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{money(Math.abs(net))}</div>
            </div>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[0, 1].map(i => (
            <div key={i} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "8px 10px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{persons[i]}</div>
              <div style={{ fontSize: 12, color: T.muted }}>שילם {money(bal.paid[i])}</div>
              <div style={{ fontSize: 12, color: T.muted }}>החלק שלו {money(bal.owed[i])}</div>
            </div>
          ))}
        </div>
        {bal.unknown > 0 && <div style={{ fontSize: 12, color: "#fbbf24", marginTop: 8 }}>⚠️ {bal.unknown} הוצאות ישנות בלי "מי שילם". לחצו עליהן כדי להשלים.</div>}
      </div>

      {/* Category breakdown */}
      {catTotals.length > 0 && (
        <div style={{ ...card({ marginBottom: 12 }) }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 10 }}>לפי קטגוריה</div>
          {catTotals.map(cat => (
            <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
              <span style={{ fontSize: 16, width: 22 }}>{cat.icon}</span>
              <span style={{ fontSize: 13, color: T.text, flex: 1 }}>{cat.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>€{Math.round(cat.total)}</span>
              <div style={{ width: 60, height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3 }}>
                <div style={{ height: "100%", width: `${(cat.total / allSpent) * 100}%`, background: cat.color, borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add expense */}
      {editing ? (
        <div style={{ ...card({ marginBottom: 14, border: `1px solid ${T.primaryBorder}` }) }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>{editing === "new" ? "הוצאה חדשה" : "עריכת הוצאה"}</div>
          <ExpenseForm
            key={editing === "new" ? "new" : editing.id}
            initial={editing === "new" ? emptyExpense() : { ...emptyExpense(), ...editing, paidBy: expPayer(editing), split: expSplit(editing), p1Share: editing.p1Share ?? "", amount: String(editing.amount) }}
            countries={countries} persons={persons} pins={pins} onSave={saveExpense} onCancel={() => setEditing(null)} />
        </div>
      ) : (
        <button onClick={() => setEditing("new")} style={primaryBtn({ marginBottom: 14 })}>+ הוסף הוצאה</button>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto" }}>
        {[{ id: "all", label: "הכל", icon: "👥" }, { id: "person1", label: persons[0], icon: "👤" }, { id: "person2", label: persons[1], icon: "👤" }, { id: "shared", label: "משותף", icon: "🤝" }].map(p => (
          <button key={p.id} onClick={() => setFilterPerson(p.id)} style={chip(filterPerson === p.id)}>{p.icon} {p.label}</button>
        ))}
      </div>

      {/* Expenses list */}
      {filteredExp.length === 0 && (
        <div style={{ textAlign: "center", padding: "2rem", color: T.muted }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>💰</div>
          <div>אין הוצאות עדיין</div>
        </div>
      )}
      {[...filteredExp].reverse().map(exp => {
        const cat = EXPENSE_CATS.find(c => c.id === exp.cat) || EXPENSE_CATS[6];
        const payer = expPayer(exp);
        const sp = expSplit(exp);
        const splitLabel = sp === "equal" ? "חצי-חצי" : sp === "custom" ? "חלוקה מותאמת" : `רק ${sp === "person1" ? persons[0] : persons[1]}`;
        return (
          <div key={exp.id} onClick={() => setEditing(exp)} style={{ ...card({ marginBottom: 8, padding: "12px 14px", cursor: "pointer" }) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: cat.color + "22", border: `1px solid ${cat.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{cat.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{exp.desc || cat.label}</div>
                <div style={{ fontSize: 11, color: T.muted }}>{fmtDate(exp.date)} · {exp.country}{exp.placeId && pins.find(p => p.id === exp.placeId) ? ` · 📍 ${pins.find(p => p.id === exp.placeId).name}` : ""}</div>
                <div style={{ fontSize: 11, color: payer ? T.muted : "#fbbf24" }}>{payer ? `שילם ${payer === "person1" ? persons[0] : persons[1]}` : "מי שילם?"} · {splitLabel}</div>
              </div>
              {exp.receiptId && <ReceiptThumb id={exp.receiptId} size={40} onClick={ev => { ev.stopPropagation(); setViewReceipt(exp); }} />}
              <div style={{ fontWeight: 800, fontSize: 16, color: T.text }}>{money(exp.amount)}</div>
              <button onClick={ev => { ev.stopPropagation(); removeExpense(exp); }} style={{ background: "none", border: "none", color: "#5b6478", cursor: "pointer", fontSize: 20, flexShrink: 0, padding: "0 2px" }}>×</button>
            </div>
          </div>
        );
      })}

      {viewReceipt && <ReceiptViewer exp={viewReceipt} onClose={() => setViewReceipt(null)} />}
      {showFolder && <ReceiptsFolder expenses={expenses} onClose={() => setShowFolder(false)} onOpen={e => { setShowFolder(false); setViewReceipt(e); }} />}
    </div>
  );
}

// ─── COMPARE SCREEN ──────────────────────────────────────────────────────────

// Pull coordinates out of a Google Maps link or a "lat, lng" text.
function parseLatLng(str) {
  if (!str) return null;
  const s = decodeURIComponent(String(str));
  const pats = [/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, /@(-?\d+\.\d+),\s*(-?\d+\.\d+)/, /[?&](?:q|query|ll|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/, /^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/];
  for (const re of pats) {
    const m = s.match(re);
    if (m) {
      const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    }
  }
  return null;
}
const isUrl = s => /^https?:\/\//i.test(String(s || "").trim());
const mapsHref = o => (isUrl(o.maps) ? o.maps.trim() : o.lat != null ? `https://www.google.com/maps/search/?api=1&query=${o.lat},${o.lng}` : null);

// Google Maps share link → coordinates, via our small server helper (api/resolve-maps.js).
async function resolveMapsLink(url, cc) {
  const direct = parseLatLng(url);
  if (direct) return direct;
  try {
    const r = await fetch(`/api/resolve-maps?url=${encodeURIComponent(url.trim())}`);
    if (!r.ok) return null;
    const j = await r.json();
    if (j.lat != null) return { lat: j.lat, lng: j.lng, name: j.name };
    if (j.name) {
      const g = (await geoSearch(j.name, cc, 1).catch(() => []))[0] || (await geoSearch(j.name.split(",")[0], cc, 1).catch(() => []))[0];
      return g ? { lat: g.lat, lng: g.lng, name: j.name } : { name: j.name };
    }
  } catch {}
  return null;
}
const wazeHref = (lat, lng, name) => (lat != null ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes` : name ? `https://waze.com/ul?q=${encodeURIComponent(name)}&navigate=yes` : null);

const emptyOption = () => ({ name: "", price: "", link: "", maps: "", note: "" });

function OptionForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState(initial);
  const set = p => setF(x => ({ ...x, ...p }));
  const [resolved, setResolved] = useState(initial.lat != null ? { lat: initial.lat, lng: initial.lng } : null);
  const [resolving, setResolving] = useState(false);
  const coords = parseLatLng(f.maps) || resolved;
  const onMaps = async v => {
    set({ maps: v });
    setResolved(null);
    if (isUrl(v) && !parseLatLng(v)) {
      setResolving(true);
      const r = await resolveMapsLink(v);
      setResolving(false);
      if (r?.lat != null) setResolved({ lat: r.lat, lng: r.lng });
      if (r?.name) setF(x => (x.name ? x : { ...x, name: r.name.split(",")[0] }));
    }
  };
  const save = () => {
    if (!f.name.trim()) return;
    onSave({ ...f, name: f.name.trim(), lat: coords?.lat ?? null, lng: coords?.lng ?? null });
  };
  return (
    <div className="fade-up" style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 10, marginTop: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
        <input value={f.name} onChange={e => set({ name: e.target.value })} placeholder="שם המקום *" style={inputStyle()} />
        <input type="number" inputMode="decimal" value={f.price} onChange={e => set({ price: e.target.value })} placeholder="מחיר €" style={inputStyle()} />
      </div>
      <input value={f.maps} onChange={e => onMaps(e.target.value)} placeholder="📍 קישור מגוגל מפות" style={inputStyle({ marginTop: 8 })} />
      {f.maps && <div style={{ fontSize: 11, marginTop: 4, color: coords ? T.green : T.muted }}>{resolving ? "⏳ מזהה את המיקום מהקישור…" : coords ? "✓ המיקום זוהה, אפשר להוסיף למפה ולנווט" : "לא הצלחתי לזהות מיקום. הקישור יישמר ויפתח את גוגל מפות."}</div>}
      <input value={f.link} onChange={e => set({ link: e.target.value })} placeholder="🔗 קישור (Booking, אתר, AllTrails…)" style={inputStyle({ marginTop: 8 })} />
      <input value={f.note} onChange={e => set({ note: e.target.value })} placeholder="הערה (למשל: כולל ארוחת בוקר)" style={inputStyle({ marginTop: 8 })} />
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button onClick={save} style={primaryBtn({ flex: 1, padding: 10, fontSize: 14 })}>שמור</button>
        <button onClick={onCancel} style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${T.surfaceBorder}`, borderRadius: 14, color: T.muted, padding: "0 16px", cursor: "pointer", fontFamily: "'Heebo',sans-serif" }}>ביטול</button>
      </div>
    </div>
  );
}

function CompareGroup({ g, persons, update, remove, pins, setPins }) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(null); // null | "new" | option id
  const cat = PIN_CATS.find(c => c.id === g.cat) || PIN_CATS[5];
  const priced = g.options.filter(o => o.price !== "" && !isNaN(parseFloat(o.price)));
  const minPrice = priced.length ? Math.min(...priced.map(o => parseFloat(o.price))) : null;
  const sorted = [...g.options].sort((a, b) => {
    const pa = parseFloat(a.price), pb = parseFloat(b.price);
    return (isNaN(pa) ? Infinity : pa) - (isNaN(pb) ? Infinity : pb);
  });

  const setOptions = fn => update({ ...g, options: fn(g.options) });
  const saveOption = data => {
    if (editing === "new") setOptions(os => [...os, { id: Date.now(), likes: {}, ...data }]);
    else setOptions(os => os.map(o => (o.id === editing ? { ...o, ...data } : o)));
    setEditing(null);
  };
  const toMap = o => {
    if (o.lat == null) return;
    const exists = pins.some(p => p.id === o.pinId);
    if (exists) return;
    const pinId = Date.now();
    setPins([...pins, { id: pinId, name: o.name, note: [o.price ? `€${o.price}` : "", o.note].filter(Boolean).join(" · "), cat: g.cat, lat: o.lat, lng: o.lng, country: g.country || "", date: "", link: o.link || "" }]);
    setOptions(os => os.map(x => (x.id === o.id ? { ...x, pinId } : x)));
  };
  const linkBtn = { background: "rgba(255,255,255,0.07)", border: `1px solid ${T.surfaceBorder}`, borderRadius: 10, color: T.text, padding: "5px 9px", fontSize: 12, cursor: "pointer", fontFamily: "'Heebo',sans-serif", textDecoration: "none", whiteSpace: "nowrap" };

  return (
    <div className="fade-up" style={{ ...card({ marginBottom: 12, padding: 0, overflow: "hidden" }) }}>
      <div onClick={() => setOpen(v => !v)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", cursor: "pointer" }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: cat.color + "22", border: `1px solid ${cat.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0 }}>{cat.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{g.title}</div>
          <div style={{ fontSize: 12, color: T.muted }}>{g.country ? `${g.country} · ` : ""}{g.options.length} אפשרויות{minPrice != null ? ` · מ-€${minPrice}` : ""}</div>
        </div>
        <span style={{ color: T.muted, transform: open ? "rotate(180deg)" : "none", transition: "transform .3s" }}>⌄</span>
      </div>
      <div style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", transition: "grid-template-rows .35s cubic-bezier(.2,.8,.2,1)" }}>
        <div style={{ overflow: "hidden" }}>
          <div style={{ padding: "0 12px 12px" }}>
            {sorted.map(o => {
              const p = parseFloat(o.price);
              const cheapest = priced.length > 1 && !isNaN(p) && p === minPrice;
              const chosen = g.chosenId === o.id;
              const diff = !isNaN(p) && minPrice != null && p > minPrice ? p - minPrice : 0;
              const href = mapsHref(o);
              const onMap = pins.some(pp => pp.id === o.pinId);
              if (editing === o.id) return <OptionForm key={o.id} initial={{ ...emptyOption(), ...o }} onSave={saveOption} onCancel={() => setEditing(null)} />;
              return (
                <div key={o.id} style={{ background: chosen ? "rgba(52,211,153,0.10)" : "rgba(255,255,255,0.035)", border: `1px solid ${chosen ? "rgba(52,211,153,0.45)" : T.surfaceBorder}`, borderRadius: 14, padding: "10px 12px", marginTop: 8, transition: "all .25s" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }} onClick={() => setEditing(o.id)}>
                      <div style={{ fontWeight: 700, fontSize: 14, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        {chosen && <span style={{ color: T.green }}>✓</span>}{o.name}
                        {cheapest && <span style={{ fontSize: 10, background: "rgba(52,211,153,0.18)", color: T.green, borderRadius: 8, padding: "1px 7px" }}>💸 הכי זול</span>}
                      </div>
                      {o.note && <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{o.note}</div>}
                    </div>
                    <div style={{ textAlign: "left", flexShrink: 0 }}>
                      <div style={{ fontWeight: 900, fontSize: 17 }}>{isNaN(p) ? "—" : `€${p}`}</div>
                      {diff > 0 && <div style={{ fontSize: 11, color: "#fbbf24" }}>+€{Math.round(diff * 100) / 100}</div>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {["person1", "person2"].map((pid, i) => (
                      <button key={pid} onClick={() => setOptions(os => os.map(x => (x.id === o.id ? { ...x, likes: { ...(x.likes || {}), [pid]: !x.likes?.[pid] } } : x)))}
                        style={{ ...linkBtn, background: o.likes?.[pid] ? T.primaryDim : linkBtn.background, borderColor: o.likes?.[pid] ? T.primaryBorder : T.surfaceBorder }}>
                        {o.likes?.[pid] ? "👍" : "👍🏻"} {persons[i]}
                      </button>
                    ))}
                    {o.link && <a href={o.link.trim()} target="_blank" rel="noreferrer" style={linkBtn}>🔗 קישור</a>}
                    {href && <a href={href} target="_blank" rel="noreferrer" style={linkBtn}>📍 גוגל מפות</a>}
                    {(o.lat != null || o.maps) && <a href={wazeHref(o.lat, o.lng, o.name)} target="_blank" rel="noreferrer" style={linkBtn}>🚗 Waze</a>}
                    {o.lat != null && <button onClick={() => toMap(o)} disabled={onMap} style={{ ...linkBtn, opacity: onMap ? 0.55 : 1 }}>{onMap ? "✓ במפה" : "🗺️ למפה"}</button>}
                    <div style={{ flex: 1 }} />
                    <button onClick={() => update({ ...g, chosenId: chosen ? null : o.id })} style={{ ...linkBtn, background: chosen ? "rgba(52,211,153,0.2)" : linkBtn.background }}>{chosen ? "נבחר ✓" : "בחר"}</button>
                    <button onClick={() => { if (confirm(`למחוק את "${o.name}"?`)) setOptions(os => os.filter(x => x.id !== o.id)); }} style={{ ...linkBtn, color: T.muted }}>×</button>
                  </div>
                </div>
              );
            })}
            {editing === "new"
              ? <OptionForm initial={emptyOption()} onSave={saveOption} onCancel={() => setEditing(null)} />
              : <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={() => setEditing("new")} style={{ flex: 1, background: T.primaryDim, border: `1px solid ${T.primaryBorder}`, borderRadius: 12, color: "#fff", padding: 9, cursor: "pointer", fontFamily: "'Heebo',sans-serif", fontWeight: 700, fontSize: 14 }}>+ הוסף אפשרות</button>
                  <button onClick={() => { if (confirm(`למחוק את כל ההשוואה "${g.title}"?`)) remove(); }} style={{ background: "none", border: `1px solid ${T.surfaceBorder}`, borderRadius: 12, color: T.muted, padding: "0 12px", cursor: "pointer", fontFamily: "'Heebo',sans-serif", fontSize: 13 }}>🗑️</button>
                </div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompareScreen({ countries, compares, setCompares, persons, pins, setPins }) {
  const [filterCat, setFilterCat] = useState("all");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", cat: "accommodation", country: "" });

  const addGroup = () => {
    if (!form.title.trim()) return;
    setCompares(p => [{ id: Date.now(), title: form.title.trim(), cat: form.cat, country: form.country, options: [], chosenId: null }, ...p]);
    setForm(f => ({ ...f, title: "" }));
    setAdding(false);
  };
  const shown = compares.filter(g => filterCat === "all" || g.cat === filterCat);

  return (
    <div className="scr" style={{ padding: "16px 14px 24px", overflowY: "auto", height: "100%", boxSizing: "border-box" }}>
      <div style={{ ...card({ marginBottom: 12, background: "linear-gradient(135deg, rgba(124,92,255,0.18), rgba(34,195,230,0.06))", border: `1px solid ${T.primaryBorder}` }) }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>⚖️ השוואות והמלצות</div>
        <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>שמים כמה אפשרויות זו ליד זו (לינה, טרק, אטרקציה…) עם מחיר וקישור, כל אחד נותן 👍, ובוחרים.</div>
      </div>

      {adding ? (
        <div className="fade-up" style={{ ...card({ marginBottom: 12, border: `1px solid ${T.primaryBorder}` }) }}>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="מה משווים? (למשל: לינה בדוברובניק)" style={inputStyle()} autoFocus />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0" }}>
            {PIN_CATS.map(c => <button key={c.id} onClick={() => setForm(f => ({ ...f, cat: c.id }))} style={chip(form.cat === c.id, c.color, { fontSize: 12, padding: "5px 10px" })}>{c.icon} {c.label}</button>)}
          </div>
          <select value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} style={inputStyle()}>
            <option value="">בלי מדינה</option>
            {countries.map(c => <option key={c.name} value={c.name}>{c.emoji} {c.name}</option>)}
          </select>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={addGroup} style={primaryBtn({ flex: 1 })}>צור השוואה</button>
            <button onClick={() => setAdding(false)} style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${T.surfaceBorder}`, borderRadius: 14, color: T.muted, padding: "0 18px", cursor: "pointer", fontFamily: "'Heebo',sans-serif" }}>ביטול</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={primaryBtn({ marginBottom: 12 })}>+ השוואה חדשה</button>
      )}

      <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto" }}>
        {[{ id: "all", label: "הכל", icon: "✨", color: T.primary }, ...PIN_CATS].map(c => (
          <button key={c.id} onClick={() => setFilterCat(c.id)} style={chip(filterCat === c.id, c.color)}>{c.icon} {c.label}</button>
        ))}
      </div>

      {shown.length === 0 && (
        <div style={{ textAlign: "center", padding: "2rem", color: T.muted }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⚖️</div>
          <div>עוד אין השוואות</div>
        </div>
      )}
      {shown.map(g => (
        <CompareGroup key={g.id} g={g} persons={persons} pins={pins} setPins={setPins}
          update={ng => setCompares(p => p.map(x => (x.id === g.id ? ng : x)))}
          remove={() => setCompares(p => p.filter(x => x.id !== g.id))} />
      ))}
    </div>
  );
}

// ─── GEAR SCREEN ──────────────────────────────────────────────────────────────

// Gear categories we know, with words that identify them. The first four are the built-in ones;
// the rest are created only when a list needs them, with a fitting icon.
const GEAR_CAT_DEFS = [
  { cat: "📄 מסמכים", kw: ["מסמכ", "דרכון", "תעוד", "ביטוח", "ויזה", "רישיון", "eurail", "interrail", "סריק", "כרטיס טיסה", "אשראי", "ארנק", "כסף", "מזומן", "צילום דרכון", "documents", "passport"] },
  { cat: "🎒 תרמיל", kw: ["תרמיל", "תיק", "ארגונית", "packing", "קוביות", "כיסוי גשם לתיק", "מנעול", "שקית", "שק כביסה", "backpack", "daypack"] },
  { cat: "👟 ביגוד", kw: ["ביגוד", "בגד", "חולצ", "מכנס", "גרב", "תחתונ", "ג'קט", "ז'קט", "מעיל", "פליז", "דאון", "כובע", "כפפ", "נעל", "הנעלה", "סנדל", "כפכפ", "בגד ים", "שורט", "טייץ", "צעיף", "באף", "buff", "פיג'מה", "סווטשירט", "קפוצ", "גופי", "חזיי", "מגפ", "clothes", "shirt", "pants", "socks", "shoes", "jacket"] },
  { cat: "💊 בריאות", kw: ["בריאות", "תרופ", "עזרה ראשונה", "פלסטר", "קרם הגנה", "הגנה מהשמש", "יתוש", "דוחה", "אקמול", "נורופן", "כדור", "ויטמין", "תחבוש", "משחה", "אנטיביוטיק", "אלכוג'ל", "מדחום", "health", "meds", "first aid"] },
  { cat: "🔌 אלקטרוניקה", kw: ["אלקטרוניק", "טכנולוג", "גאדג", "מטען", "כבל", "פאוורבנק", "power bank", "סוללה", "סוללות", "אוזניות", "טלפון", "מצלמה", "גופרו", "gopro", "מתאם", "שעון", "קינדל", "טאבלט", "מחשב", "לפטופ", "usb", "סים", "esim", "רמקול", "electronics", "charger"] },
  { cat: "🧴 היגיינה", kw: ["היגיינה", "טואלט", "רחצה", "מברשת", "משחת שיניים", "חוט דנטלי", "שמפו", "סבון", "דאודורנט", "מגבת", "גילוח", "ציפורנ", "קוסמטיק", "טמפון", "נייר טואלט", "מגבונ", "מספריים", "toiletries"] },
  { cat: "⛺ קמפינג", kw: ["קמפינג", "שטח", "אוהל", "שק שינה", "מזרן", "גזייה", "פנס", "סכין", "אולר", "מימיה", "בקבוק", "פילטר", "מקלות הליכה", "כירה", "סיר", "חבל", "קרבינר", "camping", "tent", "sleeping"] },
  { cat: "🍳 אוכל", kw: ["אוכל", "מטבח", "כלי אוכל", "סכו\"ם", "ספל", "קופסת אוכל", "חטיפ", "תבלינ", "קפה", "food"] },
  { cat: "🎧 בידור", kw: ["בידור", "ספר", "קלפים", "משחק", "יומן", "מחברת", "entertainment"] },
];
const normHe = t => String(t).toLowerCase().replace(/[׳’`]/g, "'").replace(/[״“”]/g, '"');
const bareName = x => x.replace(/[^\p{L}\p{N} ]/gu, "").trim();
function classifyGear(text) {
  const t = normHe(text);
  let best = null, bestLen = 0;
  GEAR_CAT_DEFS.forEach(d => d.kw.forEach(k => { if (t.includes(k) && k.length > bestLen) { best = d.cat; bestLen = k.length; } }));
  return best;
}
const HEADING_ICONS = [["כסף", "💳"], ["צילום", "📷"], ["ספורט", "🏃"], ["חוף", "🏖️"], ["ים", "🏖️"], ["שינה", "😴"], ["טיסה", "✈️"], ["חורף", "❄️"], ["קיץ", "☀️"], ["כביסה", "🧺"], ["מתנות", "🎁"]];
function headingToCat(h, knownCats, itemsUnder) {
  const hb = bareName(h);
  // 1. an existing category with the same name
  const same = knownCats.find(k => { const kb = bareName(k); return kb && hb && (hb.includes(kb) || kb.includes(hb)); });
  if (same) return same;
  // 2. the heading itself is a known kind (e.g. "הנעלה" → ביגוד)
  const byHeading = classifyGear(h);
  if (byHeading) return byHeading;
  // 3. most of the items under it belong to one known category
  const votes = {};
  itemsUnder.forEach(t => { const c = classifyGear(t); if (c) votes[c] = (votes[c] || 0) + 1; });
  const top = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] >= Math.max(1, itemsUnder.length / 2)) return top[0];
  // 4. new category with a fitting icon
  if (!/^\p{L}/u.test(h)) return h;
  const icon = (HEADING_ICONS.find(([k]) => normHe(h).includes(k)) || [, "📦"])[1];
  return `${icon} ${h}`;
}

// Turn a pasted list (from notes / another chat) into gear items.
// Headings: "# x", "x:", "**x**", or – when the list uses bullets – any short line without a bullet.
const BULLET_RE = /^([-*•–▪◦]|\d+[.)]|\[[ xX]\]|☐|☑|✅|✔)\s*/;
function parseGearList(text, knownCats) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const usesBullets = lines.filter(l => BULLET_RE.test(l)).length >= Math.max(2, lines.length * 0.3);
  // First pass: split into sections
  const sections = [{ heading: null, items: [] }];
  for (let line of lines) {
    const isBullet = BULLET_RE.test(line);
    const explicitHeading = !isBullet && (/^#+\s*/.test(line) || /:$/.test(line) || /^\*\*.+\*\*:?$/.test(line));
    if (explicitHeading || (usesBullets && !isBullet)) {
      const h = line.replace(/^#+\s*/, "").replace(/\*\*/g, "").replace(/:$/, "").trim();
      // long sentences between bullets are explanations, not categories
      if (h && h.length <= 40) sections.push({ heading: h, items: [] });
      continue;
    }
    line = line.replace(BULLET_RE, "").replace(/^\[[ xX]\]\s*/, "");
    let link = "";
    const md = line.match(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/);
    if (md) { link = md[2]; line = line.replace(md[0], /^(קישור|לינק|link|here|כאן|לכאן)$/i.test(md[1].trim()) ? "" : md[1]); }
    const url = line.match(/https?:\/\/\S+/);
    if (url) { link = link || url[0]; line = line.replace(url[0], ""); }
    line = line.replace(/\*\*/g, "").replace(/[\s\-–:|]+$/, "").trim();
    if (line) sections[sections.length - 1].items.push({ text: line, link });
  }
  // Second pass: decide each section's category
  const out = [];
  sections.forEach(sec => {
    const secCat = sec.heading ? headingToCat(sec.heading, knownCats, sec.items.map(i => i.text)) : null;
    sec.items.forEach(it => out.push({ ...it, cat: secCat || classifyGear(it.text) || "🧩 אחר" }));
  });
  return out;
}
const normText = t => String(t).toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

function GearImport({ onClose, onImport, persons, defaultOwner }) {
  const [text, setText] = useState("");
  const [owner, setOwner] = useState(defaultOwner);
  const [result, setResult] = useState(null);
  return (
    <Sheet onClose={onClose} title="📋 ייבוא רשימת ציוד">
      {result ? (
        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <div style={{ fontSize: 40 }}>✅</div>
          <div style={{ fontWeight: 800, fontSize: 17, margin: "6px 0" }}>נוספו {result.added} פריטים חדשים</div>
          <div style={{ fontSize: 13, color: T.muted }}>{result.existing} כבר היו ברשימה{result.links ? `, ול-${result.links} מהם נוסף קישור` : ""}.</div>
          {result.cats.length > 0 && <div style={{ fontSize: 13, color: T.muted, marginTop: 6 }}>קטגוריות: {result.cats.join(", ")}</div>}
          <button onClick={onClose} style={primaryBtn({ marginTop: 16 })}>סגור</button>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 6, fontWeight: 600 }}>של מי הרשימה?</div>
          <Segmented value={owner} onChange={setOwner} size={13} options={[{ id: "person1", label: persons[0] }, { id: "person2", label: persons[1] }, { id: "shared", label: "שנינו" }]} />
          <div style={{ fontSize: 13, color: T.muted, margin: "10px 0 8px" }}>מדביקים את הרשימה. שורה בלי תבליט (או שמסתיימת ב-":") הופכת לקטגוריה, וקישורים נשמרים ליד הפריט. פריטים שכבר קיימים לא ייכפלו.</div>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder={"👕 ביגוד\n- חולצת דרייפיט x3\n- מעיל גשם https://...\n\n🎒 תרמיל\n- תיק 55 ליטר"} style={inputStyle({ minHeight: 190, resize: "vertical" })} />
          <button onClick={() => setResult(onImport(text, owner))} disabled={!text.trim()} style={primaryBtn({ marginTop: 10, opacity: text.trim() ? 1 : 0.5 })}>ייבא</button>
        </>
      )}
    </Sheet>
  );
}

function GearItemEdit({ item, meta, cats, persons, onSave, onDelete, onClose }) {
  const [link, setLink] = useState(meta?.link || "");
  const [note, setNote] = useState(meta?.note || "");
  const [cat, setCat] = useState(item.cat);
  const [newCat, setNewCat] = useState("");
  const [owner, setOwner] = useState(item.owner || "shared");
  const custom = item.id.startsWith("custom_");
  const label = { fontSize: 12, color: T.muted, margin: "12px 0 6px", fontWeight: 600 };
  return (
    <Sheet onClose={onClose} title={item.text}>
      <input value={link} onChange={e => setLink(e.target.value)} placeholder="🔗 קישור למוצר (למשל מה שרצינו לקנות)" style={inputStyle()} />
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="הערה (מידה, צבע, מחיר…)" style={inputStyle({ marginTop: 8 })} />
      <div style={label}>קטגוריה</div>
      <select value={cat} onChange={e => setCat(e.target.value)} style={inputStyle()}>
        {cats.map(c => <option key={c} value={c}>{c}</option>)}
        <option value="__new">+ קטגוריה חדשה…</option>
      </select>
      {cat === "__new" && <input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="שם הקטגוריה" style={inputStyle({ marginTop: 8 })} />}
      {custom && <>
        <div style={label}>של מי הפריט?</div>
        <Segmented value={owner} onChange={setOwner} size={13} options={[{ id: "person1", label: persons[0] }, { id: "person2", label: persons[1] }, { id: "shared", label: "שנינו" }]} />
      </>}
      <button onClick={() => {
        const finalCat = cat === "__new" ? (newCat.trim() ? (/^\p{L}/u.test(newCat.trim()) ? `📦 ${newCat.trim()}` : newCat.trim()) : item.cat) : cat;
        onSave({ link: link.trim(), note: note.trim(), cat: finalCat, owner: owner === "shared" ? undefined : owner });
        onClose();
      }} style={primaryBtn({ marginTop: 14 })}>שמור</button>
      <button onClick={() => { if (confirm(`למחוק את "${item.text}" מהרשימה?`)) { onDelete(); onClose(); } }} style={{ width: "100%", marginTop: 8, background: "none", border: `1px solid ${T.surfaceBorder}`, borderRadius: 14, color: T.red, padding: 10, cursor: "pointer", fontFamily: "'Heebo',sans-serif" }}>מחק פריט</button>
    </Sheet>
  );
}

// All gear items with their current category, without deleted ones.
// pid: only items for that person (shared + theirs); omit for everything.
function gearItems(customGear, gearMeta, gearHidden, pid) {
  const builtin = Object.entries(GEAR_ITEMS).flatMap(([cat, items]) => items.map(i => ({ ...i, cat })));
  return [...builtin, ...customGear]
    .filter(i => !gearHidden[i.id] && (!pid || !i.owner || i.owner === pid))
    .map(i => ({ ...i, cat: gearMeta[i.id]?.cat || i.cat }));
}
const gearCatList = items => [...new Set([...Object.keys(GEAR_ITEMS), ...items.map(i => i.cat)])];

function GearManage({ items, persons, activeUser, onAutoSort, onDeleteCat, onDeleteCustom, onRestore, onClearChecks, onClose, hiddenCount }) {
  const cats = gearCatList(items).filter(c => items.some(i => i.cat === c));
  const customCount = items.filter(i => i.id.startsWith("custom_")).length;
  const row = { display: "flex", alignItems: "center", gap: 8, padding: "10px 0", borderBottom: `1px solid ${T.surfaceBorder}` };
  const danger = { background: "none", border: `1px solid ${T.surfaceBorder}`, borderRadius: 10, color: T.red, padding: "5px 10px", cursor: "pointer", fontFamily: "'Heebo',sans-serif", fontSize: 12 };
  const big = (color = T.text) => ({ width: "100%", textAlign: "right", background: "rgba(255,255,255,0.05)", border: `1px solid ${T.surfaceBorder}`, borderRadius: 14, color, padding: "12px 14px", cursor: "pointer", fontFamily: "'Heebo',sans-serif", fontSize: 14, marginTop: 8 });
  return (
    <Sheet onClose={onClose} title="⚙️ ניהול רשימת הציוד">
      <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginBottom: 4 }}>קטגוריות</div>
      {cats.map(c => (
        <div key={c} style={row}>
          <div style={{ flex: 1, fontSize: 14 }}>{c} <span style={{ color: T.muted, fontSize: 12 }}>({items.filter(i => i.cat === c).length})</span></div>
          <button onClick={() => { if (confirm(`למחוק את הקטגוריה "${c}" וכל הפריטים שבה?`)) onDeleteCat(c); }} style={danger}>מחק</button>
        </div>
      ))}
      <button onClick={onAutoSort} style={big()}>🪄 לסדר אוטומטית: להעביר פריטים לקטגוריה המתאימה</button>
      <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, margin: "16px 0 0" }}>איפוס</div>
      <button onClick={() => { if (confirm(`לנקות את כל הסימונים של ${persons[activeUser === "person1" ? 0 : 1]}?`)) onClearChecks(); }} style={big()}>⬜ לנקות את הסימונים של {persons[activeUser === "person1" ? 0 : 1]}</button>
      {hiddenCount > 0 && <button onClick={onRestore} style={big()}>↩️ להחזיר {hiddenCount} פריטים מקוריים שנמחקו</button>}
      <button disabled={!customCount} onClick={() => { if (confirm(`למחוק את כל ${customCount} הפריטים שהוספתם או ייבאתם? אי אפשר לבטל.`)) onDeleteCustom(); }} style={{ ...big(T.red), opacity: customCount ? 1 : 0.4 }}>🗑️ למחוק את כל הפריטים שהוספתם/ייבאתם ({customCount})</button>
    </Sheet>
  );
}

function GearScreen({ checkedBy, setCheckedBy, customGear, setCustomGear, gearMeta, setGearMeta, gearHidden, setGearHidden, persons, activeUser, setActiveUser }) {
  const [expanded, setExpanded] = useState("📄 מסמכים");
  const [newItem, setNewItem] = useState("");
  const [newCat, setNewCat] = useState("📄 מסמכים");
  const [newOwner, setNewOwner] = useState("shared");
  const [editItem, setEditItem] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [showManage, setShowManage] = useState(false);

  const pIdx = activeUser === "person1" ? 0 : 1;
  const checked = checkedBy[activeUser] || {};
  const other = activeUser === "person1" ? "person2" : "person1";
  const everything = gearItems(customGear, gearMeta, gearHidden);
  const mine = gearItems(customGear, gearMeta, gearHidden, activeUser);
  const theirs = gearItems(customGear, gearMeta, gearHidden, other);
  const cats = gearCatList(everything);
  const totalDone = mine.filter(i => checked[i.id]).length;
  const otherDone = theirs.filter(i => checkedBy[other]?.[i.id]).length;
  const pct = mine.length ? Math.round((totalDone / mine.length) * 100) : 0;
  const toggle = id => setCheckedBy(p => ({ ...p, [activeUser]: { ...(p[activeUser] || {}), [id]: !p[activeUser]?.[id] } }));

  const addCustom = () => {
    if (!newItem.trim()) return;
    const id = `custom_${Date.now()}`;
    setCustomGear(p => [...p, { id, text: newItem.trim(), cat: newCat, ...(newOwner !== "shared" ? { owner: activeUser } : {}) }]);
    setNewItem("");
  };

  const importList = (text, owner) => {
    const pool = owner === "shared" ? everything : gearItems(customGear, gearMeta, gearHidden, owner);
    const items = parseGearList(text, cats);
    const byNorm = new Map(pool.map(i => [normText(i.text), i]));
    const added = [], metaPatch = {};
    let existing = 0, links = 0;
    items.forEach((it, n) => {
      const key = normText(it.text);
      const found = byNorm.get(key);
      if (found) {
        existing++;
        if (it.link && !gearMeta[found.id]?.link && !metaPatch[found.id]) { metaPatch[found.id] = { ...(gearMeta[found.id] || {}), link: it.link }; links++; }
        return;
      }
      const id = `custom_${Date.now()}_${n}`;
      const item = { id, text: it.text, cat: it.cat, ...(owner !== "shared" ? { owner } : {}) };
      byNorm.set(key, item);
      added.push(item);
      if (it.link) metaPatch[id] = { link: it.link };
    });
    if (added.length) setCustomGear(p => [...p, ...added]);
    if (Object.keys(metaPatch).length) setGearMeta(p => ({ ...p, ...metaPatch }));
    if (owner !== "shared" && owner !== activeUser) setActiveUser(owner);
    if (added[0]) setExpanded(added[0].cat);
    return { added: added.length, existing, links, cats: [...new Set(added.map(a => a.cat))] };
  };

  const deleteItem = item => {
    if (item.id.startsWith("custom_")) setCustomGear(p => p.filter(g => g.id !== item.id));
    else setGearHidden(h => ({ ...h, [item.id]: true }));
  };
  // Move added items into the category their name points to (only out of non-built-in categories)
  const autoSort = () => {
    let moved = 0;
    const metaPatch = {};
    const next = customGear.map(g => {
      const cur = gearMeta[g.id]?.cat || g.cat;
      const target = classifyGear(g.text);
      if (!target || target === cur || GEAR_ITEMS[cur]) return g;
      moved++;
      if (gearMeta[g.id]?.cat) metaPatch[g.id] = { ...gearMeta[g.id], cat: undefined };
      return { ...g, cat: target };
    });
    setCustomGear(next);
    if (Object.keys(metaPatch).length) setGearMeta(p => ({ ...p, ...metaPatch }));
    alert(moved ? `הועברו ${moved} פריטים לקטגוריה המתאימה` : "הכל כבר מסודר 👌");
  };
  const deleteCat = cat => {
    const inCat = everything.filter(i => i.cat === cat);
    const ids = new Set(inCat.map(i => i.id));
    setCustomGear(p => p.filter(g => !ids.has(g.id)));
    setGearHidden(h => ({ ...h, ...Object.fromEntries(inCat.filter(i => !i.id.startsWith("custom_")).map(i => [i.id, true])) }));
  };

  return (
    <div className="scr" style={{ padding: "16px 14px 24px", overflowY: "auto", height: "100%", boxSizing: "border-box" }}>
      <div style={{ marginBottom: 12 }}>
        <Segmented value={activeUser} onChange={setActiveUser} options={[{ id: "person1", label: `🎒 ${persons[0]}` }, { id: "person2", label: `🎒 ${persons[1]}` }]} />
      </div>

      {/* Progress */}
      <div key={activeUser} className="fade-up" style={{ ...card({ marginBottom: 12, display: "flex", alignItems: "center", gap: 14 }) }}>
        <div style={{ position: "relative", width: 60, height: 60, flexShrink: 0 }}>
          <svg viewBox="0 0 60 60" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="30" cy="30" r="25" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
            <circle cx="30" cy="30" r="25" fill="none" stroke={T.green} strokeWidth="6" strokeDasharray={`${pct * 1.57} 157`} strokeLinecap="round" style={{ transition: "stroke-dasharray .6s" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: T.green }}>{pct}%</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>הציוד של {persons[pIdx]}</div>
          <div style={{ fontSize: 13, color: T.muted }}>{totalDone} מתוך {mine.length} פריטים</div>
          <div style={{ fontSize: 12, color: T.muted }}>{persons[1 - pIdx]}: {otherDone}/{theirs.length}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button onClick={() => setShowImport(true)} style={chip(false, T.primary, { fontSize: 12 })}>📋 ייבוא</button>
          <button onClick={() => setShowManage(true)} style={chip(false, T.primary, { fontSize: 12 })}>⚙️ ניהול</button>
        </div>
      </div>

      {/* Gear categories */}
      {cats.map(cat => {
        const allCatItems = mine.filter(i => i.cat === cat);
        if (!allCatItems.length) return null;
        const catDone = allCatItems.filter(i => checked[i.id]).length;
        const isOpen = expanded === cat;
        return (
          <div key={cat} style={{ ...card({ padding: 0, overflow: "hidden", marginBottom: 8, border: `1px solid ${isOpen ? T.primaryBorder : T.surfaceBorder}` }) }}>
            <button onClick={() => setExpanded(isOpen ? null : cat)} style={{
              width: "100%", background: isOpen ? T.primaryDim : "none", border: "none", color: T.text,
              fontFamily: "'Heebo',sans-serif", padding: "13px 16px", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontWeight: 700, fontSize: 15, textAlign: "right" }}>{cat}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: catDone === allCatItems.length ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.08)", color: catDone === allCatItems.length ? T.green : T.muted, borderRadius: 20, padding: "2px 10px", fontSize: 12 }}>{catDone}/{allCatItems.length}</span>
                <span style={{ color: T.muted, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .3s" }}>⌄</span>
              </div>
            </button>
            <div style={{ display: "grid", gridTemplateRows: isOpen ? "1fr" : "0fr", transition: "grid-template-rows .35s cubic-bezier(.2,.8,.2,1)" }}>
              <div style={{ overflow: "hidden" }}>
                {allCatItems.map(item => {
                  const meta = gearMeta[item.id];
                  const on = !!checked[item.id];
                  return (
                    <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderTop: `1px solid ${T.surfaceBorder}` }}>
                      <div onClick={() => toggle(item.id)} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, cursor: "pointer", opacity: on ? 0.45 : 1, transition: "opacity .2s" }}>
                        <div style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, border: `2px solid ${on ? T.green : "rgba(255,255,255,0.22)"}`, background: on ? T.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                          {on && <span style={{ color: "#06281c", fontSize: 13, fontWeight: 900 }}>✓</span>}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, textDecoration: on ? "line-through" : "none" }}>{item.text}{item.owner && <span style={{ fontSize: 11, color: T.muted }}> · רק שלי</span>}</div>
                          {meta?.note && <div style={{ fontSize: 12, color: T.muted }}>{meta.note}</div>}
                        </div>
                      </div>
                      {meta?.link && <a href={meta.link} target="_blank" rel="noreferrer" style={{ fontSize: 16, textDecoration: "none", flexShrink: 0 }}>🔗</a>}
                      <button onClick={() => setEditItem(item)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 15, flexShrink: 0, padding: 2 }}>✏️</button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      {/* Add custom item */}
      <div style={{ ...card({ marginTop: 8 }) }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>+ הוסף פריט</div>
        <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === "Enter" && addCustom()} placeholder="שם הפריט..." style={inputStyle({ marginBottom: 8 })} />
        <div style={{ marginBottom: 8 }}>
          <Segmented value={newOwner} onChange={setNewOwner} size={13} options={[{ id: "shared", label: "לשנינו" }, { id: "mine", label: `רק ל${persons[pIdx]}` }]} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={newCat} onChange={e => setNewCat(e.target.value)} style={inputStyle({ flex: 1 })}>
            {cats.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <button onClick={addCustom} style={primaryBtn({ width: "auto", padding: "0 20px" })}>הוסף</button>
        </div>
      </div>

      {showImport && <GearImport onClose={() => setShowImport(false)} onImport={importList} persons={persons} defaultOwner={activeUser} />}
      {showManage && <GearManage items={everything} persons={persons} activeUser={activeUser} hiddenCount={Object.keys(gearHidden).filter(k => gearHidden[k]).length}
        onAutoSort={autoSort}
        onDeleteCat={deleteCat}
        onDeleteCustom={() => setCustomGear([])}
        onRestore={() => setGearHidden({})}
        onClearChecks={() => setCheckedBy(p => ({ ...p, [activeUser]: {} }))}
        onClose={() => setShowManage(false)} />}
      {editItem && <GearItemEdit item={editItem} meta={gearMeta[editItem.id]} cats={cats} persons={persons} onClose={() => setEditItem(null)}
        onSave={({ link, note, cat, owner }) => {
          setGearMeta(p => ({ ...p, [editItem.id]: { ...(p[editItem.id] || {}), link, note, cat } }));
          if (editItem.id.startsWith("custom_")) setCustomGear(p => p.map(g => { if (g.id !== editItem.id) return g; const { owner: _o, ...rest } = g; return owner ? { ...rest, owner } : rest; }));
        }}
        onDelete={() => deleteItem(editItem)} />}
    </div>
  );
}

// ─── PERSONAL SCREEN ──────────────────────────────────────────────────────────

function PersonalScreen({ persons, setPersons, activeUser, setActiveUser, expenses, personalNotes, setPersonalNotes, countries, gearCheckedBy, customGear, gearMeta, gearHidden, onGoGear }) {
  const [editNames, setEditNames] = useState(false);
  const [tmpNames, setTmpNames] = useState([...persons]);

  const personIdx = activeUser === "person1" ? 0 : 1;
  const bal = calcBalance(expenses);
  const myPart = expenses.reduce((s, e) => s + expShares(e)[personIdx], 0);
  const myNet = personIdx === 0 ? bal.net1 : -bal.net1;

  return (
    <div className="scr" style={{ padding: "16px 14px 24px", overflowY: "auto", height: "100%", boxSizing: "border-box" }}>
      {/* Person switcher */}
      <div style={{ marginBottom: 14 }}>
        <Segmented value={activeUser} onChange={setActiveUser} size={16} options={[{ id: "person1", label: `👤 ${persons[0]}` }, { id: "person2", label: `👤 ${persons[1]}` }]} />
      </div>

      {/* Name settings */}
      <div style={{ ...card({ marginBottom: 16 }) }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: editNames ? 12 : 0 }}>
          <div style={{ fontWeight: 700, color: T.text }}>⚙️ שמות</div>
          <button onClick={() => { if (editNames) setPersons(tmpNames); setEditNames(v => !v); }} style={{ background: editNames ? T.primary : T.surface, border: `1px solid ${editNames ? T.primaryBorder : T.surfaceBorder}`, borderRadius: 8, color: editNames ? "#fff" : T.muted, padding: "5px 12px", cursor: "pointer", fontFamily: "'Heebo',sans-serif", fontSize: 13 }}>
            {editNames ? "שמור" : "ערוך"}
          </button>
        </div>
        {editNames && (
          <div style={{ display: "flex", gap: 8 }}>
            {[0, 1].map(i => (
              <input key={i} value={tmpNames[i]} onChange={e => setTmpNames(p => { const n = [...p]; n[i] = e.target.value; return n; })}
                style={{ flex: 1, background: T.faint, border: `1px solid ${T.surfaceBorder}`, borderRadius: 8, color: T.text, fontFamily: "'Heebo',sans-serif", fontSize: 14, padding: "8px 12px" }} />
            ))}
          </div>
        )}
      </div>

      {/* My stats */}
      <div key={activeUser} className="fade-up" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          { label: "החלק שלי בהוצאות", value: money(myPart), color: T.primary },
          { label: "שילמתי בפועל", value: money(bal.paid[personIdx]), color: "#a78bfa" },
          { label: Math.abs(myNet) < 0.01 ? "מאוזן" : myNet > 0 ? "מגיע לי" : "אני חייב", value: money(Math.abs(myNet)), color: myNet >= 0 ? T.green : "#fbbf24" },
        ].map(st => (
          <div key={st.label} style={{ flex: 1, ...card({ padding: "12px 6px", textAlign: "center", marginBottom: 0 }) }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: st.color }}>{st.value}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{st.label}</div>
          </div>
        ))}
      </div>

      {/* My gear */}
      {(() => {
        const all = gearItems(customGear, gearMeta, gearHidden, activeUser);
        const mine = gearCheckedBy[activeUser] || {};
        const done = all.filter(i => mine[i.id]).length;
        const left = all.filter(i => !mine[i.id]);
        return (
          <div onClick={onGoGear} style={{ ...card({ marginBottom: 16, cursor: "pointer" }) }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
              <div style={{ flex: 1, fontWeight: 800 }}>🎒 הציוד שלי</div>
              <div style={{ fontSize: 13, color: T.green, fontWeight: 700 }}>{done}/{all.length}</div>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
              <div style={{ height: "100%", width: `${all.length ? (done / all.length) * 100 : 0}%`, background: "linear-gradient(90deg,#34d399,#22c3e6)", transition: "width .6s" }} />
            </div>
            <div style={{ fontSize: 12, color: T.muted }}>{left.length ? `עוד חסר: ${left.slice(0, 4).map(i => i.text).join(", ")}${left.length > 4 ? ` ועוד ${left.length - 4}` : ""}` : "הכל ארוז! 🎉"}</div>
          </div>
        );
      })()}

      {/* Personal notes per country */}
      <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 10 }}>📝 ההערות שלי לפי מדינה</div>
      {countries.map(c => (
        <div key={c.name} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 13, color: T.muted, marginBottom: 4 }}>{c.emoji} {c.name}</div>
          <textarea value={(personalNotes[activeUser]?.[c.name]) || ""}
            onChange={e => setPersonalNotes(p => ({ ...p, [activeUser]: { ...(p[activeUser] || {}), [c.name]: e.target.value } }))}
            placeholder="הערות אישיות..."
            style={{ width: "100%", background: T.faint, border: `1px solid ${T.surfaceBorder}`, borderRadius: 8, color: T.text, fontFamily: "'Heebo',sans-serif", fontSize: 13, padding: "8px 10px", resize: "vertical", minHeight: 52, boxSizing: "border-box" }} />
        </div>
      ))}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function TripPlanner() {
  const saved = load();

  const [countries, setCountries] = useState(() =>
    COUNTRIES.map(c => ({ ...c, weeks: saved?.countryWeeks?.[c.name] ?? c.weeks }))
  );
  const [tab, setTab] = useState("map");
  const [dir, setDir] = useState("left");
  const [pins, setPins] = useState(saved?.pins || []);
  const [tracks, setTracks] = useState(saved?.tracks || []);
  const [cities, setCities] = useState(saved?.cities || {});
  const [notes, setNotes] = useState(saved?.notes || {});
  const [expenses, setExpenses] = useState(saved?.expenses || []);
  const [gearChecked, setGearChecked] = useState(saved?.gearChecked || {});
  // Per-person packing. Before this existed there was one shared checklist (gearChecked) – copy it to both.
  const [gearCheckedBy, setGearCheckedBy] = useState(saved?.gearCheckedBy || { person1: { ...(saved?.gearChecked || {}) }, person2: { ...(saved?.gearChecked || {}) } });
  const [gearMeta, setGearMeta] = useState(saved?.gearMeta || {});
  const [gearHidden, setGearHidden] = useState(saved?.gearHidden || {});
  const [customGear, setCustomGear] = useState(saved?.customGear || []);
  const [persons, setPersons] = useState(saved?.persons || ["אני", "החבר"]);
  const [activeUser, setActiveUser] = useState(saved?.activeUser || "person1");
  const [personalNotes, setPersonalNotes] = useState(saved?.personalNotes || {});
  const [compares, setCompares] = useState(saved?.compares || []);
  const [savedPulse, setSavedPulse] = useState(false);

  const doSave = useCallback(() => {
    persist({
      countryWeeks: Object.fromEntries(countries.map(c => [c.name, c.weeks])),
      pins, tracks, cities, notes, expenses, gearChecked, gearCheckedBy, gearMeta, gearHidden, customGear, persons, activeUser, personalNotes, compares,
    });
    setSavedPulse(true);
    setTimeout(() => setSavedPulse(false), 1200);
  }, [countries, pins, tracks, cities, notes, expenses, gearChecked, gearCheckedBy, gearMeta, gearHidden, customGear, persons, activeUser, personalNotes, compares]);

  useEffect(() => { const t = setTimeout(doSave, 800); return () => clearTimeout(t); }, [doSave]);

  const totalBudget = countries.reduce((s, c) => s + DAILY_BUDGET[c.name] * c.weeks * 7, 0);
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const totalWeeks = countries.reduce((s, c) => s + c.weeks, 0);

  const TABS = [
    { id: "map",      label: "מפה",     icon: "🗺️" },
    { id: "plan",     label: "מסלול",   icon: "📅" },
    { id: "budget",   label: "תקציב",   icon: "💰" },
    { id: "compare",  label: "השוואות", icon: "⚖️" },
    { id: "gear",     label: "ציוד",    icon: "🎒" },
    { id: "personal", label: "אישי",    icon: "👤" },
  ];
  const tabIdx = TABS.findIndex(t => t.id === tab);
  const [mapFocus, setMapFocus] = useState(null);
  const showOnMap = pin => { setMapFocus({ id: pin.id, t: Date.now() }); goTab("map"); };
  const goTab = id => {
    if (id === tab) return;
    setDir(TABS.findIndex(t => t.id === id) > tabIdx ? "left" : "right");
    setTab(id);
  };

  return (
    <div style={{ height: "100dvh", color: T.text, fontFamily: "'Heebo', sans-serif", direction: "rtl", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700;800;900&display=swap" rel="stylesheet" />
      <style>{GLOBAL_CSS}</style>

      {/* HEADER */}
      <div style={{ ...glass({ borderTop: "none", borderLeft: "none", borderRight: "none" }), padding: "calc(10px + env(safe-area-inset-top)) 16px 10px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0, zIndex: 1000 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: 20, lineHeight: 1.1, background: T.grad, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>הטיול הגדול</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>{countries.length} מדינות · {totalWeeks} שבועות · 2 חברים</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: totalSpent > totalBudget ? T.red : T.green }}>€{Math.round(totalSpent).toLocaleString()}</div>
            <div style={{ fontSize: 10, color: T.muted }}>מתוך €{Math.round(totalBudget).toLocaleString()}</div>
          </div>
          <div title="נשמר אוטומטית" style={{ width: 10, height: 10, borderRadius: "50%", background: savedPulse ? T.green : "rgba(255,255,255,0.2)", boxShadow: savedPulse ? `0 0 10px ${T.green}` : "none", transition: "all .3s" }} />
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
        <div className="map-in" style={{ position: "absolute", inset: 0, display: tab === "map" ? "block" : "none" }}>
          <MapScreen visible={tab === "map"} countries={countries} cities={cities} setCities={setCities} pins={pins} onPinsChange={setPins} tracks={tracks} onTracksChange={setTracks} compares={compares} expenses={expenses} focus={mapFocus} />
        </div>
        {tab !== "map" && (
          <div key={tab} className={dir === "left" ? "enter-left" : "enter-right"} style={{ height: "100%", position: "relative", zIndex: 1 }}>
            {tab === "plan"     && <PlanScreen countries={countries} setCountries={setCountries} cities={cities} setCities={setCities} notes={notes} setNotes={setNotes} pins={pins} setPins={setPins} expenses={expenses} onShowMap={showOnMap} />}
            {tab === "budget"   && <BudgetScreen countries={countries} expenses={expenses} setExpenses={setExpenses} persons={persons} pins={pins} />}
            {tab === "compare"  && <CompareScreen countries={countries} compares={compares} setCompares={setCompares} persons={persons} pins={pins} setPins={setPins} />}
            {tab === "gear"     && <GearScreen checkedBy={gearCheckedBy} setCheckedBy={setGearCheckedBy} customGear={customGear} setCustomGear={setCustomGear} gearMeta={gearMeta} setGearMeta={setGearMeta} gearHidden={gearHidden} setGearHidden={setGearHidden} persons={persons} activeUser={activeUser} setActiveUser={setActiveUser} />}
            {tab === "personal" && <PersonalScreen persons={persons} setPersons={setPersons} activeUser={activeUser} setActiveUser={setActiveUser} expenses={expenses} personalNotes={personalNotes} setPersonalNotes={setPersonalNotes} countries={countries} gearCheckedBy={gearCheckedBy} customGear={customGear} gearMeta={gearMeta} gearHidden={gearHidden} onGoGear={() => goTab("gear")} />}
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div style={{ padding: "6px 10px calc(8px + env(safe-area-inset-bottom))", flexShrink: 0, zIndex: 1000 }}>
        <div style={{ ...glass({ borderRadius: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.45)" }), position: "relative", display: "flex", padding: 4 }}>
          <div style={{ position: "absolute", top: 4, bottom: 4, right: 4, width: `calc((100% - 8px) / ${TABS.length})`, transform: `translateX(${-tabIdx * 100}%)`, background: T.primaryDim, border: `1px solid ${T.primaryBorder}`, borderRadius: 20, transition: "transform .4s cubic-bezier(.2,.8,.2,1)", boxSizing: "border-box" }} />
          {TABS.map(t => (
            <button key={t.id} onClick={() => goTab(t.id)} style={{
              position: "relative", flex: 1, minWidth: 0, padding: "7px 0 6px", background: "none", border: "none",
              color: tab === t.id ? "#fff" : T.muted, cursor: "pointer", fontSize: 10.5, fontWeight: tab === t.id ? 700 : 500,
              fontFamily: "'Heebo',sans-serif", display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            }}>
              <span style={{ fontSize: 20, transform: tab === t.id ? "translateY(-1px) scale(1.12)" : "none", transition: "transform .3s cubic-bezier(.2,.8,.2,1)", filter: tab === t.id ? "none" : "grayscale(35%) opacity(0.8)" }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
