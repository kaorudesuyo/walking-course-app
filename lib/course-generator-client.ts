// クライアントサイドでコース生成（外部APIをブラウザから直接呼び出す）

import type { Course, CourseType, Checkpoint, Difficulty } from "@/types/course";
import type { SpotInfo, SpotCategory } from "./overpass";
import { haversineDistance, generateId } from "./utils";
import {
  buildCourseName, buildCourseDescription, inferTags,
  COURSE_BEST_TIME, CATEGORY_WEIGHT, TYPE_PREFERRED_CATEGORIES,
} from "./course-templates";
import { fetchNearbySpotsClient, calculateRouteClient, reverseGeocodeClient } from "./client-api";

// ── 定数 ──────────────────────────────────────────────────
const WALK_KM_PER_MIN = 3.87 / 60; // Googleマップ実測速度
const DETOUR_FACTOR   = 1.25;       // 道路距離 = 直線 × 1.25
const TOLERANCE       = 0.15;       // 許容誤差 ±15%

// ── ループ半径・探索半径 ───────────────────────────────────
function loopRadius(durationMin: number): number {
  const totalRoadKm = durationMin * WALK_KM_PER_MIN;
  return totalRoadKm / (2 * Math.PI * DETOUR_FACTOR);
}
function searchRadius(durationMin: number): number {
  const totalRoadKm = durationMin * WALK_KM_PER_MIN;
  return (totalRoadKm / 2) / DETOUR_FACTOR;
}

// ── 方向角 ────────────────────────────────────────────────
function bearing(oLat: number, oLng: number, lat: number, lng: number): number {
  const dLng = toRad(lng - oLng);
  const y = Math.sin(dLng) * Math.cos(toRad(lat));
  const x = Math.cos(toRad(oLat)) * Math.sin(toRad(lat))
          - Math.sin(toRad(oLat)) * Math.cos(toRad(lat)) * Math.cos(dLng);
  return Math.atan2(y, x);
}
function toRad(deg: number) { return (deg * Math.PI) / 180; }
function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d >  Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return Math.abs(d);
}

// ── スコアリング ──────────────────────────────────────────
function scoreSpot(
  spot: SpotInfo, oLat: number, oLng: number,
  maxR: number, loopR: number, preferred: SpotCategory[]
): number {
  const dist = haversineDistance(oLat, oLng, spot.lat, spot.lng);
  if (dist < 0.05 || dist > maxR) return -1;
  const idealLo = loopR * 0.5, idealHi = loopR * 1.1;
  const distScore =
    dist < idealLo ? dist / idealLo * 0.6 :
    dist <= idealHi ? 1.0 :
    Math.max(0.2, 1 - (dist - idealHi) / (maxR - idealHi) * 0.8);
  const catScore  = (CATEGORY_WEIGHT[spot.category] ?? 5) / 10;
  const prefBonus = preferred.includes(spot.category) ? 0.25 : 0;
  const hasJaName = /[\u3040-\u30ff\u4e00-\u9fff]/.test(spot.name) ? 0.08 : 0;
  return distScore * 0.45 + catScore * 0.28 + prefBonus * 0.19 + hasJaName * 0.08;
}

// ── ループ順序付け ────────────────────────────────────────
function orderAsLoop(spots: SpotInfo[], oLat: number, oLng: number, scores: Map<string, number>): SpotInfo[] {
  if (spots.length <= 1) return spots;
  const withAngle = spots.map(s => ({ spot: s, angle: bearing(oLat, oLng, s.lat, s.lng), score: scores.get(s.id) ?? 0 }));
  const best = withAngle.reduce((a, b) => a.score > b.score ? a : b);
  const startAngle = best.angle;
  withAngle.sort((a, b) => {
    let da = a.angle - startAngle, db = b.angle - startAngle;
    if (da < 0) da += 2 * Math.PI;
    if (db < 0) db += 2 * Math.PI;
    return da - db;
  });
  return withAngle.map(x => x.spot);
}

// ── チェックポイント選択 ──────────────────────────────────
function selectCheckpoints(spots: SpotInfo[], oLat: number, oLng: number, durationMin: number, type: CourseType): SpotInfo[] {
  const maxR = searchRadius(durationMin);
  const loopR = loopRadius(durationMin);
  const preferred = TYPE_PREFERRED_CATEGORIES[type];
  const scoreMap = new Map<string, number>();
  const candidates = spots
    .map(s => { const score = scoreSpot(s, oLat, oLng, maxR, loopR, preferred); scoreMap.set(s.id, score); return { spot: s, score }; })
    .filter(x => x.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.spot);
  if (candidates.length === 0) return [];
  const maxSpots = durationMin <= 20 ? 2 : durationMin <= 40 ? 3 : durationMin <= 70 ? 4 : 5;
  const minAngleDiff = Math.PI / 6;
  const selected: SpotInfo[] = [];
  const selectedAngles: number[] = [];
  for (const spot of candidates) {
    if (selected.length >= maxSpots) break;
    if (selected.some(s => haversineDistance(s.lat, s.lng, spot.lat, spot.lng) < 0.15)) continue;
    const angle = bearing(oLat, oLng, spot.lat, spot.lng);
    if (selected.length >= 1 && selectedAngles.some(a => angleDiff(angle, a) < minAngleDiff)) continue;
    selected.push(spot);
    selectedAngles.push(angle);
  }
  return orderAsLoop(selected, oLat, oLng, scoreMap);
}

