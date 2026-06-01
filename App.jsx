cat > /mnt/user-data/outputs/TripPlanner.jsx << 'ENDOFFILE'
import { useState, useEffect, useCallback } from "react";

const TRIP_START = new Date("2027-04-29");
const TRIP_WEEKS = 20;

const COUNTRIES = [
  { name: "בולגריה", emoji: "🇧🇬", weeks: 1, color: "#E8A87C", highlights: ["סופיה", "פלובדיב", "וארנה"], mustSee: ["מנסטיר ריל", "ולקו טרנובו", "נסבר העתיקה"], tips: "הכי זול בטיול! שווה לאכול בשוק המרכזי בסופיה" },
  { name: "יוון", emoji: "🇬🇷", weeks: 2, color: "#5B8DB8", highlights: ["אתונה", "מטאורה", "כרתים"], mustSee: ["האקרופוליס", "מטאורה", "סמוטראקי"], tips: "מטאורה זה חובה! נסה לראות שקיעה על מנזרי ההר" },
  { name: "אלבניה", emoji: "🇦🇱", weeks: 1, color: "#E84855", highlights: ["טירנה", "גג'ירוקסטר", "ביתש"], mustSee: ["אגם קומאני", "חוף ת'ית'", "קמר"], tips: "המדינה הכי מפתיעה בטיול — אנשים מדהימים ומחירים נמוכים" },
  { name: "מונטנגרו", emoji: "🇲🇪", weeks: 1, color: "#2D6A4F", highlights: ["קוטור", "בודבה", "דורמיטור"], mustSee: ["ביה קוטורינה", "דורמיטור NP", "אגם שקודר"], tips: "קוטור מהיפה שבערי החוף — שווה לעלות לחומה" },
  { name: "קרואטיה", emoji: "🇭🇷", weeks: 2, color: "#E63946", highlights: ["דוברובניק", "ספליט", "פליטביצה"], mustSee: ["פליטביצה", "חצי האי פלג'שץ", "הוואר"], tips: "פליטביצה = חובה מוחלט. הגע מוקדם בבוקר" },
  { name: "סלובניה", emoji: "🇸🇮", weeks: 1, color: "#4CAF50", highlights: ["לובליאנה", "בלד", "טריגלב"], mustSee: ["אגם בלד", "סוקה ואלי", "פוסטויינה"], tips: "הכי קומפקטית! ניתן לראות הכל באוטו שכור" },
  { name: "אוסטריה", emoji: "🇦🇹", weeks: 2, color: "#C41E3A", highlights: ["וינה", "זלצבורג", "הלשטאט"], mustSee: ["הלשטאט", "גרוסגלוקנר", "וינה מוזיאונים"], tips: "גרוסגלוקנר = כביש ההר הכי יפה באירופה" },
  { name: "איטליה", emoji: "🇮🇹", weeks: 2, color: "#009246", highlights: ["דולומיטים", "צינקווה טרה", "רומא"], mustSee: ["דולומיטים", "צינקווה טרה", "לאגו די קומו"], tips: "התמקד בצפון! הדולומיטים > כל הערים. רומא אפשר בסוף" },
  { name: "שוויץ", emoji: "🇨🇭", weeks: 3, color: "#FF0000", highlights: ["אינטרלאקן", "גרינדלוואלד", "מאטרהורן"], mustSee: ["יונגפראו", "לאוטרברונן", "מאטרהורן"], tips: "Swiss Pass שווה כאן. הוסטלים SB הכי זולים" },
  { name: "נורווגיה", emoji: "🇳🇴", weeks: 3, color: "#003087", highlights: ["ברגן", "פיורדים", "פרקקסטולן"], mustSee: ["טרולטונגה", "פרקקסטולן", "גיירנגרפיורד"], tips: "הכי יקר! קנה אוכל בסופר. טרולטונגה = יום שלם" },
  { name: "שוודיה", emoji: "🇸🇪", weeks: 1, color: "#006AA7", highlights: ["סטוקהולם", "גוטנבורג"], mustSee: ["ארכיפלג סטוקהולם", "ABBA Museum", "ורמלנד"], tips: "סטוקהולם יקרה — בשל בסופר ובישל בהוסטל" },
  { name: "דנמרק", emoji: "🇩🇰", weeks: 1, color: "#C60C30", highlights: ["קופנהגן", "ארהוס"], mustSee: ["נוהאבן", "כריסטיאניה", "לואיזיאנה מוזיאון"], tips: "קופנהגן = עיר האופניים. שכור אופניים ליום שלם" },
];

