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

const TRIP_START = new Date("2027-04-29");

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
        animation: "sheetUp .32s cubic-bezier(.2,.8,.2,1) both", direction: "rtl",
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

function MapScreen({ countries, pins, onPinsChange, tracks, onTracksChange }) {
  const mapRef = useRef(null);
  const mapInst = useRef(null);
  const customMarkers = useRef([]);
  const trackLines = useRef([]);
  const [ready, setReady] = useState(true);
  const [clickMode, setClickMode] = useState(false);
  const [pending, setPending] = useState(null);
  const [form, setForm] = useState({ name: "", note: "", cat: "attraction" });
  const [filterCat, setFilterCat] = useState("all");
  const [showList, setShowList] = useState(false);
  const [gpxLoading, setGpxLoading] = useState(false);
  const gpxInputRef = useRef(null);

  // Leaflet is now bundled - always ready
  useEffect(() => { setReady(true); }, []);

  // Init map
  useEffect(() => {
    if (!ready || mapInst.current || !mapRef.current) return;
    const map = L.map(mapRef.current).setView([50, 13], 4);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap © CARTO", maxZoom: 20,
    }).addTo(map);

    // Route line
    L.polyline(countries.map(c => [c.lat, c.lng]), {
      color: T.primary, weight: 2, opacity: 0.5, dashArray: "8,6",
    }).addTo(map);

    // Country markers
    countries.forEach((c, i) => {
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:${c.color};color:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;border:2px solid rgba(255,255,255,0.8);box-shadow:0 2px 10px rgba(0,0,0,0.5);">${c.emoji}</div>`,
        iconSize: [36, 36], iconAnchor: [18, 18],
      });
      L.marker([c.lat, c.lng], { icon }).addTo(map)
        .bindPopup(`<div style="font-family:sans-serif;direction:rtl;min-width:120px;"><b>${c.emoji} ${c.name}</b><br/>${c.weeks} שבועות</div>`);
    });

    map.on("click", e => {
      if (!clickMode) return;
      setPending(e.latlng);
      setForm({ name: "", note: "", cat: "attraction" });
    });

    mapInst.current = map;
    return () => { map.remove(); mapInst.current = null; };
  }, [ready]);

  // Update click mode listener
  useEffect(() => {
    if (!mapInst.current) return;
    mapInst.current.off("click");
    mapInst.current.on("click", e => {
      if (!clickMode) return;
      setPending(e.latlng);
      setForm({ name: "", note: "", cat: "attraction" });
    });
  }, [clickMode]);

  // Render pins
  useEffect(() => {
    if (!mapInst.current) return;
    customMarkers.current.forEach(m => mapInst.current.removeLayer(m));
    customMarkers.current = [];
    const filtered = filterCat === "all" ? pins : pins.filter(p => p.cat === filterCat);
    filtered.forEach(pin => {
      const cat = PIN_CATS.find(c => c.id === pin.cat) || PIN_CATS[5];
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:${cat.color};color:#fff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:15px;border:2px solid rgba(255,255,255,0.8);box-shadow:0 2px 8px rgba(0,0,0,0.5);">${cat.icon}</div>`,
        iconSize: [30, 30], iconAnchor: [15, 15],
      });
      const m = L.marker([pin.lat, pin.lng], { icon }).addTo(mapInst.current);
      m.bindPopup(`<div style="font-family:sans-serif;direction:rtl"><b>${cat.icon} ${pin.name}</b>${pin.note ? `<br/><small style="color:#666">${pin.note}</small>` : ""}</div>`);
      customMarkers.current.push(m);
    });
  }, [pins, filterCat, ready]);

  // Render GPX tracks
  useEffect(() => {
    if (!mapInst.current) return;
    trackLines.current.forEach(l => mapInst.current.removeLayer(l));
    trackLines.current = [];
    tracks.forEach(trk => {
      if (!trk.points?.length) return;
      const line = L.polyline(trk.points, { color: trk.color || T.accent, weight: 3, opacity: 0.85 }).addTo(mapInst.current);
      line.bindPopup(`<b>${trk.name}</b>`);
      trackLines.current.push(line);
    });
  }, [tracks, ready]);

  const savePin = () => {
    if (!form.name.trim() || !pending) return;
    onPinsChange([...pins, { id: Date.now(), name: form.name.trim(), note: form.note.trim(), cat: form.cat, lat: pending.lat, lng: pending.lng }]);
    setPending(null); setClickMode(false);
  };

  const parseGPX = (text, filename) => {
    const xml = new DOMParser().parseFromString(text, "text/xml");
    const nameEl = xml.querySelector("metadata > name, trk > name");
    const name = nameEl?.textContent || filename.replace(".gpx", "");
    const pts = Array.from(xml.querySelectorAll("trkpt")).map(pt => [
      parseFloat(pt.getAttribute("lat")), parseFloat(pt.getAttribute("lon")),
    ]);
    if (pts.length < 2) return null;
    return { id: Date.now(), name, color: T.accent, points: pts };
  };

  const handleGPX = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGpxLoading(true);
    const reader = new FileReader();
    reader.onload = ev => {
      const track = parseGPX(ev.target.result, file.name);
      if (track) {
        onTracksChange([...tracks, track]);
        if (mapInst.current && window.L) {
          mapInst.current.fitBounds(L.polyline(track.points).getBounds(), { padding: [20, 20] });
        }
      }
      setGpxLoading(false);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const TRAIL_COLORS = ["#f97316", "#10b981", "#3b82f6", "#8b5cf6", "#f43f5e", "#06b6d4"];

  return (
    <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Category filter bar */}
      <div style={{ display: "flex", gap: 6, padding: "10px 14px", background: T.navBg, overflowX: "auto", flexShrink: 0, borderBottom: `1px solid ${T.surfaceBorder}` }}>
        {[{ id: "all", label: "הכל", icon: "🗺️", color: T.primary }, ...PIN_CATS].map(cat => (
          <button key={cat.id} onClick={() => setFilterCat(cat.id)} style={{
            display: "flex", alignItems: "center", gap: 5,
            background: filterCat === cat.id ? (cat.color || T.primary) : "rgba(255,255,255,0.06)",
            border: "none", borderRadius: 20, color: "#fff", padding: "5px 12px",
            cursor: "pointer", fontSize: 12, whiteSpace: "nowrap", fontFamily: "'Heebo',sans-serif", flexShrink: 0,
          }}>{cat.icon} {cat.label}</button>
        ))}
      </div>

      {/* Map */}
      <div ref={mapRef} style={{ flex: 1, background: T.faint, position: "relative", zIndex: 0 }}>

      </div>

      {/* FABs */}
      <div style={{ position: "absolute", bottom: 16, left: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {/* GPX upload */}
        <button onClick={() => gpxInputRef.current?.click()} style={{
          width: 44, height: 44, borderRadius: "50%", background: T.accent,
          border: "none", color: "#fff", fontSize: 20, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 14px rgba(249,115,22,0.5)",
        }} title="העלה מסלול GPX">{gpxLoading ? "⏳" : "⛰️"}</button>
        <input ref={gpxInputRef} type="file" accept=".gpx" style={{ display: "none" }} onChange={handleGPX} />

        {/* Toggle list */}
        <button onClick={() => setShowList(v => !v)} style={{
          width: 44, height: 44, borderRadius: "50%", background: showList ? T.primary : "rgba(255,255,255,0.1)",
          border: `1px solid ${T.surfaceBorder}`, color: "#fff", fontSize: 18, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
        }}>📋</button>
      </div>

      {/* Add pin FAB */}
      <button onClick={() => { setClickMode(v => !v); setPending(null); }} style={{
        position: "absolute", bottom: 16, right: 14,
        background: clickMode ? "#ef4444" : T.primary,
        border: "none", borderRadius: 28, color: "#fff",
        padding: "12px 18px", cursor: "pointer", fontFamily: "'Heebo',sans-serif",
        fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6,
        boxShadow: "0 4px 16px rgba(59,130,246,0.5)", transition: "background 0.2s",
      }}>
        {clickMode ? "✕ ביטול" : "📍 הוסף נקודה"}
      </button>

      {clickMode && !pending && (
        <div style={{ position: "absolute", top: 54, left: "50%", transform: "translateX(-50%)", background: "rgba(15,20,32,0.92)", border: `1px solid ${T.primaryBorder}`, borderRadius: 10, padding: "8px 14px", fontSize: 13, color: T.primary, backdropFilter: "blur(8px)" }}>
          לחץ על המפה להוספת נקודה
        </div>
      )}

      {/* Add pin form */}
      {pending && (
        <div style={{ position: "absolute", bottom: 70, right: 14, left: 14, background: "rgba(11,14,23,0.96)", border: `1px solid ${T.primaryBorder}`, borderRadius: 14, padding: 16, backdropFilter: "blur(12px)" }}>
          <div style={{ fontWeight: 700, color: T.text, marginBottom: 12, fontSize: 14 }}>📍 נקודה חדשה</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {PIN_CATS.map(cat => (
              <button key={cat.id} onClick={() => setForm(f => ({ ...f, cat: cat.id }))} style={{
                background: form.cat === cat.id ? cat.color : "rgba(255,255,255,0.07)",
                border: "none", borderRadius: 16, color: "#fff", padding: "4px 10px",
                cursor: "pointer", fontSize: 12, fontFamily: "'Heebo',sans-serif",
              }}>{cat.icon} {cat.label}</button>
            ))}
          </div>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="שם המקום *" autoFocus
            style={{ width: "100%", background: T.faint, border: `1px solid ${T.surfaceBorder}`, borderRadius: 8, color: T.text, fontFamily: "'Heebo',sans-serif", fontSize: 14, padding: "8px 12px", marginBottom: 8, boxSizing: "border-box" }} />
          <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="הערה (אופציונלי)"
            style={{ width: "100%", background: T.faint, border: `1px solid ${T.surfaceBorder}`, borderRadius: 8, color: T.text, fontFamily: "'Heebo',sans-serif", fontSize: 14, padding: "8px 12px", marginBottom: 10, boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={savePin} style={{ flex: 1, background: T.primary, border: "none", borderRadius: 8, color: "#fff", padding: 9, cursor: "pointer", fontFamily: "'Heebo',sans-serif", fontWeight: 700, fontSize: 14 }}>שמור</button>
            <button onClick={() => setPending(null)} style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${T.surfaceBorder}`, borderRadius: 8, color: T.muted, padding: "9px 14px", cursor: "pointer", fontFamily: "'Heebo',sans-serif", fontSize: 14 }}>ביטול</button>
          </div>
        </div>
      )}

      {/* Side list panel */}
      {showList && (
        <div style={{ position: "absolute", top: 54, right: 0, bottom: 70, width: "min(280px, 80%)", background: "rgba(11,14,23,0.96)", borderLeft: `1px solid ${T.surfaceBorder}`, overflowY: "auto", padding: 12, backdropFilter: "blur(12px)" }}>
          {tracks.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 6, fontWeight: 600 }}>מסלולי GPX</div>
              {tracks.map((trk, i) => (
                <div key={trk.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 12, height: 4, borderRadius: 2, background: trk.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: T.text }}>{trk.name}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    {TRAIL_COLORS.map(col => (
                      <div key={col} onClick={() => onTracksChange(tracks.map((t, j) => j === i ? { ...t, color: col } : t))}
                        style={{ width: 14, height: 14, borderRadius: "50%", background: col, cursor: "pointer", border: trk.color === col ? "2px solid white" : "none" }} />
                    ))}
                  </div>
                  <button onClick={() => onTracksChange(tracks.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 6, fontWeight: 600 }}>נקודות ({pins.length})</div>
          {(filterCat === "all" ? pins : pins.filter(p => p.cat === filterCat)).map(pin => {
            const cat = PIN_CATS.find(c => c.id === pin.cat) || PIN_CATS[5];
            return (
              <div key={pin.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, background: T.surface, borderRadius: 8, padding: "8px 10px" }}>
                <span style={{ fontSize: 16 }}>{cat.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pin.name}</div>
                  {pin.note && <div style={{ fontSize: 11, color: T.muted }}>{pin.note}</div>}
                </div>
                <button onClick={() => onPinsChange(pins.filter(p => p.id !== pin.id))} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 16 }}>×</button>
              </div>
            );
          })}
          {pins.length === 0 && <div style={{ fontSize: 13, color: T.muted, textAlign: "center", marginTop: 20 }}>אין נקודות עדיין</div>}
        </div>
      )}
    </div>
  );
}

// ─── PLAN SCREEN ─────────────────────────────────────────────────────────────

function PlanScreen({ countries, setCountries, cities, setCities, notes, setNotes }) {
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

const emptyExpense = () => ({ amount: "", cat: "food", desc: "", date: new Date().toISOString().split("T")[0], country: "יוון", paidBy: "person1", split: "equal", p1Share: "", receiptId: null });

function ExpenseForm({ initial, countries, persons, onSave, onCancel }) {
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

function BudgetScreen({ countries, expenses, setExpenses, persons }) {
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
            countries={countries} persons={persons} onSave={saveExpense} onCancel={() => setEditing(null)} />
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
                <div style={{ fontSize: 11, color: T.muted }}>{fmtDate(exp.date)} · {exp.country}</div>
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

const emptyOption = () => ({ name: "", price: "", link: "", maps: "", note: "" });

function OptionForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState(initial);
  const set = p => setF(x => ({ ...x, ...p }));
  const coords = parseLatLng(f.maps);
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
      <input value={f.maps} onChange={e => set({ maps: e.target.value })} placeholder="📍 קישור מגוגל מפות או קואורדינטות" style={inputStyle({ marginTop: 8 })} />
      {f.maps && <div style={{ fontSize: 11, marginTop: 4, color: coords ? T.green : T.muted }}>{coords ? `✓ מיקום זוהה (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}), אפשר להוסיף למפה` : "הקישור יישמר ויפתח את גוגל מפות. כדי להוסיף גם למפה שלנו: בגוגל מפות לוחצים לחיצה ארוכה על המקום ומעתיקים את המספרים."}</div>}
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
    setPins([...pins, { id: pinId, name: o.name, note: [o.price ? `€${o.price}` : "", o.note].filter(Boolean).join(" · "), cat: g.cat, lat: o.lat, lng: o.lng }]);
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

function GearScreen({ checked, setChecked, customGear, setCustomGear }) {
  const [expanded, setExpanded] = useState("📄 מסמכים");
  const [newItem, setNewItem] = useState("");
  const [newCat, setNewCat] = useState("📄 מסמכים");

  const allItems = Object.values(GEAR_ITEMS).flat();
  const totalDone = allItems.filter(i => checked[i.id]).length + customGear.filter(i => checked[i.id]).length;
  const totalAll = allItems.length + customGear.length;
  const pct = Math.round((totalDone / totalAll) * 100);

  const addCustom = () => {
    if (!newItem.trim()) return;
    const id = `custom_${Date.now()}`;
    setCustomGear(p => [...p, { id, text: newItem.trim(), cat: newCat }]);
    setNewItem("");
  };

  return (
    <div className="scr" style={{ padding: "16px 14px 24px", overflowY: "auto", height: "100%", boxSizing: "border-box" }}>
      {/* Progress */}
      <div style={{ ...card({ marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }) }}>
        <div style={{ position: "relative", width: 60, height: 60, flexShrink: 0 }}>
          <svg viewBox="0 0 60 60" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="30" cy="30" r="25" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
            <circle cx="30" cy="30" r="25" fill="none" stroke="#10b981" strokeWidth="6" strokeDasharray={`${pct * 1.57} 157`} strokeLinecap="round" />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#10b981" }}>{pct}%</div>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: T.text }}>מוכנות ציוד</div>
          <div style={{ fontSize: 13, color: T.muted }}>{totalDone} מתוך {totalAll} פריטים</div>
        </div>
      </div>

      {/* Gear categories */}
      {Object.entries(GEAR_ITEMS).map(([cat, items]) => {
        const catCustom = customGear.filter(i => i.cat === cat);
        const allCatItems = [...items, ...catCustom];
        const catDone = allCatItems.filter(i => checked[i.id]).length;
        const isOpen = expanded === cat;
        return (
          <div key={cat} style={{ marginBottom: 8 }}>
            <button onClick={() => setExpanded(isOpen ? null : cat)} style={{
              width: "100%", background: isOpen ? T.primaryDim : T.surface,
              border: `1px solid ${isOpen ? T.primaryBorder : T.surfaceBorder}`,
              borderRadius: isOpen ? "10px 10px 0 0" : 10, color: T.text,
              fontFamily: "'Heebo',sans-serif", padding: "12px 16px", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>{cat}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: catDone === allCatItems.length ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.08)", color: catDone === allCatItems.length ? "#10b981" : T.muted, borderRadius: 20, padding: "2px 10px", fontSize: 12 }}>{catDone}/{allCatItems.length}</span>
                <span style={{ color: T.muted, fontSize: 12 }}>{isOpen ? "▲" : "▼"}</span>
              </div>
            </button>
            {isOpen && (
              <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${T.primaryBorder}`, borderTop: "none", borderRadius: "0 0 10px 10px" }}>
                {allCatItems.map(item => (
                  <div key={item.id} onClick={() => setChecked(p => ({ ...p, [item.id]: !p[item.id] }))} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", cursor: "pointer", borderBottom: `1px solid ${T.surfaceBorder}`, opacity: checked[item.id] ? 0.4 : 1 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, border: `2px solid ${checked[item.id] ? T.primary : "rgba(255,255,255,0.2)"}`, background: checked[item.id] ? T.primary : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                      {checked[item.id] && <span style={{ color: "#fff", fontSize: 12 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 14, color: T.text, flex: 1, textDecoration: checked[item.id] ? "line-through" : "none" }}>{item.text}</span>
                    {item.id.startsWith("custom_") && (
                      <button onClick={e => { e.stopPropagation(); setCustomGear(p => p.filter(g => g.id !== item.id)); }} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 16 }}>×</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Add custom item */}
      <div style={{ ...card({ marginTop: 8 }) }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 10 }}>+ הוסף פריט</div>
        <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === "Enter" && addCustom()} placeholder="שם הפריט..." style={{ width: "100%", background: T.faint, border: `1px solid ${T.surfaceBorder}`, borderRadius: 8, color: T.text, fontFamily: "'Heebo',sans-serif", fontSize: 14, padding: "8px 12px", marginBottom: 8, boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: 8 }}>
          <select value={newCat} onChange={e => setNewCat(e.target.value)} style={{ flex: 1, background: T.faint, border: `1px solid ${T.surfaceBorder}`, borderRadius: 8, color: T.text, fontFamily: "'Heebo',sans-serif", fontSize: 13, padding: "8px 10px" }}>
            {Object.keys(GEAR_ITEMS).map(k => <option key={k} style={{ background: "#1a1a2e" }}>{k}</option>)}
          </select>
          <button onClick={addCustom} style={{ background: T.primaryDim, border: `1px solid ${T.primaryBorder}`, borderRadius: 8, color: T.primary, padding: "8px 16px", cursor: "pointer", fontFamily: "'Heebo',sans-serif", fontWeight: 700, fontSize: 14 }}>הוסף</button>
        </div>
      </div>
    </div>
  );
}

// ─── PERSONAL SCREEN ──────────────────────────────────────────────────────────

function PersonalScreen({ persons, setPersons, activeUser, setActiveUser, expenses, personalNotes, setPersonalNotes, countries }) {
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
  const [customGear, setCustomGear] = useState(saved?.customGear || []);
  const [persons, setPersons] = useState(saved?.persons || ["אני", "החבר"]);
  const [activeUser, setActiveUser] = useState(saved?.activeUser || "person1");
  const [personalNotes, setPersonalNotes] = useState(saved?.personalNotes || {});
  const [compares, setCompares] = useState(saved?.compares || []);
  const [savedPulse, setSavedPulse] = useState(false);

  const doSave = useCallback(() => {
    persist({
      countryWeeks: Object.fromEntries(countries.map(c => [c.name, c.weeks])),
      pins, tracks, cities, notes, expenses, gearChecked, customGear, persons, activeUser, personalNotes, compares,
    });
    setSavedPulse(true);
    setTimeout(() => setSavedPulse(false), 1200);
  }, [countries, pins, tracks, cities, notes, expenses, gearChecked, customGear, persons, activeUser, personalNotes, compares]);

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
        <div key={tab} className={dir === "left" ? "enter-left" : "enter-right"} style={{ height: "100%" }}>
          {tab === "map"      && <MapScreen countries={countries} pins={pins} onPinsChange={setPins} tracks={tracks} onTracksChange={setTracks} />}
          {tab === "plan"     && <PlanScreen countries={countries} setCountries={setCountries} cities={cities} setCities={setCities} notes={notes} setNotes={setNotes} />}
          {tab === "budget"   && <BudgetScreen countries={countries} expenses={expenses} setExpenses={setExpenses} persons={persons} />}
          {tab === "compare"  && <CompareScreen countries={countries} compares={compares} setCompares={setCompares} persons={persons} pins={pins} setPins={setPins} />}
          {tab === "gear"     && <GearScreen checked={gearChecked} setChecked={setGearChecked} customGear={customGear} setCustomGear={setCustomGear} />}
          {tab === "personal" && <PersonalScreen persons={persons} setPersons={setPersons} activeUser={activeUser} setActiveUser={setActiveUser} expenses={expenses} personalNotes={personalNotes} setPersonalNotes={setPersonalNotes} countries={countries} />}
        </div>
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
