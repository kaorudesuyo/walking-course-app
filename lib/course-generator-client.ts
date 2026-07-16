// ============================================================
// ウォーキングコース生成エンジン v3
//
// 【設計方針】
// ① 扇形分割（セクター法）: 出発地を中心に360°をチェックポイント数で
//    等分し、各扇形から最良スポットを1つずつ選ぶ。
//    → スポットが円状に分散し、構造的に「周回ループ」になる。
// ② 重複走行率の実測: OSRMのルート座標列を約11mグリッドで解析し、
//    同じ道を2回通った距離の割合を計算。閾値(30%)超過なら扇形を
//    回転させた別候補で再試行し、重複が最少のルートを採用。
//    → 「同じ道の折り返し」を定量的に排除。
// ③ コース間の差別化: コースを順次生成し、使用済みスポットに大幅減点、
//    かつコースごとに扇形の回転角をずらす。
//    → 3コースが別方向・別スポットの明確に異なるルートになる。
// ④ 双方向の時間フィッティング: 長すぎればスコア最低スポットを削除、
//    短すぎれば最大の角度ギャップに新スポットを追加して再計算。
//    → 指定時間±15%以内に収束させる。
// ============================================================

import type { Course, CourseType, Checkpoint, Difficulty } from "@/types/course";
import type { SpotInfo, SpotCategory } from "./overpass";
import { haversineDistance, generateId } from "./utils";
import {
  buildCourseName, buildCourseDescription, inferTags,
  COURSE_BEST_TIME, CATEGORY_WEIGHT, TYPE_PREFERRED_CATEGORIES,
} from "./course-templates";
import { fetchNearbySpotsClient, calculateRouteClient, reverseGeocodeClient } from "./client-api";

// ── 定数 ──────────────────────────────────────────────────
const WALK_KM_PER_MIN = 3.87 / 60;   // Googleマップ実測速度
const DETOUR_FACTOR   = 1.25;        // 道路距離 ≒ 直線 × 1.25
const TIME_HI         = 1.15;        // 時間の上限許容 (+15%)
const TIME_LO         = 0.80;        // 時間の下限許容 (-20%)
const OVERLAP_OK      = 0.30;        // 重複走行率がこれ以下なら良質なループ
const MAX_ROUTE_CALLS = 5;           // 1コースあたりのOSRM呼び出し上限

const TWO_PI = Math.PI * 2;

// ── 幾何ユーティリティ ─────────────────────────────────────
function toRad(deg: number) { return (deg * Math.PI) / 180; }

/** 出発地から見たスポットの方向角 (0〜2π) */
function bearing(oLat: number, oLng: number, lat: number, lng: number): number {
  const dLng = toRad(lng - oLng);
  const y = Math.sin(dLng) * Math.cos(toRad(lat));
  const x = Math.cos(toRad(oLat)) * Math.sin(toRad(lat))
          - Math.sin(toRad(oLat)) * Math.cos(toRad(lat)) * Math.cos(dLng);
  return normalizeAngle(Math.atan2(y, x));
}

function normalizeAngle(a: number): number {
  while (a < 0) a += TWO_PI;
  while (a >= TWO_PI) a -= TWO_PI;
  return a;
}

/** ループの理想半径(km): 総距離を円周とみなした半径 */
function loopRadius(durationMin: number): number {
  return (durationMin * WALK_KM_PER_MIN) / (TWO_PI * DETOUR_FACTOR);
}
/** スポット探索の最大直線距離(km): 片道で到達できる上限 */
function searchRadius(durationMin: number): number {
  return (durationMin * WALK_KM_PER_MIN / 2) / DETOUR_FACTOR;
}
/** 時間に応じたチェックポイント数 */
function targetSpotCount(durationMin: number): number {
  return durationMin <= 20 ? 2 : durationMin <= 40 ? 3 : durationMin <= 70 ? 4 : 5;
}

// ── スポット候補 ──────────────────────────────────────────
interface Cand {
  s: SpotInfo;
  score: number;
  ang: number;   // 出発地からの方向角
  dist: number;  // 出発地からの直線距離(km)
}