const CHECKLIST_ITEMS = {
  "📄 מסמכים": [
    { id: "passport", text: "דרכון בתוקף (לפחות 6 חודשים אחרי חזרה)" },
    { id: "id", text: "תעודת זהות" },
    { id: "insurance", text: "ביטוח נסיעות (כולל אמבולנס ועמ')" },
    { id: "europass", text: "כרטיס Eurail / InterRail" },
    { id: "photos", text: "צילומי תעודות בענן (גוגל דרייב)" },
    { id: "embassy", text: "רישום באתר משרד החוץ הישראלי" },
  ],
  "🎒 ציוד תרמיל": [
    { id: "backpack", text: "תרמיל 50-60 ליטר איכותי" },
    { id: "daypack", text: "תרמיל יום קטן (20-25 ליטר)" },
    { id: "sleepingbag", text: "שק שינה קל לקיץ" },
    { id: "sleepsheet", text: "סדין שינה להוסטלים" },
    { id: "shoes", text: "נעלי הליכה + כפכפים" },
    { id: "clothes", text: "בגדים (כלל אצבע: 5 ימים)" },
    { id: "rain", text: "ז'קט גשם / רוח" },
    { id: "lock", text: "מנעול לכבאגז'" },
    { id: "towel", text: "מגבת מיקרופייבר" },
    { id: "adapter", text: "מתאם חשמל אירופאי" },
    { id: "powerbank", text: "פאוורבנק גדול" },
    { id: "firstaid", text: "ערכת עזרה ראשונה בסיסית" },
  ],
  "💰 כסף": [
    { id: "revolut", text: "פתיחת חשבון Revolut / Wise" },
    { id: "cash", text: "מזומן ראשוני (€200-300)" },
    { id: "budget", text: "הגדרת תקציב יומי" },
    { id: "emergency", text: "קרן חירום נפרדת" },
    { id: "notify", text: "להודיע לבנק על הטיול" },
  ],
  "✈️ לפני יציאה": [
    { id: "hostel", text: "הזמנת הוסטל ראשון לפני הנחיתה" },
    { id: "flights", text: "טיסות הלוך וחזור" },
    { id: "vaccines", text: "חיסונים נדרשים (בדוק קודם)" },
    { id: "apps", text: "אפליקציות: Maps.me, Hostelworld, Rome2rio" },
    { id: "spotify", text: "הורדת פלייליסטים ופודקאסטים לאופליין" },
    { id: "goodbye", text: "ערב פרידה עם המשפחה 😄" },
  ],
};

const DAILY_BUDGET = {
  בולגריה: 40, יוון: 70, אלבניה: 35, מונטנגרו: 55,
  קרואטיה: 65, סלובניה: 65, אוסטריה: 90, איטליה: 80,
  שוויץ: 130, נורווגיה: 130, שוודיה: 100, דנמרק: 110,
};

const ACCOMMODATION_TYPES = ["הוסטל", "בקתה", "Airbnb", "מלון", "קמפינג", "אחר"];

const STORAGE_KEY = "trip_planner_2027_v2";

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function getCountryDates(countries) {
  let cursor = new Date(TRIP_START);
  return countries.map(c => {
    const start = new Date(cursor);
    cursor.setDate(cursor.getDate() + c.weeks * 7);
    const end = new Date(cursor);
    end.setDate(end.getDate() - 1);
    return { start, end };
  });
}

function fmt(date) {
  return date.toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

function WeekBar({ used, total }) {
  const pct = (used / total) * 100;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 3, background: pct > 100 ? "#ef4444" : pct > 85 ? "#f59e0b" : "#10b981", transition: "width 0.4s ease" }} />
      </div>
      <span style={{ fontSize: 12, color: "#94a3b8", whiteSpace: "nowrap" }}>{used}/{total} שב'</span>
    </div>
  );
}

