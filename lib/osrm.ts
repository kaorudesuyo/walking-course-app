// 型定義のみ（実際のAPI呼び出しは lib/client-api.ts で行う）
export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  geometry: GeoJSON.LineString;
}
