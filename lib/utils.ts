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

export function buildGoogleMapsUrl(checkpoints: { lat: number; lng: number }[]): string {
  if (checkpoints.length === 0) return "";
  const origin = `${checkpoints[0].lat},${checkpoints[0].lng}`;
  const middle = checkpoints.slice(1, -1);
  let url = `https://www.google.com/maps/dir/?api=1`
    + `&origin=${encodeURIComponent(origin)}`
    + `&destination=${encodeURIComponent(origin)}`
    + `&travelmode=walking`;
  if (middle.length > 0) {
    url += `&waypoints=${middle.map(c => `${c.lat},${c.lng}`).join("%7C")}`;
  }
  return url;
}

export function buildAppleMapsUrl(checkpoints: { lat: number; lng: number }[]): string {
  if (checkpoints.length === 0) return "";
  const s = checkpoints[0];
  return `https://maps.apple.com/?saddr=${s.lat},${s.lng}&daddr=${s.lat},${s.lng}&dirflg=w`;
}
