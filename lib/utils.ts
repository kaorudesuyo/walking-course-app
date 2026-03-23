// 座標・距離計算ユーティリティ

/**
 * Haversine公式で2点間の距離(km)を計算
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number) { return (deg * Math.PI) / 180; }

/**
 * Googleマップ徒歩速度: 約3.87km/h (実測補正値、Googleマップと一致)
 * OSRMのfootプロファイルも同じ速度基準のため、
 * 歩行時間(分) → 目標距離(km) [3.87km/h = Googleマップ実測基準]
 */
export function durationToDistance(durationMin: number): number {
  return parseFloat(((durationMin / 60) * 3.87).toFixed(2));
}

/**
 * 距離(km) → 歩行時間(分) [3.87km/h = Googleマップ実測基準]
 */
export function distanceToDuration(distanceKm: number): number {
  return Math.round((distanceKm / 3.87) * 60);
}

/**
 * 距離(km) → Googleマップ基準の徒歩時間(分)
 * Googleマップ徒歩速度 = 3.87km/h (実測補正値、Googleマップと一致)
 *
 * OSRMのdurationSecondsはキャッシュや設定によってずれが生じるため使用しない。
 * distanceMetersから直接計算することでGoogleマップと一致させる。
 */
export function osrmSecondsToWalkMinutes(_seconds: number): number {
  // 非推奨: distanceKmから直接計算すること
  // この関数はinterface互換のため残しているが内部では使用しない
  return Math.round(_seconds / 60);
}

/**
 * 距離(km) → Googleマップ基準の徒歩時間(分) [3.87km/h 実測値]
 * メインで使用する関数
 */
export function distanceToGoogleMapsMinutes(distanceKm: number): number {
  return Math.round((distanceKm / 3.87) * 60);
}

export function generateId(prefix = "course"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function buildGoogleMapsUrl(checkpoints: { lat: number; lng: number }[]): string {
  if (checkpoints.length === 0) return "";

  // ループルート設計:
  // checkpoints[0] = 出発地 (isStart)
  // checkpoints[1..n-1] = 中間スポット
  // checkpoints[n] = 出発地へ戻る (isGoal, 出発地と同座標)
  //
  // GoogleマップURL: origin=出発地, waypoints=中間スポット, destination=出発地
  // → originとdestinationを同じ座標にするとGoogleマップがループルートを正しく計算する

  const origin      = `${checkpoints[0].lat},${checkpoints[0].lng}`;
  const destination = origin; // ループ: 出発地に戻る

  // 中間スポット = 最初と最後(ゴール=出発地)を除いた全て
  const middle = checkpoints.slice(1, -1);
  const waypoints = middle.map((c) => `${c.lat},${c.lng}`).join("|");

  // URLSearchParams は | を %7C にエンコードするためGoogleマップが誤認識する
  // → 手動でURL文字列を組み立てる
  let url = `https://www.google.com/maps/dir/?api=1`
    + `&origin=${encodeURIComponent(origin)}`
    + `&destination=${encodeURIComponent(destination)}`
    + `&travelmode=walking`;
  if (waypoints) {
    // waypoints の | はそのまま残す（Googleマップの仕様）
    url += `&waypoints=${middle.map((c) => `${c.lat},${c.lng}`).join("%7C")}`;
  }
  return url;
}

export function buildAppleMapsUrl(checkpoints: { lat: number; lng: number }[]): string {
  if (checkpoints.length === 0) return "";
  const start = checkpoints[0];
  const end = checkpoints[checkpoints.length - 1];
  return `https://maps.apple.com/?saddr=${start.lat},${start.lng}&daddr=${end.lat},${end.lng}&dirflg=w`;
}

export function encodeCourseToUrl(course: {
  id: string;
  checkpoints: { lat: number; lng: number; name: string }[];
  name: string;
}): string {
  const data = JSON.stringify({
    id: course.id, n: course.name,
    pts: course.checkpoints.map((c) => [
      parseFloat(c.lat.toFixed(5)), parseFloat(c.lng.toFixed(5)), c.name,
    ]),
  });
  return btoa(encodeURIComponent(data));
}