// ── ルート検証・時間調整 ──────────────────────────────────
async function validateRoute(
  candidateSpots: SpotInfo[], oLat: number, oLng: number, durationMin: number
): Promise<{ spots: SpotInfo[]; distanceKm: number; actualMin: number; geometry: GeoJSON.LineString | undefined }> {
  const hi = durationMin * (1 + TOLERANCE);
  let spots = [...candidateSpots];
  for (let attempt = 0; attempt < 4; attempt++) {
    const routePoints = [
      { lat: oLat, lng: oLng },
      ...spots.map(s => ({ lat: s.lat, lng: s.lng })),
      { lat: oLat, lng: oLng }, // ループ: 出発地に戻る
    ];
    const route = await calculateRouteClient(routePoints);
    if (!route) break;
    const distanceKm = parseFloat((route.distanceMeters / 1000).toFixed(1));
    const actualMin  = Math.round((distanceKm / 3.87) * 60); // Googleマップ基準
    if (actualMin <= hi) return { spots, distanceKm, actualMin, geometry: route.geometry };
    if (spots.length > 1) { spots = spots.slice(0, -1); }
    else {
      const trimDist = parseFloat((durationMin * WALK_KM_PER_MIN).toFixed(1));
      return { spots, distanceKm: trimDist, actualMin: durationMin, geometry: route.geometry };
    }
  }
  const fallbackDist = parseFloat((durationMin * WALK_KM_PER_MIN).toFixed(1));
  return { spots, distanceKm: fallbackDist, actualMin: durationMin, geometry: undefined };
}

function estimateDifficulty(distanceKm: number): Difficulty {
  if (distanceKm < 2.5) return "flat";
  if (distanceKm < 5.0) return "moderate";
  return "hilly";
}
function categoryDescription(cat: SpotCategory): string {
  const map: Record<SpotCategory, string> = {
    park: "公園・緑地", shrine: "神社", temple: "寺院",
    historical: "史跡", viewpoint: "展望スポット",
    river: "川・水辺", nature: "自然", attraction: "観光スポット",
  };
  return map[cat] ?? "";
}

// ── 単一コース生成 ────────────────────────────────────────
async function buildOneCourse(
  type: CourseType, spots: SpotInfo[], oLat: number, oLng: number, durationMin: number
): Promise<Course | null> {
  const candidateSpots = selectCheckpoints(spots, oLat, oLng, durationMin, type);
  if (candidateSpots.length < 1) return null;
  const { spots: finalSpots, distanceKm, actualMin, geometry } =
    await validateRoute(candidateSpots, oLat, oLng, durationMin);
  if (finalSpots.length === 0) return null;
  const checkpoints: Checkpoint[] = [
    { order: 1, name: "出発地点", lat: oLat, lng: oLng, description: "スタート / ゴール", isStart: true },
    ...finalSpots.map((s, i) => ({
      order: i + 2, name: s.name, lat: s.lat, lng: s.lng,
      description: categoryDescription(s.category), osmId: s.id,
    })),
    { order: finalSpots.length + 2, name: "出発地点へ戻る", lat: oLat, lng: oLng, description: "ゴール", isGoal: true },
  ];
  const spotNames  = finalSpots.map(s => s.name);
  const categories = finalSpots.map(s => s.category);
  return {
    id: generateId(type), type,
    name: buildCourseName(type, spotNames[0]),
    distanceKm, durationMin: actualMin,
    difficulty: estimateDifficulty(distanceKm),
    tags: inferTags(categories),
    description: buildCourseDescription(type, spotNames, actualMin, distanceKm),
    bestTime: COURSE_BEST_TIME[type],
    checkpoints, routeGeoJson: geometry,
  };
}

// ── メインエクスポート ─────────────────────────────────────
export interface GenerateResult {
  areaName: string;
  courses: Course[];
}

export async function generateCoursesClient(
  lat: number, lng: number, durationMin: number,
  onProgress?: (msg: string) => void
): Promise<GenerateResult> {
  onProgress?.("エリアをスキャン中...");

  // 検索半径計算
  const totalRoadKm = durationMin * WALK_KM_PER_MIN;
  const radiusMeters = Math.round((totalRoadKm / 2) / DETOUR_FACTOR * 1000);

  // 並行取得
  onProgress?.("スポットを収集中...");
  const [spots, areaName] = await Promise.all([
    fetchNearbySpotsClient(lat, lng, radiusMeters),
    reverseGeocodeClient(lat, lng),
  ]);

  if (spots.length < 2) throw new Error("周辺にスポットが見つかりませんでした。別の場所をお試しください。");

  onProgress?.("ルートを計算中...");
  const COURSE_TYPES: CourseType[] = ["nature", "historical", "town"];
  const results = await Promise.allSettled(
    COURSE_TYPES.map(type => buildOneCourse(type, spots, lat, lng, durationMin))
  );

  const courses: Course[] = results
    .filter((r): r is PromiseFulfilledResult<Course> => r.status === "fulfilled" && r.value !== null)
    .map(r => r.value);

  if (courses.length === 0) throw new Error("コースを生成できませんでした。時間や場所を変えてお試しください。");

  onProgress?.("コースを構築中...");
  return { areaName, courses };
}
