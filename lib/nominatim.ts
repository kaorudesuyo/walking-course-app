const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org";
const USER_AGENT =
  process.env.NEXT_PUBLIC_NOMINATIM_USER_AGENT ??
  "WalkingCourseApp/1.0 (https://your-app.vercel.app)";

export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
}

/**
 * 地名・住所 → 座標
 */
export async function geocodeAddress(
  query: string
): Promise<GeocodingResult | null> {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "1",
    "accept-language": "ja",
  });

  const response = await fetch(
    `${NOMINATIM_ENDPOINT}/search?${params.toString()}`,
    {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "ja",
      },
      next: { revalidate: 86400 }, // 24時間キャッシュ
    }
  );

  if (!response.ok) return null;

  const results = await response.json();
  if (!results || results.length === 0) return null;

  const r = results[0];
  return {
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    displayName: r.display_name,
  };
}

/**
 * 座標 → 地名（逆ジオコーディング）
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: "json",
    zoom: "14",
    "accept-language": "ja",
  });

  try {
    const response = await fetch(
      `${NOMINATIM_ENDPOINT}/reverse?${params.toString()}`,
      {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept-Language": "ja",
        },
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) return "現在地周辺";

    const data = await response.json();
    const addr = data.address;
    // 市区町村レベルの地名を優先
    return (
      addr?.suburb ??
      addr?.neighbourhood ??
      addr?.city_district ??
      addr?.city ??
      addr?.town ??
      addr?.village ??
      "現在地周辺"
    );
  } catch {
    return "現在地周辺";
  }
}
