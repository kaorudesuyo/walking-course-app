// 座標・距離・歩数・カロリー計算

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function toRad(deg: number) { return (deg * Math.PI) / 180; }

// Googleマップ実測速度 3.87km/h
export function durationToDistance(durationMin: number): number {
  return parseFloat(((durationMin / 60) * 3.87).toFixed(2));
}
export function distanceToDuration(distanceKm: number): number {
  return Math.round((distanceKm / 3.87) * 60);
}
export function distanceToGoogleMapsMinutes(distanceKm: number): number {
  return Math.round((distanceKm / 3.87) * 60);
}

// 歩数・カロリー
export function stepsToDistance(steps: number): number {
  return parseFloat((steps * 0.75 / 1000).toFixed(2));
}
export function distanceToSteps(distanceKm: number): number {
  return Math.round(distanceKm * 1000 / 0.75);
}
export function distanceToMinutes(distanceKm: number): number {
  return Math.round((distanceKm / 3.87) * 60);
}
export function calcCalories(distanceKm: number, weightKg: number): number {
  const METS = 3.5;
  const hours = distanceKm / 3.87;
  return Math.round(METS * weightKg * hours);
}

export function generateId(prefix = "course"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

// ── セキュリティ: 座標の数値保証 ──────────────────────────
// URL に埋め込む座標は必ず toFixed(6) を通して「純粋な数値文字列」に
// 変換する。これにより文字列型の値が紛れ込んでもクエリ注入が不可能になる。
function sanitizeCoords(checkpoints: { lat: number; lng: number }[]): { lat: number; lng: number }[] {
  return checkpoints
    .map(c => ({ lat: Number(c.lat), lng: Number(c.lng) }))
    .filter(c =>
      Number.isFinite(c.lat) && Number.isFinite(c.lng) &&
      Math.abs(c.lat) <= 90 && Math.abs(c.lng) <= 180
    );
}

export function buildGoogleMapsUrl(checkpoints: { lat: number; lng: number }[]): string {
  const pts = sanitizeCoords(checkpoints);
  if (pts.length === 0) return "";
  const origin = `${pts[0].lat.toFixed(6)},${pts[0].lng.toFixed(6)}`;
  const middle = pts.slice(1, -1);
  let url = `https://www.google.com/maps/dir/?api=1`
    + `&origin=${encodeURIComponent(origin)}`
    + `&destination=${encodeURIComponent(origin)}`
    + `&travelmode=walking`;
  if (middle.length > 0) {
    // toFixed(6) 済みなので数値とカンマのみで構成される（注入不可）
    url += `&waypoints=${middle.map(c => `${c.lat.toFixed(6)},${c.lng.toFixed(6)}`).join("%7C")}`;
  }
  return url;
}

export function buildAppleMapsUrl(checkpoints: { lat: number; lng: number }[]): string {
  const pts = sanitizeCoords(checkpoints);
  if (pts.length === 0) return "";
  const s = `${pts[0].lat.toFixed(6)},${pts[0].lng.toFixed(6)}`;
  return `https://maps.apple.com/?saddr=${s}&daddr=${s}&dirflg=w`;
}
