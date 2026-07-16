// ============================================================
// クライアントサイドAPI呼び出し（ブラウザから直接実行）
// Netlifyサーバー経由だと403になるため、ブラウザから直接叩く
//
// セキュリティ: クエリに埋め込む座標・半径は必ず数値検証を通す。
// 文字列がすり抜けた場合でも Overpass QL / URL への注入を防ぐ。
// ============================================================

import type { SpotInfo, SpotCategory } from "./overpass";
import type { RouteResult } from "./osrm";

// ── 入力検証ヘルパー ──────────────────────────────────────
function assertLatLng(lat: unknown, lng: unknown): { lat: number; lng: number } {
  const nLat = Number(lat);
  const nLng = Number(lng);
  if (!Number.isFinite(nLat) || !Number.isFinite(nLng) ||
      Math.abs(nLat) > 90 || Math.abs(nLng) > 180) {
    throw new Error("不正な座標です");
  }
  return { lat: nLat, lng: nLng };
}

function clampRadius(radiusMeters: unknown): number {
  const n = Number(radiusMeters);
  if (!Number.isFinite(n)) throw new Error("不正な検索半径です");
  // 50m〜5km に制限（過大なクエリでAPIに負荷をかけない）
  return Math.min(Math.max(Math.round(n), 50), 5000);
}

// ── Overpass（スポット取得）────────────────────────────────
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

function buildOverpassQuery(lat: number, lng: number, radiusMeters: number): string {
  // toFixed / Math.round 済みの数値のみを埋め込む（QL注入対策）
  const la = lat.toFixed(6);
  const ln = lng.toFixed(6);
  const r  = String(radiusMeters);
  return `[out:json][timeout:25];
(
  node["leisure"="park"](around:${r},${la},${ln});
  node["leisure"="garden"](around:${r},${la},${ln});
  node["leisure"="nature_reserve"](around:${r},${la},${ln});
  node["amenity"="place_of_worship"]["religion"="shinto"](around:${r},${la},${ln});
  node["amenity"="place_of_worship"]["religion"="buddhist"](around:${r},${la},${ln});
  node["historic"="castle"](around:${r},${la},${ln});
  node["historic"="monument"](around:${r},${la},${ln});
  node["historic"="memorial"](around:${r},${la},${ln});
  node["tourism"="viewpoint"](around:${r},${la},${ln});
  node["tourism"="attraction"](around:${r},${la},${ln});
  node["natural"="water"]["name"](around:${r},${la},${ln});
  node["waterway"="river"]["name"](around:${r},${la},${ln});
  way["leisure"="park"]["name"](around:${r},${la},${ln});
  way["natural"="water"]["name"](around:${r},${la},${ln});
);
out center 90;`;
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

export async function fetchNearbySpotsClient(latIn: number, lngIn: number, radiusIn: number): Promise<SpotInfo[]> {
  const { lat, lng } = assertLatLng(latIn, lngIn);
  const radiusMeters = clampRadius(radiusIn);
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
            // スポット名は最大100文字に制限（表示崩れ・DoS対策）
            name: (tags["name:ja"] || tags.name || "").slice(0, 100),
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
  if (points.length < 2 || points.length > 15) return null;
  // 全座標を検証してから toFixed(6) でURL構築（注入対策）
  const validated = points.map(p => assertLatLng(p.lat, p.lng));
  const coords = validated.map(p => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(";");

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
  for (let i = 0; i < validated.length - 1; i++) {
    const R = 6371000;
    const dLat = (validated[i+1].lat - validated[i].lat) * Math.PI / 180;
    const dLng = (validated[i+1].lng - validated[i].lng) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(validated[i].lat*Math.PI/180)*Math.cos(validated[i+1].lat*Math.PI/180)*Math.sin(dLng/2)**2;
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }
  return {
    distanceMeters: total,
    durationSeconds: (total / 1000 / 3.87) * 3600,
    geometry: { type: "LineString", coordinates: validated.map(p => [p.lng, p.lat]) },
  };
}

// ── Nominatim（逆ジオコーディング）───────────────────────
export async function reverseGeocodeClient(latIn: number, lngIn: number): Promise<string> {
  try {
    const { lat, lng } = assertLatLng(latIn, lngIn);
    const params = new URLSearchParams({
      lat: lat.toFixed(6), lon: lng.toFixed(6),
      format: "json", zoom: "14", "accept-language": "ja",
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      headers: { "Accept-Language": "ja" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return "現在地周辺";
    const data = await res.json();
    const addr = data.address;
    const name = addr?.suburb ?? addr?.neighbourhood ?? addr?.city_district ??
                 addr?.city ?? addr?.town ?? addr?.village ?? "現在地周辺";
    // 地名も長さ制限（表示崩れ対策）
    return String(name).slice(0, 50);
  } catch { return "現在地周辺"; }
}
