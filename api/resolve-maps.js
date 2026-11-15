// Vercel serverless function: turns a Google Maps share link (maps.app.goo.gl/…)
// into coordinates + place name. Browsers can't follow these redirects themselves (CORS).
// Only Google Maps hosts are allowed, so this can't be used as an open proxy.

const ALLOWED = /^(maps\.app\.goo\.gl|goo\.gl|(www\.|maps\.)?google\.[a-z.]+)$/i;

function parseCoords(s) {
  const t = decodeURIComponent(s);
  const pats = [
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /@(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
    /[?&](?:q|query|ll|destination|daddr|center)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
    /center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/,
    /markers=(-?\d+\.\d+)%2C(-?\d+\.\d+)/,
  ];
  for (const re of pats) {
    const m = t.match(re) || s.match(re);
    if (m) {
      const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0)) return { lat, lng };
    }
  }
  return null;
}

function parseName(u) {
  try {
    const url = new URL(u);
    const place = url.pathname.match(/\/maps\/place\/([^/]+)/);
    if (place) return decodeURIComponent(place[1].replace(/\+/g, " "));
    const q = url.searchParams.get("q") || url.searchParams.get("query");
    if (q && !/^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(q)) return q;
  } catch {}
  return null;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "s-maxage=86400");
  let current = String((req.query && req.query.url) || "");
  try {
    for (let hop = 0; hop < 6; hop++) {
      const u = new URL(current);
      if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("bad protocol");
      if (!ALLOWED.test(u.hostname)) break; // left Google (e.g. consent page) – stop here
      const coords = parseCoords(current);
      if (coords) return res.status(200).json({ ...coords, name: parseName(current), url: current });
      const r = await fetch(current, { redirect: "manual", headers: { "User-Agent": "Mozilla/5.0 (trip-planner link resolver)", "Accept-Language": "en" } });
      const loc = r.headers.get("location");
      if (loc && r.status >= 300 && r.status < 400) { current = new URL(loc, current).toString(); continue; }
      // Final page: coordinates are often inside the HTML
      const html = (await r.text()).slice(0, 400000);
      const fromHtml = parseCoords(html);
      return res.status(200).json({ ...(fromHtml || {}), name: parseName(current), url: current });
    }
    return res.status(200).json({ name: parseName(current), url: current });
  } catch (e) {
    return res.status(400).json({ error: "could not resolve" });
  }
};

module.exports.parseCoords = parseCoords;
module.exports.parseName = parseName;
