// OSRM Public API でウォーキングルートを計算

const OSRM_ENDPOINT = "https://router.project-osrm.org";

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number; // OSRMのfoot速度(~5km/h)ベース
  geometry: GeoJSON.LineString;
}

export async function calculateRoute(
  points: { lat: number; lng: number }[]
): Promise<RouteResult | null> {
  if (points.length < 2) return null;

  const coords = points.map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `${OSRM_ENDPOINT}/route/v1/foot/${coords}?overview=full&geometries=geojson&steps=false`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      cache: "no-store", // キャッシュ無効: 毎回最新ルートを取得
    });
    if (!response.ok) return fallback(points);

    const data = await response.json();
    if (data.code !== "Ok" || !data.routes?.length) return fallback(points);

    const route = data.routes[0];
    console.log(`[OSRM RAW] distance=${route.distance}m duration=${route.duration}sec (=${route.duration/60}min)`);
    return {
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      geometry: route.geometry as GeoJSON.LineString,
    };
  } catch {
    return fallback(points);
  }
}

function fallback(points: { lat: number; lng: number }[]): RouteResult {
  let totalDist = 0;
  for (let i = 0; i < points.length - 1; i++) {
    totalDist += haversineMeters(points[i], points[i + 1]);
  }
  return {
    distanceMeters: totalDist,
    durationSeconds: (totalDist / 1000 / 5) * 3600, // 5km/h (OSRM foot相当)
    geometry: { type: "LineString", coordinates: points.map((p) => [p.lng, p.lat]) },
  };
}

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function toRad(deg: number) { return (deg * Math.PI) / 180; }