// ─── City editor inside a country ────────────────────────────────────────────
function CityList({ countryName, cities, onChange }) {
  const [newCityName, setNewCityName] = useState("");

  const addCity = () => {
    const name = newCityName.trim();
    if (!name) return;
    onChange([...cities, { id: Date.now(), name, days: 2, accommodation: "הוסטל", notes: "" }]);
    setNewCityName("");
  };

  const updateCity = (id, field, value) =>
    onChange(cities.map(c => c.id === id ? { ...c, [field]: value } : c));

  const removeCity = (id) => onChange(cities.filter(c => c.id !== id));

  const totalDays = cities.reduce((s, c) => s + c.days, 0);

  return (
    <div>
      {/* summary bar */}
      {cities.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 12, color: "#64748b" }}>
          <span>סה"כ: {totalDays} ימים מתוכננים</span>
        </div>
      )}

      {cities.map((city, idx) => (
        <div key={city.id} style={{
          background: "rgba(0,0,0,0.25)", borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.08)",
          padding: 12, marginBottom: 8,
        }}>
          {/* city header row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ color: "#64748b", fontSize: 12, minWidth: 16 }}>{idx + 1}.</span>
            <input
              value={city.name}
              onChange={e => updateCity(city.id, "name", e.target.value)}
              style={{
                flex: 1, background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.15)",
                color: "#f0ede8", fontFamily: "'Heebo', sans-serif", fontSize: 15, fontWeight: 600,
                padding: "2px 4px", outline: "none",
              }}
            />
            <button onClick={() => removeCity(city.id)} style={{
              background: "none", border: "none", color: "#475569",
              cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 4px",
            }}>×</button>
          </div>

          {/* days + accommodation */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {/* days control */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>ימים:</span>
              <div style={{ display: "flex", alignItems: "center" }}>
                <button onClick={() => updateCity(city.id, "days", Math.max(1, city.days - 1))} style={{
                  width: 26, height: 26, borderRadius: "6px 0 0 6px",
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                  color: "#f0ede8", fontSize: 16, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>−</button>
                <div style={{
                  width: 36, height: 26, background: "rgba(129,140,248,0.15)",
                  border: "1px solid rgba(129,140,248,0.3)", borderLeft: "none", borderRight: "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 14, color: "#c7d2fe",
                }}>{city.days}</div>
                <button onClick={() => updateCity(city.id, "days", city.days + 1)} style={{
                  width: 26, height: 26, borderRadius: "0 6px 6px 0",
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                  color: "#f0ede8", fontSize: 16, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>+</button>
              </div>
            </div>

            {/* accommodation */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 140 }}>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>לינה:</span>
              <select
                value={city.accommodation}
                onChange={e => updateCity(city.id, "accommodation", e.target.value)}
                style={{
                  flex: 1, background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6,
                  color: "#f0ede8", fontFamily: "'Heebo', sans-serif",
                  fontSize: 13, padding: "4px 8px", cursor: "pointer",
                }}
              >
                {ACCOMMODATION_TYPES.map(t => <option key={t} value={t} style={{ background: "#1a1a2e" }}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* notes */}
          <input
            value={city.notes}
            onChange={e => updateCity(city.id, "notes", e.target.value)}
            placeholder="הערות (אופציונלי)..."
            style={{
              width: "100%", background: "transparent",
              border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6,
              color: "#94a3b8", fontFamily: "'Heebo', sans-serif",
              fontSize: 13, padding: "6px 10px", boxSizing: "border-box",
            }}
          />
        </div>
      ))}

      {/* add city */}
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <input
          value={newCityName}
          onChange={e => setNewCityName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addCity()}
          placeholder={`+ הוסף עיר ב${countryName}...`}
          style={{
            flex: 1, background: "rgba(255,255,255,0.04)",
            border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 8,
            color: "#f0ede8", fontFamily: "'Heebo', sans-serif",
            fontSize: 14, padding: "8px 12px",
          }}
        />
        <button onClick={addCity} style={{
          background: "rgba(129,140,248,0.2)", border: "1px solid rgba(129,140,248,0.4)",
          borderRadius: 8, color: "#c7d2fe", padding: "8px 14px",
          cursor: "pointer", fontFamily: "'Heebo', sans-serif", fontWeight: 600, fontSize: 14,
        }}>+ הוסף</button>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function TripPlanner() {
  const saved = loadData();

  const [countries, setCountries] = useState(() =>
    saved?.countries
      ? COUNTRIES.map(c => ({ ...c, weeks: saved.countries[c.name] ?? c.weeks }))
      : COUNTRIES
  );
  const [activeTab, setActiveTab] = useState("route");
  const [checked, setChecked] = useState(saved?.checked || {});
  const [notes, setNotes] = useState(saved?.notes || {});
  const [wishlist, setWishlist] = useState(saved?.wishlist || {});
  const [cities, setCities] = useState(saved?.cities || {});
  const [newWish, setNewWish] = useState({});
  const [activeCountry, setActiveCountry] = useState(null);
  const [routeView, setRouteView] = useState("overview"); // "overview" | country name
  const [expandedCat, setExpandedCat] = useState("📄 מסמכים");
  const [savedPulse, setSavedPulse] = useState(false);

  const totalWeeks = countries.reduce((s, c) => s + c.weeks, 0);
  const dates = getCountryDates(countries);

  const persist = useCallback(() => {
    saveData({
      countries: Object.fromEntries(countries.map(c => [c.name, c.weeks])),
      checked, notes, wishlist, cities,
      savedAt: new Date().toISOString(),
    });
    setSavedPulse(true);
    setTimeout(() => setSavedPulse(false), 1500);
  }, [countries, checked, notes, wishlist, cities]);

  useEffect(() => {
    const t = setTimeout(persist, 800);
    return () => clearTimeout(t);
  }, [persist]);

  const totalChecked = Object.values(checked).filter(Boolean).length;
  const totalItems = Object.values(CHECKLIST_ITEMS).flat().length;
  const progress = Math.round((totalChecked / totalItems) * 100);
  const totalBudget = countries.reduce((s, c) => s + DAILY_BUDGET[c.name] * c.weeks * 7, 0);

  const setWeeks = (name, delta) =>
    setCountries(prev => prev.map(c =>
      c.name === name ? { ...c, weeks: Math.max(0.5, Math.round((c.weeks + delta) * 2) / 2) } : c
    ));

  const addWish = (country) => {
    const val = (newWish[country] || "").trim();
    if (!val) return;
    setWishlist(p => ({ ...p, [country]: [...(p[country] || []), val] }));
    setNewWish(p => ({ ...p, [country]: "" }));
  };

  const removeWish = (country, idx) =>
    setWishlist(p => ({ ...p, [country]: p[country].filter((_, i) => i !== idx) }));

  const tabs = [
    { id: "route", label: "מסלול", icon: "🗺️" },
    { id: "weeks", label: "שבועות", icon: "📅" },
    { id: "checklist", label: "צ׳קליסט", icon: "✅" },
    { id: "budget", label: "תקציב", icon: "💰" },
  ];

  const card = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 14, padding: "14px 16px", marginBottom: 10,
  };

  // find active country object
  const activeC = countries.find(c => c.name === routeView);
  const activeIdx = countries.findIndex(c => c.name === routeView);

  return (
    <div style={{ minHeight: "100vh", background: "#080810", color: "#f0ede8", fontFamily: "'Heebo', sans-serif", direction: "rtl" }}>
      <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700;900&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <div style={{
        background: "linear-gradient(160deg, #0f0f1a 0%, #111827 60%, #0a1628 100%)",
        padding: "2rem 1.5rem 1.2rem", borderBottom: "1px solid rgba(255,255,255,0.07)",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -20, left: 60, width: 160, height: 160, background: "radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 700, margin: "0 auto", position: "relative" }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#818cf8", marginBottom: 6, textTransform: "uppercase" }}>אחרי הצבא • קיץ 2027</div>
          <h1 style={{ margin: 0, fontSize: "clamp(2rem, 6vw, 3rem)", fontWeight: 900, lineHeight: 1.1 }}>
            <span style={{ color: "#c7d2fe" }}>הטיול</span> <span style={{ color: "#f0ede8" }}>הגדול 🌍</span>
          </h1>
          <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: 14 }}>12 מדינות • 20 שבועות • שני חברים</p>
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
            {[
              { label: "מדינות", value: "12", col: "#818cf8" },
              { label: "שבועות", value: totalWeeks, col: totalWeeks === TRIP_WEEKS ? "#10b981" : totalWeeks > TRIP_WEEKS ? "#ef4444" : "#f59e0b" },
              { label: "מוכנות", value: `${progress}%`, col: "#f59e0b" },
            ].map(s => (
              <div key={s.label} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.col }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{s.label}</div>
              </div>
            ))}
            <div style={{ marginRight: "auto", fontSize: 12, color: savedPulse ? "#10b981" : "#334155", transition: "color 0.4s", display: "flex", alignItems: "center", gap: 4 }}>
              <span>{savedPulse ? "✓" : "○"}</span><span>{savedPulse ? "נשמר" : "אוטו-שמירה"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", background: "#0d0d14", borderBottom: "1px solid rgba(255,255,255,0.07)", overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex: 1, minWidth: 70, padding: "13px 8px", background: "none", border: "none",
            borderBottom: activeTab === t.id ? "2px solid #818cf8" : "2px solid transparent",
            color: activeTab === t.id ? "#c7d2fe" : "#64748b",
            cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: "'Heebo', sans-serif",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3, transition: "all 0.2s",
          }}>
            <span style={{ fontSize: 17 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "1.5rem 1rem 3rem" }}>

        {/* ══ TAB: ROUTE ══ */}
        {activeTab === "route" && (
          <div>
            {/* back button when inside a country */}
            {routeView !== "overview" && activeC && (
              <button onClick={() => setRouteView("overview")} style={{
                background: "none", border: "none", color: "#818cf8", cursor: "pointer",
                fontFamily: "'Heebo', sans-serif", fontSize: 14, marginBottom: 16,
                display: "flex", alignItems: "center", gap: 6, padding: 0,
              }}>← חזרה למסלול</button>
            )}

            {/* OVERVIEW LIST */}
            {routeView === "overview" && (
              <>
                <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>לחץ על מדינה לתכנון מפורט 👇</p>
                {countries.map((c, i) => {
                  const citiesCount = (cities[c.name] || []).length;
                  const plannedDays = (cities[c.name] || []).reduce((s, x) => s + x.days, 0);
                  return (
                    <div key={c.name} style={{
                      ...card, cursor: "pointer", transition: "all 0.2s",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }} onClick={() => setRouteView(c.name)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: c.color + "25", border: `1px solid ${c.color}50`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 20, flexShrink: 0,
                        }}>{c.emoji}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 700, fontSize: 16 }}>{c.name}</span>
                            <span style={{
                              background: c.color + "25", color: c.color,
                              border: `1px solid ${c.color}40`,
                              borderRadius: 20, padding: "1px 9px", fontSize: 11, fontWeight: 600,
                            }}>{c.weeks} שב'</span>
                            <span style={{ fontSize: 11, color: "#475569" }}>{fmt(dates[i].start)} – {fmt(dates[i].end)}</span>
                          </div>
                          <div style={{ marginTop: 4, display: "flex", gap: 8, alignItems: "center" }}>
                            {citiesCount > 0
                              ? <span style={{ fontSize: 12, color: "#10b981" }}>✓ {citiesCount} ערים · {plannedDays} ימים מתוכננים</span>
                              : <span style={{ fontSize: 12, color: "#475569" }}>טרם תוכנן ← לחץ לתכנון</span>
                            }
                          </div>
                        </div>
                        <span style={{ color: "#475569", fontSize: 14 }}>›</span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* COUNTRY DETAIL */}
            {routeView !== "overview" && activeC && (
              <div>
                {/* country header */}
                <div style={{
                  background: `linear-gradient(135deg, ${activeC.color}20, ${activeC.color}08)`,
                  border: `1px solid ${activeC.color}40`,
                  borderRadius: 14, padding: 16, marginBottom: 20,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <span style={{ fontSize: 36 }}>{activeC.emoji}</span>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 22 }}>{activeC.name}</div>
                      <div style={{ fontSize: 13, color: "#94a3b8" }}>
                        {fmt(dates[activeIdx].start)} – {fmt(dates[activeIdx].end)} · {activeC.weeks} שבועות
                      </div>
                    </div>
                  </div>
                  {/* must-see + tip */}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 140, background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: 10 }}>
                      <div style={{ fontSize: 11, color: "#818cf8", marginBottom: 5, fontWeight: 600 }}>חובה לראות</div>
                      {activeC.mustSee.map((m, idx) => <div key={idx} style={{ fontSize: 12, color: "#c7d2fe", marginBottom: 2 }}>• {m}</div>)}
                    </div>
                    <div style={{ flex: 1, minWidth: 140, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: 10 }}>
                      <div style={{ fontSize: 11, color: "#f59e0b", marginBottom: 5, fontWeight: 600 }}>💡 טיפ</div>
                      <div style={{ fontSize: 12, color: "#d97706", lineHeight: 1.5 }}>{activeC.tips}</div>
                    </div>
                  </div>
                </div>

                {/* cities section */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#c7d2fe", marginBottom: 12 }}>🏙️ ערים ותכנון</div>
                  <CityList
                    countryName={activeC.name}
                    cities={cities[activeC.name] || []}
                    onChange={newCities => setCities(p => ({ ...p, [activeC.name]: newCities }))}
                  />
                </div>

                {/* personal notes */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#c7d2fe", marginBottom: 8 }}>📝 הערות אישיות</div>
                  <textarea
                    value={notes[activeC.name] || ""}
                    onChange={e => setNotes(p => ({ ...p, [activeC.name]: e.target.value }))}
                    placeholder="מה אתה רוצה לזכור? מקומות, אנשים, טיפים..."
                    style={{
                      width: "100%", background: "rgba(0,0,0,0.3)",
                      border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                      color: "#f0ede8", fontFamily: "'Heebo', sans-serif",
                      fontSize: 14, padding: 10, resize: "vertical", minHeight: 72,
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* wishlist */}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#c7d2fe", marginBottom: 8 }}>✨ רשימת חלומות</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input
                      value={newWish[activeC.name] || ""}
                      onChange={e => setNewWish(p => ({ ...p, [activeC.name]: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && addWish(activeC.name)}
                      placeholder="פעילות / מקום לא לפספס..."
                      style={{
                        flex: 1, background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                        color: "#f0ede8", fontFamily: "'Heebo', sans-serif", fontSize: 14, padding: "8px 12px",
                      }}
                    />
                    <button onClick={() => addWish(activeC.name)} style={{
                      background: "#818cf8", border: "none", borderRadius: 8,
                      color: "white", padding: "8px 14px", cursor: "pointer",
                      fontFamily: "'Heebo', sans-serif", fontWeight: 600, fontSize: 14,
                    }}>+ הוסף</button>
                  </div>
                  {(wishlist[activeC.name] || []).map((w, idx) => (
                    <div key={idx} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      marginBottom: 6, background: "rgba(255,255,255,0.04)",
                      borderRadius: 8, padding: "6px 10px",
                    }}>
                      <span style={{ color: "#818cf8" }}>✦</span>
                      <span style={{ flex: 1, fontSize: 14 }}>{w}</span>
                      <button onClick={() => removeWish(activeC.name, idx)} style={{
                        background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 18,
                      }}>×</button>
                    </div>
                  ))}
                </div>

                {/* nav between countries */}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
                  {activeIdx > 0 && (
                    <button onClick={() => setRouteView(countries[activeIdx - 1].name)} style={{
                      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8, color: "#94a3b8", padding: "8px 14px", cursor: "pointer",
                      fontFamily: "'Heebo', sans-serif", fontSize: 13,
                    }}>← {countries[activeIdx - 1].name}</button>
                  )}
                  <div style={{ flex: 1 }} />
                  {activeIdx < countries.length - 1 && (
                    <button onClick={() => setRouteView(countries[activeIdx + 1].name)} style={{
                      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8, color: "#94a3b8", padding: "8px 14px", cursor: "pointer",
                      fontFamily: "'Heebo', sans-serif", fontSize: 13,
                    }}>{countries[activeIdx + 1].name} →</button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ TAB: WEEKS ══ */}
        {activeTab === "weeks" && (
          <div>
            <div style={{
              background: totalWeeks === TRIP_WEEKS ? "rgba(16,185,129,0.1)" : totalWeeks > TRIP_WEEKS ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
              border: `1px solid ${totalWeeks === TRIP_WEEKS ? "rgba(16,185,129,0.4)" : totalWeeks > TRIP_WEEKS ? "rgba(239,68,68,0.4)" : "rgba(245,158,11,0.4)"}`,
              borderRadius: 14, padding: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 16,
            }}>
              <div style={{ fontSize: 40, fontWeight: 900, color: totalWeeks === TRIP_WEEKS ? "#10b981" : totalWeeks > TRIP_WEEKS ? "#ef4444" : "#f59e0b" }}>{totalWeeks}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {totalWeeks === TRIP_WEEKS ? "✓ מדויק! 20 שבועות" : totalWeeks > TRIP_WEEKS ? `⚠️ חריגה של ${totalWeeks - TRIP_WEEKS} שבועות` : `⚡ נשארו ${TRIP_WEEKS - totalWeeks} שבועות לחלק`}
                </div>
                <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 2 }}>{fmt(TRIP_START)} → {fmt(dates[dates.length - 1].end)}</div>
                <div style={{ marginTop: 8 }}><WeekBar used={totalWeeks} total={TRIP_WEEKS} /></div>
              </div>
            </div>

            {countries.map((c, i) => (
              <div key={c.name} style={{ ...card, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>{c.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{c.name}</span>
                    <span style={{ fontSize: 11, color: "#475569" }}>{fmt(dates[i].start)} – {fmt(dates[i].end)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#475569" }}>{c.weeks * 7} ימים · €{Math.round(DAILY_BUDGET[c.name] * c.weeks * 7)}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                  <button onClick={() => setWeeks(c.name, -0.5)} style={{ width: 32, height: 32, borderRadius: "8px 0 0 8px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#f0ede8", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                  <div style={{ width: 52, height: 32, background: "rgba(129,140,248,0.12)", border: "1px solid rgba(129,140,248,0.3)", borderLeft: "none", borderRight: "none", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, color: "#c7d2fe" }}>{c.weeks}</div>
                  <button onClick={() => setWeeks(c.name, 0.5)} style={{ width: 32, height: 32, borderRadius: "0 8px 8px 0", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#f0ede8", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                </div>
              </div>
            ))}

            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>ציר הזמן:</div>
              <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", height: 28 }}>
                {countries.map(c => (
                  <div key={c.name} title={`${c.name}: ${c.weeks} שב'`} style={{ flex: c.weeks, background: c.color + "bb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "white", fontWeight: 700, overflow: "hidden", whiteSpace: "nowrap", minWidth: 0 }}>
                    {c.weeks >= 1.5 ? c.emoji : ""}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", marginTop: 4 }}>
                {countries.map(c => (
                  <div key={c.name} style={{ flex: c.weeks, fontSize: 9, color: "#475569", textAlign: "center", overflow: "hidden", whiteSpace: "nowrap", minWidth: 0 }}>
                    {c.weeks >= 1.5 ? c.name : ""}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: CHECKLIST ══ */}
        {activeTab === "checklist" && (
          <div>
            <div style={{ background: "rgba(129,140,248,0.08)", border: "1px solid rgba(129,140,248,0.25)", borderRadius: 14, padding: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ position: "relative", width: 64, height: 64, flexShrink: 0 }}>
                <svg viewBox="0 0 64 64" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="32" cy="32" r="27" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                  <circle cx="32" cy="32" r="27" fill="none" stroke="#818cf8" strokeWidth="6" strokeDasharray={`${progress * 1.7} 170`} strokeLinecap="round" />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#c7d2fe" }}>{progress}%</div>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>התקדמות כללית</div>
                <div style={{ color: "#94a3b8", fontSize: 13 }}>{totalChecked} מתוך {totalItems} פריטים</div>
              </div>
            </div>

            {Object.entries(CHECKLIST_ITEMS).map(([cat, items]) => {
              const catDone = items.filter(i => checked[i.id]).length;
              const isOpen = expandedCat === cat;
              return (
                <div key={cat} style={{ marginBottom: 10 }}>
                  <button onClick={() => setExpandedCat(isOpen ? null : cat)} style={{
                    width: "100%", background: isOpen ? "rgba(129,140,248,0.1)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isOpen ? "rgba(129,140,248,0.4)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: isOpen ? "10px 10px 0 0" : 10,
                    color: "#f0ede8", fontFamily: "'Heebo', sans-serif", padding: "12px 16px", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{cat}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ background: catDone === items.length ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.06)", color: catDone === items.length ? "#10b981" : "#94a3b8", borderRadius: 20, padding: "2px 10px", fontSize: 12 }}>{catDone}/{items.length}</span>
                      <span style={{ color: "#64748b", fontSize: 12 }}>{isOpen ? "▲" : "▼"}</span>
                    </div>
                  </button>
                  {isOpen && (
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(129,140,248,0.2)", borderTop: "none", borderRadius: "0 0 10px 10px" }}>
                      {items.map(item => (
                        <div key={item.id} onClick={() => setChecked(p => ({ ...p, [item.id]: !p[item.id] }))} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.04)", opacity: checked[item.id] ? 0.45 : 1 }}>
                          <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, border: `2px solid ${checked[item.id] ? "#818cf8" : "rgba(255,255,255,0.2)"}`, background: checked[item.id] ? "#818cf8" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                            {checked[item.id] && <span style={{ color: "white", fontSize: 12 }}>✓</span>}
                          </div>
                          <span style={{ fontSize: 14, textDecoration: checked[item.id] ? "line-through" : "none" }}>{item.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══ TAB: BUDGET ══ */}
        {activeTab === "budget" && (
          <div>
            <div style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.04))", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 16, padding: 20, marginBottom: 20, textAlign: "center" }}>
              <div style={{ color: "#6ee7b7", fontSize: 13, marginBottom: 4 }}>תקציב כולל משוער</div>
              <div style={{ fontSize: 46, fontWeight: 900, color: "#10b981" }}>€{Math.round(totalBudget).toLocaleString()}</div>
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>≈ ₪{Math.round(totalBudget * 3.8).toLocaleString()} · לאדם אחד</div>
              <div style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>* הוסטלים + תחבורה + אוכל. לא כולל טיסות ו-Eurail Pass</div>
            </div>

            {countries.map(c => {
              const total = DAILY_BUDGET[c.name] * c.weeks * 7;
              const maxTotal = 130 * 3 * 7;
              return (
                <div key={c.name} style={{ ...card }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 20 }}>{c.emoji}</span>
                    <span style={{ flex: 1, fontWeight: 600 }}>{c.name}</span>
                    <span style={{ color: "#64748b", fontSize: 12 }}>€{DAILY_BUDGET[c.name]}/יום</span>
                    <span style={{ fontWeight: 700, color: "#10b981", fontSize: 15 }}>€{Math.round(total)}</span>
                  </div>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                    <div style={{ height: "100%", borderRadius: 2, background: "linear-gradient(90deg, #10b981, #059669)", width: `${Math.min((total / maxTotal) * 100, 100)}%`, transition: "width 0.4s" }} />
                  </div>
                  <div style={{ marginTop: 4, fontSize: 11, color: "#334155" }}>{c.weeks} שב' × {c.weeks * 7} ימים</div>
                </div>
              );
            })}

            <div style={{ marginTop: 16, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 14, padding: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 10, color: "#fbbf24", fontSize: 15 }}>💡 טיפים לחיסכון</div>
              {[
                ["Revolut / Wise", "ללא עמלות המרה — חובה"],
                ["Hostelworld", "הזמן מוקדם לחיסכון של 20-30%"],
                ["Flixbus + Eurail", "תחבורה זולה בין ערים"],
                ["סופרמרקט > מסעדות", "חסוך 50% על אוכל"],
                ["Walking Tours", "תשלום ברצון — הכי כיף"],
                ["שומר שבת", "תכנן הוסטל/בקתה מבעוד מועד לסופ\"ש"],
              ].map(([title, desc], i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 13 }}>
                  <span style={{ color: "#f59e0b" }}>→</span>
                  <div><span style={{ color: "#fbbf24", fontWeight: 600 }}>{title}</span><span style={{ color: "#92400e" }}> — {desc}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
ENDOFFILE
echo "done"
