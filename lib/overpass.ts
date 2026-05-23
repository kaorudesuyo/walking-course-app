// 型定義のみ（実際のAPI呼び出しは lib/client-api.ts で行う）

export interface SpotInfo {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: SpotCategory;
  osmTags: Record<string, string>;
}

export type SpotCategory =
  | "park" | "shrine" | "temple" | "historical"
  | "viewpoint" | "river" | "nature" | "attraction";
