// ============================================================
// クライアントサイドAPI呼び出し（ブラウザから直接実行）
// Netlifyサーバー経由だと403になるため、ブラウザから直接叩く
// ============================================================

import type { SpotInfo, SpotCategory } from "./overpass";
import type { RouteResult } from "./osrm";

// ── Overpass（スポット取得）────────────────────────────────
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

function buildOverpassQuery(lat: number, lng: number, radiusMeters: number): string {
  return `[out:json][timeout:25];
(
  node["leisure"="park"](around:${radiusMeters},${lat},${lng});
  node["leisure"="garden"](around:${radiusMeters},${lat},${lng});
  node["leisure"="nature_reserve"](around:${radiusMeters},${lat},${lng});
  node["amenity"="place_of_worship"]["religion"="shinto"](around:${radiusMeters},${lat},${lng});
  node["amenity"="place_of_worship"]["religion"="buddhist"](around:${radiusMeters},${lat},${lng});
  node["historic"="castle"](around:${radiusMeters},${lat},${lng});
  node["historic"="monument"](around:${radiusMeters},${lat},${lng});
  node["historic"="memorial"](around:${radiusMeters},${lat},${lng});
  node["tourism"="viewpoint"](around:${radiusMeters},${lat},${lng});
  node["tourism"="attraction"](around:${radiusMeters},${lat},${lng});
  node["natural"="water"]["name"](around:${radiusMeters},${lat},${lng});
  node["waterway"="river"]["name"](around:${radiusMeters},${lat},${lng});
  way["leisure"="park"]["name"](around:${radiusMeters},${lat},${lng});
  way["natural"="water"]["name"](around:${radiusMeters},${lat},${lng});
);
out center 60;`;
}

function classifyCategory(tags: Record<string, string>): SpotCategory {
  if (tags.leisure === "park" || tags.leisure === "garden" || tags.leisure === "nature_reserve")
    return tags.natural ? "nature" : "park";
  if (tags.amenity === "place_of_worship") {
    if (tags.religion === "shinto") return "shrine";
    if (tags.religion === "buddhist") return "temple";
  }
  if (tags.historic) return "historical";
  if (tags.tourism === "viewpoint") return "viewpoint";
  if (tags.natural === "water" || tags.waterway === "river") return "river";
  if (tags.tourism === "attraction") return "attraction";
  return "nature";
}

export async function fetchNearbySpotsClient(lat: number, lng: number, radiusMeters: number): Promise<SpotInfo[]> {
  const query = buildOverpassQuery(lat, lng, radiusMeters);

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(28000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const spots: SpotInfo[] = data.elements
        .filter((el: { tags?: Record<string, string> }) => {
          const name = el.tags?.["name:ja"] || el.tags?.name;
          return name && name.length > 0;
        })
        .map((el: {
          type: string; id: number;
          lat?: number; lon?: number;
          center?: { lat: number; lon: number };
          tags?: Record<string, string>;
        }): SpotInfo => {
          const elLat = el.lat ?? el.center?.lat ?? 0;
          const elLng = el.lon ?? el.center?.lon ?? 0;
          const tags = el.tags ?? {};
          return {
            id: `${el.type}/${el.id}`,
            name: tags["name:ja"] || tags.name || "",
            lat: elLat, lng: elLng,
            category: classifyCategory(tags),
            osmTags: tags,
          };
        })
        .filter((s: SpotInfo) => s.lat !== 0 && s.lng !== 0 && s.name.length > 0);
      return spots;
    } catch {
      continue;
    }
  }
  throw new Error("スポットの取得に失敗しました。インターネット接続を確認してください。");
}

// ── OSRM（ルート計算）─────────────────────────────────────
const OSRM_ENDPOINTS = [
  "https://router.project-osrm.org",
  "https://routing.openstreetmap.de",
];

export async function calculateRouteClient(points: { lat: number; lng: number }[]): Promise<RouteResult | null> {
  if (points.length < 2) return null;
  const coords = points.map(p => `${p.lng},${p.lat}`).join(";");

  for (const base of OSRM_ENDPOINTS) {
    try {
      const url = `${base}/route/v1/foot/${coords}?overview=full&geometries=geojson&steps=false`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.code !== "Ok" || !data.routes?.length) continue;
      const route = data.routes[0];
      return {
        distanceMeters: route.distance,
        durationSeconds: route.duration,
        geometry: route.geometry as GeoJSON.LineString,
      };
    } catch { continue; }
  }

  // フォールバック: 直線ルート
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const R = 6371000;
    const dLat = (points[i+1].lat - points[i].lat) * Math.PI / 180;
    const dLng = (points[i+1].lng - points[i].lng) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(points[i].lat*Math.PI/180)*Math.cos(points[i+1].lat*Math.PI/180)*Math.sin(dLng/2)**2;
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }
  return {
    distanceMeters: total,
    durationSeconds: (total / 1000 / 3.87) * 3600,
    geometry: { type: "LineString", coordinates: points.map(p => [p.lng, p.lat]) },
  };
}

// ── Nominatim（逆ジオコーディング）───────────────────────
export async function reverseGeocodeClient(lat: number, lng: number): Promise<string> {
  try {
    const params = new URLSearchParams({
      lat: String(lat), lon: String(lng),
      format: "json", zoom: "14", "accept-language": "ja",
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      headers: { "User-Agent": "WalkingCourseApp/1.0", "Accept-Language": "ja" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return "現在地周辺";
    const data = await res.json();
    const addr = data.address;
    return addr?.suburb ?? addr?.neighbourhood ?? addr?.city_district ??
           addr?.city ?? addr?.town ?? addr?.village ?? "現在地周辺";
  } catch { return "現在地周辺"; }
}