/**
 * スポットの基礎スコア。
 * usedIds（他コースで使用済み）は -0.55 の大幅減点 → 実質ほぼ除外され、
 * 代替がない場合のみ再利用される（スポットが少ない地域でも全コース生成可能）。
 */
function scoreSpot(
  spot: SpotInfo, dist: number,
  loopR: number, maxR: number,
  preferred: SpotCategory[], usedIds: Set<string>
): number {
  if (dist < 0.05 || dist > maxR) return -1;
  const idealLo = loopR * 0.6, idealHi = loopR * 1.4;
  const distScore =
    dist < idealLo ? (dist / idealLo) * 0.6 :
    dist <= idealHi ? 1.0 :
    Math.max(0.15, 1 - (dist - idealHi) / Math.max(maxR - idealHi, 0.01) * 0.85);
  const catScore  = (CATEGORY_WEIGHT[spot.category] ?? 5) / 10;
  const prefBonus = preferred.includes(spot.category) ? 0.30 : 0;
  const jaBonus   = /[\u3040-\u30ff\u4e00-\u9fff]/.test(spot.name) ? 0.06 : 0;
  const usedPenalty = usedIds.has(spot.id) ? 0.55 : 0;
  return distScore * 0.40 + catScore * 0.28 + prefBonus * 0.20 + jaBonus * 0.12 - usedPenalty;
}

function buildCandidates(
  spots: SpotInfo[], oLat: number, oLng: number,
  durationMin: number, type: CourseType, usedIds: Set<string>
): Cand[] {
  const loopR = loopRadius(durationMin);
  const maxR  = searchRadius(durationMin);
  const preferred = TYPE_PREFERRED_CATEGORIES[type];
  return spots
    .map(s => {
      const dist = haversineDistance(oLat, oLng, s.lat, s.lng);
      return {
        s,
        dist,
        score: scoreSpot(s, dist, loopR, maxR, preferred, usedIds),
        ang: bearing(oLat, oLng, s.lat, s.lng),
      };
    })
    .filter(c => c.score >= 0);
}

// ── ① 扇形分割によるスポット選択 ──────────────────────────
/**
 * 360°を numTarget 個の扇形に分割し、各扇形から最良スポットを1つ選ぶ。
 * offset により扇形の境界を回転できる（コース差別化・再試行に使用）。
 */
function selectBySectors(cands: Cand[], numTarget: number, offset: number): Cand[] {
  const sectorSize = TWO_PI / numTarget;
  const chosen: Cand[] = [];
  for (let k = 0; k < numTarget; k++) {
    const lo = normalizeAngle(offset + k * sectorSize);
    const inSector = cands.filter(c => normalizeAngle(c.ang - lo) < sectorSize);
    const eligible = inSector.filter(c =>
      !chosen.some(ch =>
        ch.s.id === c.s.id ||
        haversineDistance(ch.s.lat, ch.s.lng, c.s.lat, c.s.lng) < 0.12
      )
    );
    if (eligible.length === 0) continue; // 空の扇形はスキップ（ループは維持される）
    eligible.sort((a, b) => b.score - a.score);
    chosen.push(eligible[0]);
  }
  // 方向角順に並べ替え → 円を描く訪問順序
  chosen.sort((a, b) => normalizeAngle(a.ang - offset) - normalizeAngle(b.ang - offset));
  return chosen;
}

// ── ② 重複走行率の実測 ────────────────────────────────────
/**
 * ルート座標列の各セグメントを約11mグリッド（小数4桁）のキーに変換し、
 * 同じ道路区間を2回以上通った距離の割合を返す。
 * 0.0 = 完全な周回 / 1.0 = 完全な往復
 */
