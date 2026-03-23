// ウォーキングコース関連の型定義

export type CourseType = "nature" | "historical" | "town";

export type Difficulty = "flat" | "moderate" | "hilly";

export type BestTime = "morning" | "afternoon" | "evening" | "night";

export type TagKey =
  | "nature"
  | "seasonal"
  | "birds"
  | "historical"
  | "shrine"
  | "temple"
  | "river"
  | "sea"
  | "viewpoint"
  | "town"
  | "cafe"
  | "shopping"
  | "park"
  | "forest";

export const TAG_LABELS: Record<TagKey, string> = {
  nature:     "🌿 自然",
  seasonal:   "🌸 季節",
  birds:      "🐦 野鳥",
  historical: "🏯 歴史",
  shrine:     "⛩️ 神社",
  temple:     "🛕 寺院",
  river:      "🌊 川",
  sea:        "🌅 海・湖",
  viewpoint:  "👁️ 眺望",
  town:       "🏘️ 街並み",
  cafe:       "☕ カフェ",
  shopping:   "🛍️ ショッピング",
  park:       "🌳 公園",
  forest:     "🌲 森",
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  flat:     "★ 平坦",
  moderate: "★★ やや起伏あり",
  hilly:    "★★★ 坂あり",
};

export const BEST_TIME_LABELS: Record<BestTime, string> = {
  morning:   "🌅 朝",
  afternoon: "☀️ 昼",
  evening:   "🌇 夕方",
  night:     "🌃 夜景",
};

export interface Checkpoint {
  order: number;
  name: string;
  lat: number;
  lng: number;
  description?: string;
  isStart?: boolean;
  isGoal?: boolean;
  osmId?: string;
}

export interface Course {
  id: string;
  type: CourseType;
  name: string;
  distanceKm: number;
  durationMin: number;
  difficulty: Difficulty;
  tags: TagKey[];
  description: string;
  bestTime: BestTime[];
  checkpoints: Checkpoint[];
  routeGeoJson?: GeoJSON.LineString;
}

export interface CoursesResponse {
  areaName: string;
  courses: Course[];
  generatedAt: string;
}

export interface CoursesRequest {
  latitude: number;
  longitude: number;
  duration: number;
}

// Overpass API のレスポンスに使う型
export interface OsmElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface OverpassResponse {
  elements: OsmElement[];
}
