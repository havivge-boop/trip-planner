import { useState, useEffect, useCallback, useRef } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const TRIP_START = new Date("2027-04-29");
const TRIP_WEEKS = 20;

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
  bg: "#0b0e17",
  surface: "rgba(255,255,255,0.04)",
  surfaceBorder: "rgba(255,255,255,0.08)",
  surfaceHover: "rgba(255,255,255,0.07)",
  primary: "#3b82f6",
  primaryDim: "rgba(59,130,246,0.15)",
  primaryBorder: "rgba(59,130,246,0.35)",
  accent: "#f97316",
  text: "#e2e8f0",
  muted: "#64748b",
  faint: "#1e2433",
  navBg: "#0f1420",
};

const card = (extra = {}) => ({
  background: T.surface, border: `1px solid ${T.surfaceBorder}`,
  borderRadius: 14, padding: "14px 16px", marginBottom: 10, ...extra,
});

// ─── MAP SCREEN ───────────────────────────────────────────────────────────────

function MapScreen({ countries, pins, onPinsChange, tracks, onTracksChange }) {
  const mapRef = useRef(null);
  const mapInst = useRef(null);
  const customMarkers = useRef([]);
  const trackLines = useRef([]);
  const [ready, setReady] = useState(!!window.L);
  const [clickMode, setClickMode] = useState(false);
  const [pending, setPending] = useState(null);
  const [form, setForm] = useState({ name: "", note: "", cat: "attraction" });
  const [filterCat, setFilterCat] = useState("all");
  const [showList, setShowList] = useState(false);
  const [gpxLoading, setGpxLoading] = useState(false);
  const gpxInputRef = useRef(null);

  // Load Leaflet dynamically
  useEffect(() => {
    if (window.L) { setReady(true); return; }
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);
    const js = document.createElement("script");
    js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    js.onload = () => setReady(true);
    document.head.appendChild(js);
  }, []);

  // Init map
  useEffect(() => {
    if (!ready || mapInst.current || !mapRef.current) return;
    const L = window.L;
    const map = L.map(mapRef.current).setView([50, 13], 4);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap", maxZoom: 19,
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
    if (!mapInst.current || !window.L) return;
    const L = window.L;
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
    if (!mapInst.current || !window.L) return;
    const L = window.L;
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
          mapInst.current.fitBounds(window.L.polyline(track.points).getBounds(), { padding: [20, 20] });
        }
      }
      setGpxLoading(false);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const TRAIL_COLORS = ["#f97316", "#10b981", "#3b82f6", "#8b5cf6", "#f43f5e", "#06b6d4"];

  return (
    <div style={{ position: "relative", height: "calc(100vh - 108px)", display: "flex", flexDirection: "column" }}>
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
      <div ref={mapRef} style={{ flex: 1, background: T.faint }}>
        {!ready && (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: T.muted, flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 32 }}>🗺️</div>
            <div style={{ fontSize: 14 }}>טוען מפה...</div>
          </div>
        )}
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

  if (view !== "overview" && activeC) {
    const plannedDays = (cities[activeC.name] || []).reduce((s, c) => s + c.days, 0);
    const [newCity, setNewCity] = useState("");
    return (
      <div style={{ padding: "16px 14px", overflowY: "auto", height: "calc(100vh - 108px)", boxSizing: "border-box" }}>
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
  const weeksColor = totalWeeks === TRIP_WEEKS ? "#10b981" : totalWeeks > TRIP_WEEKS ? "#ef4444" : "#f59e0b";
  return (
    <div style={{ padding: "16px 14px", overflowY: "auto", height: "calc(100vh - 108px)", boxSizing: "border-box" }}>
      {/* Weeks summary */}
      <div style={{ ...card({ marginBottom: 16 }), background: `${weeksColor}12`, border: `1px solid ${weeksColor}35`, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ fontSize: 38, fontWeight: 900, color: weeksColor, lineHeight: 1 }}>{totalWeeks}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>
            {totalWeeks === TRIP_WEEKS ? "✓ בדיוק 20 שבועות" : totalWeeks > TRIP_WEEKS ? `⚠️ ${totalWeeks - TRIP_WEEKS} שבועות יותר` : `${TRIP_WEEKS - totalWeeks} שבועות פנויים`}
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

function BudgetScreen({ countries, expenses, setExpenses, persons }) {
  const [showForm, setShowForm] = useState(false);
  const [filterPerson, setFilterPerson] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [form, setForm] = useState({ amount: "", cat: "food", desc: "", date: new Date().toISOString().split("T")[0], person: "shared", country: "יוון" });

  const totalBudget = countries.reduce((s, c) => s + DAILY_BUDGET[c.name] * c.weeks * 7, 0);
  const filteredExp = expenses.filter(e =>
    (filterPerson === "all" || e.person === filterPerson) &&
    (filterCat === "all" || e.cat === filterCat)
  );
  const totalSpent = filteredExp.reduce((s, e) => s + e.amount, 0);
  const allSpent = expenses.reduce((s, e) => s + e.amount, 0);

  const saveExpense = () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) return;
    setExpenses(p => [...p, { id: Date.now(), ...form, amount }]);
    setForm(f => ({ ...f, amount: "", desc: "" }));
    setShowForm(false);
  };

  const spentPct = Math.min((allSpent / totalBudget) * 100, 100);

  const catTotals = EXPENSE_CATS.map(cat => ({
    ...cat, total: expenses.filter(e => e.cat === cat.id).reduce((s, e) => s + e.amount, 0)
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  return (
    <div style={{ padding: "16px 14px", overflowY: "auto", height: "calc(100vh - 108px)", boxSizing: "border-box" }}>
      {/* Summary card */}
      <div style={{ ...card({ marginBottom: 16, background: "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.04))", border: "1px solid rgba(16,185,129,0.25)" }) }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 2 }}>תקציב משוער</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#10b981" }}>€{Math.round(totalBudget).toLocaleString()}</div>
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 2 }}>שולם עד כה</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: allSpent > totalBudget ? "#ef4444" : T.text }}>€{Math.round(allSpent).toLocaleString()}</div>
          </div>
        </div>
        <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${spentPct}%`, background: allSpent > totalBudget ? "#ef4444" : "#10b981", borderRadius: 3, transition: "width 0.4s" }} />
        </div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 6 }}>{Math.round(spentPct)}% מהתקציב • ₪{Math.round(allSpent * 3.8).toLocaleString()}</div>
      </div>

      {/* Category breakdown */}
      {catTotals.length > 0 && (
        <div style={{ ...card({ marginBottom: 16 }) }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 10 }}>לפי קטגוריה</div>
          {catTotals.map(cat => (
            <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 16, width: 22 }}>{cat.icon}</span>
              <span style={{ fontSize: 13, color: T.text, flex: 1 }}>{cat.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>€{Math.round(cat.total)}</span>
              <div style={{ width: 60, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${(cat.total / allSpent) * 100}%`, background: cat.color, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto" }}>
        {[{ id: "all", label: "הכל", icon: "👥" }, { id: "person1", label: persons[0], icon: "👤" }, { id: "person2", label: persons[1], icon: "👤" }, { id: "shared", label: "משותף", icon: "🤝" }].map(p => (
          <button key={p.id} onClick={() => setFilterPerson(p.id)} style={{
            background: filterPerson === p.id ? T.primary : "rgba(255,255,255,0.06)",
            border: "none", borderRadius: 20, color: "#fff", padding: "5px 12px",
            cursor: "pointer", fontSize: 12, whiteSpace: "nowrap", fontFamily: "'Heebo',sans-serif", flexShrink: 0,
          }}>{p.icon} {p.label}</button>
        ))}
      </div>

      {/* Add expense button */}
      <button onClick={() => setShowForm(v => !v)} style={{
        width: "100%", background: showForm ? "rgba(255,255,255,0.06)" : T.primaryDim,
        border: `1px solid ${T.primaryBorder}`, borderRadius: 10,
        color: showForm ? T.muted : T.primary, padding: "11px", cursor: "pointer",
        fontFamily: "'Heebo',sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 12,
      }}>{showForm ? "✕ סגור" : "+ הוסף הוצאה"}</button>

      {/* Add expense form */}
      {showForm && (
        <div style={{ ...card({ marginBottom: 16, background: T.faint, border: `1px solid ${T.primaryBorder}` }) }}>
          {/* Category */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {EXPENSE_CATS.map(cat => (
              <button key={cat.id} onClick={() => setForm(f => ({ ...f, cat: cat.id }))} style={{
                background: form.cat === cat.id ? cat.color : "rgba(255,255,255,0.06)",
                border: "none", borderRadius: 16, color: "#fff", padding: "4px 10px",
                cursor: "pointer", fontSize: 12, fontFamily: "'Heebo',sans-serif",
              }}>{cat.icon} {cat.label}</button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="סכום (€)" style={{ background: T.surface, border: `1px solid ${T.surfaceBorder}`, borderRadius: 8, color: T.text, fontFamily: "'Heebo',sans-serif", fontSize: 14, padding: "8px 12px" }} />
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ background: T.surface, border: `1px solid ${T.surfaceBorder}`, borderRadius: 8, color: T.text, fontFamily: "'Heebo',sans-serif", fontSize: 14, padding: "8px 12px" }} />
          </div>
          <input value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} placeholder="תיאור (אופציונלי)" style={{ width: "100%", background: T.surface, border: `1px solid ${T.surfaceBorder}`, borderRadius: 8, color: T.text, fontFamily: "'Heebo',sans-serif", fontSize: 14, padding: "8px 12px", marginBottom: 8, boxSizing: "border-box" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <select value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} style={{ background: T.surface, border: `1px solid ${T.surfaceBorder}`, borderRadius: 8, color: T.text, fontFamily: "'Heebo',sans-serif", fontSize: 13, padding: "8px 10px" }}>
              {countries.map(c => <option key={c.name} style={{ background: "#1a1a2e" }}>{c.name}</option>)}
            </select>
            <select value={form.person} onChange={e => setForm(f => ({ ...f, person: e.target.value }))} style={{ background: T.surface, border: `1px solid ${T.surfaceBorder}`, borderRadius: 8, color: T.text, fontFamily: "'Heebo',sans-serif", fontSize: 13, padding: "8px 10px" }}>
              <option value="shared" style={{ background: "#1a1a2e" }}>🤝 משותף</option>
              <option value="person1" style={{ background: "#1a1a2e" }}>👤 {persons[0]}</option>
              <option value="person2" style={{ background: "#1a1a2e" }}>👤 {persons[1]}</option>
            </select>
          </div>
          <button onClick={saveExpense} style={{ width: "100%", background: T.primary, border: "none", borderRadius: 8, color: "#fff", padding: 10, cursor: "pointer", fontFamily: "'Heebo',sans-serif", fontWeight: 700, fontSize: 14 }}>שמור הוצאה</button>
        </div>
      )}

      {/* Expenses list */}
      {filteredExp.length === 0 && (
        <div style={{ textAlign: "center", padding: "2rem", color: T.muted }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>💰</div>
          <div>אין הוצאות עדיין</div>
        </div>
      )}
      {[...filteredExp].reverse().map(exp => {
        const cat = EXPENSE_CATS.find(c => c.id === exp.cat) || EXPENSE_CATS[6];
        const personLabel = exp.person === "shared" ? "🤝" : exp.person === "person1" ? "👤" + persons[0] : "👤" + persons[1];
        return (
          <div key={exp.id} style={{ ...card({ marginBottom: 8 }) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: cat.color + "20", border: `1px solid ${cat.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{cat.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: T.text }}>{exp.desc || cat.label}</div>
                <div style={{ fontSize: 11, color: T.muted }}>{fmtDate(exp.date)} · {exp.country} · {personLabel}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, color: T.text }}>€{exp.amount}</div>
              <button onClick={() => setExpenses(p => p.filter(e => e.id !== exp.id))} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 18, flexShrink: 0 }}>×</button>
            </div>
          </div>
        );
      })}
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
    <div style={{ padding: "16px 14px", overflowY: "auto", height: "calc(100vh - 108px)", boxSizing: "border-box" }}>
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

  const myExpenses = expenses.filter(e => e.person === activeUser);
  const myTotal = myExpenses.reduce((s, e) => s + e.amount, 0);
  const sharedTotal = expenses.filter(e => e.person === "shared").reduce((s, e) => s + e.amount, 0);

  const personIdx = activeUser === "person1" ? 0 : 1;

  return (
    <div style={{ padding: "16px 14px", overflowY: "auto", height: "calc(100vh - 108px)", boxSizing: "border-box" }}>
      {/* Person switcher */}
      <div style={{ ...card({ marginBottom: 16, padding: "10px 10px" }) }}>
        <div style={{ display: "flex", gap: 8 }}>
          {["person1", "person2"].map((p, i) => (
            <button key={p} onClick={() => setActiveUser(p)} style={{
              flex: 1, background: activeUser === p ? T.primary : "rgba(255,255,255,0.06)",
              border: "none", borderRadius: 10, color: "#fff", padding: "10px",
              cursor: "pointer", fontFamily: "'Heebo',sans-serif", fontSize: 15, fontWeight: 700,
            }}>👤 {persons[i]}</button>
          ))}
        </div>
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
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        {[
          { label: "ההוצאות שלי", value: `€${Math.round(myTotal)}`, color: T.primary },
          { label: "הוצאות משותפות", value: `€${Math.round(sharedTotal / 2)}`, color: "#f59e0b" },
          { label: "פריטי ציוד שלי", value: myExpenses.filter(e => e.cat === "gear").length, color: "#10b981" },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, ...card({ padding: "12px", textAlign: "center", marginBottom: 0 }) }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{s.label}</div>
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
  const [savedPulse, setSavedPulse] = useState(false);

  const doSave = useCallback(() => {
    persist({
      countryWeeks: Object.fromEntries(countries.map(c => [c.name, c.weeks])),
      pins, tracks, cities, notes, expenses, gearChecked, customGear, persons, activeUser, personalNotes,
    });
    setSavedPulse(true);
    setTimeout(() => setSavedPulse(false), 1200);
  }, [countries, pins, tracks, cities, notes, expenses, gearChecked, customGear, persons, activeUser, personalNotes]);

  useEffect(() => { const t = setTimeout(doSave, 800); return () => clearTimeout(t); }, [doSave]);

  const totalBudget = countries.reduce((s, c) => s + DAILY_BUDGET[c.name] * c.weeks * 7, 0);
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);

  const TABS = [
    { id: "map",      label: "מפה",    icon: "🗺️" },
    { id: "plan",     label: "מסלול",  icon: "📅" },
    { id: "budget",   label: "תקציב",  icon: "💰" },
    { id: "gear",     label: "ציוד",   icon: "🎒" },
    { id: "personal", label: "אישי",   icon: "👤" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Heebo', sans-serif", direction: "rtl", display: "flex", flexDirection: "column" }}>
      <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700;900&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <div style={{ background: T.navBg, borderBottom: `1px solid ${T.surfaceBorder}`, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: 18, color: T.text, lineHeight: 1 }}>הטיול הגדול 🌍</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>12 מדינות · 20 שבועות · 2 חברים</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: totalSpent > totalBudget ? "#ef4444" : "#10b981" }}>€{Math.round(totalSpent).toLocaleString()}</div>
            <div style={{ fontSize: 10, color: T.muted }}>מתוך €{Math.round(totalBudget).toLocaleString()}</div>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: T.primaryDim, border: `1px solid ${T.primaryBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 10, color: savedPulse ? "#10b981" : T.muted }}>{savedPulse ? "✓" : "●"}</span>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {tab === "map"      && <MapScreen countries={countries} pins={pins} onPinsChange={setPins} tracks={tracks} onTracksChange={setTracks} />}
        {tab === "plan"     && <PlanScreen countries={countries} setCountries={setCountries} cities={cities} setCities={setCities} notes={notes} setNotes={setNotes} />}
        {tab === "budget"   && <BudgetScreen countries={countries} expenses={expenses} setExpenses={setExpenses} persons={persons} />}
        {tab === "gear"     && <GearScreen checked={gearChecked} setChecked={setGearChecked} customGear={customGear} setCustomGear={setCustomGear} />}
        {tab === "personal" && <PersonalScreen persons={persons} setPersons={setPersons} activeUser={activeUser} setActiveUser={setActiveUser} expenses={expenses} personalNotes={personalNotes} setPersonalNotes={setPersonalNotes} countries={countries} />}
      </div>

      {/* BOTTOM NAV */}
      <div style={{ background: T.navBg, borderTop: `1px solid ${T.surfaceBorder}`, display: "flex", flexShrink: 0, paddingBottom: "env(safe-area-inset-bottom, 0)" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "10px 4px 8px", background: "none", border: "none",
            borderTop: tab === t.id ? `2px solid ${T.primary}` : "2px solid transparent",
            color: tab === t.id ? T.primary : T.muted,
            cursor: "pointer", fontSize: 11, fontFamily: "'Heebo',sans-serif",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            transition: "all 0.15s",
          }}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