function measureOverlap(geometry: GeoJSON.LineString): number {
  const coords = geometry.coordinates;
  if (!coords || coords.length < 3) return 0;
  const seen = new Set<string>();
  let dup = 0, total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const [lng1, lat1] = coords[i];
    const [lng2, lat2] = coords[i + 1];
    const len = haversineDistance(lat1, lng1, lat2, lng2);
    total += len;
    const ka = `${lat1.toFixed(4)},${lng1.toFixed(4)}`;
    const kb = `${lat2.toFixed(4)},${lng2.toFixed(4)}`;
    const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`; // 無向キー（逆走も検出）
    if (seen.has(key)) dup += len;
    else seen.add(key);
  }
  return total > 0 ? dup / total : 0;
}

// ── ④ 時間フィッティング用ヘルパー ────────────────────────
/** 最大の角度ギャップ内にある最良スポットを返す（コースが短すぎるときの追加用） */
function findGapSpot(chosen: Cand[], cands: Cand[]): Cand | null {
  if (chosen.length === 0) return null;
  const angles = chosen.map(c => c.ang).sort((a, b) => a - b);
  let gapStart = 0, gapSize = 0;
  for (let i = 0; i < angles.length; i++) {
    const a = angles[i];
    const b = i === angles.length - 1 ? angles[0] + TWO_PI : angles[i + 1];
    if (b - a > gapSize) { gapSize = b - a; gapStart = a; }
  }
  // ギャップの中央60%に入るスポットのみ（既存スポットに近い方向を避ける）
  const eligible = cands.filter(c => {
    if (chosen.some(ch => ch.s.id === c.s.id)) return false;
    if (chosen.some(ch => haversineDistance(ch.s.lat, ch.s.lng, c.s.lat, c.s.lng) < 0.12)) return false;
    const rel = normalizeAngle(c.ang - gapStart);
    return rel > gapSize * 0.2 && rel < gapSize * 0.8;
  });
  if (eligible.length === 0) return null;
  eligible.sort((a, b) => b.score - a.score);
  return eligible[0];
}

interface RouteEval {
  chosen: Cand[];
  distanceKm: number;
  actualMin: number;
  overlap: number;
  geometry: GeoJSON.LineString;
}

/**
 * 選択スポットでループルートを計算し、時間が合うまで追加・削除を繰り返す。
 * budget.remaining でOSRM呼び出し回数を制御。
 */
async function routeAndFit(
  initial: Cand[], cands: Cand[],
  oLat: number, oLng: number, target: number,
  offset: number, budget: { remaining: number }
): Promise<RouteEval | null> {
  let chosen = [...initial];
  let result: RouteEval | null = null;

  while (budget.remaining > 0 && chosen.length >= 1) {
    const pts = [
      { lat: oLat, lng: oLng },
      ...chosen.map(c => ({ lat: c.s.lat, lng: c.s.lng })),
      { lat: oLat, lng: oLng }, // ループ: 出発地に戻る
    ];
    const route = await calculateRouteClient(pts);
    budget.remaining--;
    if (!route) break;

    const distanceKm = parseFloat((route.distanceMeters / 1000).toFixed(1));
    const actualMin  = Math.round((distanceKm / 3.87) * 60); // Googleマップ基準
    result = { chosen: [...chosen], distanceKm, actualMin, overlap: measureOverlap(route.geometry), geometry: route.geometry };

    if (actualMin > target * TIME_HI && chosen.length > 1) {
      // 長すぎ → スコア最低のスポットを削除して再計算
      let worstIdx = 0;
      for (let i = 1; i < chosen.length; i++) if (chosen[i].score < chosen[worstIdx].score) worstIdx = i;
      chosen.splice(worstIdx, 1);
      continue;
    }
    if (actualMin < target * TIME_LO && budget.remaining > 0) {
      // 短すぎ → 最大ギャップにスポットを追加して再計算
      const add = findGapSpot(chosen, cands);
      if (add) {
        chosen.push(add);
        chosen.sort((a, b) => normalizeAngle(a.ang - offset) - normalizeAngle(b.ang - offset));
        continue;
      }
    }
    break; // 時間が許容範囲内、または調整手段がない
  }
  return result;
}

// ── その他ヘルパー ────────────────────────────────────────
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
function timeValid(r: RouteEval, target: number): boolean {
  return r.actualMin <= target * TIME_HI;
}

// ── ③ 単一コース生成（差別化オフセット付き）────────────────
async function buildOneCourse(
  type: CourseType, spots: SpotInfo[],
  oLat: number, oLng: number, target: number,
  usedIds: Set<string>, offsetBase: number
): Promise<Course | null> {
  const numTarget = targetSpotCount(target);
  const sectorSize = TWO_PI / numTarget;
  const cands = buildCandidates(spots, oLat, oLng, target, type, usedIds);
  if (cands.length === 0) return null;

  const budget = { remaining: MAX_ROUTE_CALLS };
  let best: RouteEval | null = null;

  // 基本オフセット → 重複が多ければ扇形を半回転させた別候補で再試行
  for (const off of [offsetBase, offsetBase + sectorSize / 2]) {
    if (budget.remaining <= 0) break;
    const sel = selectBySectors(cands, numTarget, normalizeAngle(off));
    if (sel.length < 1) continue;
    const res = await routeAndFit(sel, cands, oLat, oLng, target, normalizeAngle(off), budget);
    if (!res) continue;
    if (timeValid(res, target)) {
      if (!best || !timeValid(best, target) || res.overlap < best.overlap) best = res;
      if (best.overlap <= OVERLAP_OK) break; // 十分に良質な周回ループ → 確定
    } else if (!best) {
      best = res; // 時間超過しか得られない場合の保険
    }
  }

  if (!best || best.chosen.length === 0) return null;

  const finalSpots = best.chosen.map(c => c.s);
  const checkpoints: Checkpoint[] = [
    { order: 1, name: "出発地点", lat: oLat, lng: oLng, description: "スタート / ゴール", isStart: true },
    ...finalSpots.map((s, i) => ({
      order: i + 2, name: s.name, lat: s.lat, lng: s.lng,
      description: categoryDescription(s.category), osmId: s.id,
    })),
    { order: finalSpots.length + 2, name: "出発地点へ戻る", lat: oLat, lng: oLng, description: "ゴール", isGoal: true },
  ];

  // このコースが使ったスポットを記録 → 次のコースは別スポットを選ぶ
  for (const s of finalSpots) usedIds.add(s.id);

  const spotNames  = finalSpots.map(s => s.name);
  const categories = finalSpots.map(s => s.category);

  return {
    id: generateId(type), type,
    name: buildCourseName(type, spotNames[0]),
    distanceKm: best.distanceKm,
    durationMin: best.actualMin,
    difficulty: estimateDifficulty(best.distanceKm),
    tags: inferTags(categories),
    description: buildCourseDescription(type, spotNames, best.actualMin, best.distanceKm),
    bestTime: COURSE_BEST_TIME[type],
    checkpoints,
    routeGeoJson: best.geometry,
  };
}

// ── メインエクスポート ─────────────────────────────────────
export interface GenerateResult {
  areaName: string;
  courses: Course[];
}

const COURSE_TYPES: CourseType[] = ["nature", "historical", "town"];
const TYPE_PROGRESS: Record<CourseType, string> = {
  nature: "自然コースを構築中...",
  historical: "歴史コースを構築中...",
  town: "街歩きコースを構築中...",
};

export async function generateCoursesClient(
  lat: number, lng: number, durationMin: number,
  onProgress?: (msg: string) => void
): Promise<GenerateResult> {
  onProgress?.("エリアをスキャン中...");
  const radiusMeters = Math.round(searchRadius(durationMin) * 1000);

  onProgress?.("スポットを収集中...");
  const [spots, areaName] = await Promise.all([
    fetchNearbySpotsClient(lat, lng, radiusMeters),
    reverseGeocodeClient(lat, lng),
  ]);
  if (spots.length < 2) throw new Error("周辺にスポットが見つかりませんでした。別の場所をお試しください。");

  // ③ コースを順次生成: 使用済みスポットを共有し、扇形の回転角をコースごとにずらす
  //    → 3コースが別方向・別スポットの明確に異なるルートになる
  const usedIds = new Set<string>();
  const courses: Course[] = [];
  for (let i = 0; i < COURSE_TYPES.length; i++) {
    const type = COURSE_TYPES[i];
    onProgress?.(TYPE_PROGRESS[type]);
    const offsetBase = (i * TWO_PI) / COURSE_TYPES.length; // 0°, 120°, 240°
    try {
      const course = await buildOneCourse(type, spots, lat, lng, durationMin, usedIds, offsetBase);
      if (course) courses.push(course);
    } catch { /* 1コースの失敗は他コースに影響させない */ }
  }

  if (courses.length === 0) throw new Error("コースを生成できませんでした。時間や場所を変えてお試しください。");
  return { areaName, courses };
}
