const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org";
const USER_AGENT = "WalkingCourseApp/1.0 (https://walk.kaoru-furubayashi.com)";

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const params = new URLSearchParams({
      lat: String(lat), lon: String(lng),
      format: "json", zoom: "14", "accept-language": "ja",
    });
    const res = await fetch(`${NOMINATIM_ENDPOINT}/reverse?${params}`, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "ja" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return "現在地周辺";
    const data = await res.json();
    const addr = data.address;
    return addr?.suburb ?? addr?.neighbourhood ?? addr?.city_district ??
           addr?.city ?? addr?.town ?? addr?.village ?? "現在地周辺";
  } catch {
    return "現在地周辺";
  }
}
