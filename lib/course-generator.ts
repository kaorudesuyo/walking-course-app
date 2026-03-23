import type { Course, CourseType, Checkpoint, Difficulty } from "@/types/course";
import type { SpotInfo, SpotCategory } from "./overpass";
import { haversineDistance, generateId, osrmSecondsToWalkMinutes } from "./utils";
import {
  buildCourseName,
  buildCourseDescription,
  inferTags,
  COURSE_BEST_TIME,
  CATEGORY_WEIGHT,
  TYPE_PREFERRED_CATEGORIES,
} from "./course-templates";
import { calculateRoute } from "./osrm";

// ─────────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────────

// Googleマップ実測速度 = 3.87km/h (実測補正: アプリ29分 = Googleマップ36分)
const WALK_KM_PER_MIN = 3.87 / 60;

// 道路距離は直線距離の平均1.25倍（迂回係数）
const DETOUR_FACTOR = 1.25;

// 許容誤差: 目標時間 ±15%
const TOLERANCE = 0.15;

// ─────────────────────────────────────────────────────
// ① ループルート設計の核心
//
// 戦略: スポットを「円弧上」に配置してループを作る
//
// 考え方:
//   - 総道路距離 = durationMin × 3.87km/h
//   - ループ半径(直線) ≈ 総道路距離 ÷ (2π × 迂回係数)
//     → 円周 ≒ 2πr として、道路距離で一周できる半径
//   - スポットはその半径の 50〜100% の距離帯に配置
//   - 方向角を均等に分散させて「円を描くように」順序付け
// ─────────────────────────────────────────────────────

/** ループの理想半径(直線km): 総距離を円周とみなした半径 */
function loopRadius(durationMin: number): number {
  const totalRoadKm = durationMin * WALK_KM_PER_MIN;
  return totalRoadKm / (2 * Math.PI * DETOUR_FACTOR);
}

/** スポット探索の最大直線距離(km): 片道で到達できる上限 */
function searchRadius(durationMin: number): number {
  const totalRoadKm = durationMin * WALK_KM_PER_MIN;
  // 片道道路距離 = 総距離/2、直線換算 = ÷迂回係数
  return (totalRoadKm / 2) / DETOUR_FACTOR;
}

// ─────────────────────────────────────────────────────
// ② 方向角の計算ユーティリティ
// ─────────────────────────────────────────────────────

/** 出発地から見たスポットの方向角(ラジアン, 北=0, 時計回り) */
function bearing(
  originLat: number, originLng: number,
  lat: number, lng: number
): number {
  const dLng = toRad(lng - originLng);
  const y = Math.sin(dLng) * Math.cos(toRad(lat));
  const x = Math.cos(toRad(originLat)) * Math.sin(toRad(lat))
          - Math.sin(toRad(originLat)) * Math.cos(toRad(lat)) * Math.cos(dLng);
  return Math.atan2(y, x); // -π〜π
}

function toRad(deg: number) { return (deg * Math.PI) / 180; }

/** 2つの角度の差（-π〜π に正規化） */
function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d >  Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return Math.abs(d);
}

// ─────────────────────────────────────────────────────
// ③ スポットスコアリング（ループ設計対応）
// ─────────────────────────────────────────────────────

function scoreSpotForLoop(
  spot: SpotInfo,
  originLat: number,
  originLng: number,
  maxSearchR: number,        // 片道最大直線距離(km)
  loopR: number,             // 理想ループ半径(km)
  preferred: SpotCategory[]
): number {
  const dist = haversineDistance(originLat, originLng, spot.lat, spot.lng);

  // 近すぎ(50m以内)・遠すぎ(片道最大超)はスキップ
  if (dist < 0.05 || dist > maxSearchR) return -1;

  // 距離スコア: ループ半径(loopR)付近が最高点、遠くなるほど緩やかに減点
  const idealLo = loopR * 0.5, idealHi = loopR * 1.1;
  const distScore =
    dist < idealLo ? dist / idealLo * 0.6 :
    dist <= idealHi ? 1.0 :
    Math.max(0.2, 1 - (dist - idealHi) / (maxSearchR - idealHi) * 0.8);

  const catScore  = (CATEGORY_WEIGHT[spot.category] ?? 5) / 10;
  const prefBonus = preferred.includes(spot.category) ? 0.25 : 0;
  const hasJaName = /[\u3040-\u30ff\u4e00-\u9fff]/.test(spot.name) ? 0.08 : 0;

  return distScore * 0.45 + catScore * 0.28 + prefBonus * 0.19 + hasJaName * 0.08;
}

// ─────────────────────────────────────────────────────
// ④ ループ順序付け: 方向角でソートして円弧順に並べる
// ─────────────────────────────────────────────────────

/**
 * 出発地を中心にスポットを方向角でソート。
 * 最もスコアが高いスポットを「12時方向の基準」として、
 * そこから時計回りに並べることでループ経路を形成する。
 */
function orderAsLoop(
  spots: SpotInfo[],
  originLat: number,
  originLng: number,
  scores: Map<string, number>
): SpotInfo[] {
  if (spots.length === 0) return [];
  if (spots.length === 1) return spots;

  // 方向角を付加
  const withAngle = spots.map((s) => ({
    spot: s,
    angle: bearing(originLat, originLng, s.lat, s.lng),
    score: scores.get(s.id) ?? 0,
  }));

  // 最高スコアのスポットを「起点方向」とする
  const best = withAngle.reduce((a, b) => a.score > b.score ? a : b);
  const startAngle = best.angle;

  // 起点から時計回りに並べる (角度差 0〜2π)
  withAngle.sort((a, b) => {
    let da = a.angle - startAngle;
    let db = b.angle - startAngle;
    if (da < 0) da += 2 * Math.PI;
    if (db < 0) db += 2 * Math.PI;
    return da - db;
  });

  return withAngle.map((x) => x.spot);
}

// ─────────────────────────────────────────────────────
// ⑤ チェックポイント選択（ループ対応）
// ─────────────────────────────────────────────────────

function selectCheckpoints(
  spots: SpotInfo[],
  originLat: number,
  originLng: number,
  durationMin: number,
  type: CourseType
): SpotInfo[] {
  const maxR      = searchRadius(durationMin);  // 片道最大直線距離
  const loopR     = loopRadius(durationMin);    // 理想ループ半径
  const preferred = TYPE_PREFERRED_CATEGORIES[type];

  // 全スポットをスコアリング
  const scoreMap = new Map<string, number>();
  const candidates = spots
    .map((s) => {
      const score = scoreSpotForLoop(s, originLat, originLng, maxR, loopR, preferred);
      scoreMap.set(s.id, score);
      return { spot: s, score };
    })
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.spot);

  if (candidates.length === 0) return [];

  // 時間に応じたスポット数
  const maxSpots = durationMin <= 20 ? 2 : durationMin <= 40 ? 3 : durationMin <= 70 ? 4 : 5;

  // 上位候補から「方向が互いに分散している」スポットを選ぶ
  // → 近い方向に固まるとループにならず往復になるため、
  //   角度差 30° (π/6) 以上を保つ
  const minAngleDiff = Math.PI / 6; // 30°
  const selected: SpotInfo[] = [];
  const selectedAngles: number[] = [];

  for (const spot of candidates) {
    if (selected.length >= maxSpots) break;

    // 近距離スポットと重複チェック (150m以内はスキップ)
    const tooClose = selected.some(
      (s) => haversineDistance(s.lat, s.lng, spot.lat, spot.lng) < 0.15
    );
    if (tooClose) continue;

    // 方向角チェック: 選択済みの方向と 30° 以上離れているか
    const angle = bearing(originLat, originLng, spot.lat, spot.lng);
    const tooSameDirection = selectedAngles.some(
      (a) => angleDiff(angle, a) < minAngleDiff
    );
    if (tooSameDirection && selected.length >= 1) continue;

    selected.push(spot);
    selectedAngles.push(angle);
  }

  // 方向角でソートしてループ順に並べる
  return orderAsLoop(selected, originLat, originLng, scoreMap);
}

// ─────────────────────────────────────────────────────
// ⑥ ルート検証・時間調整
//    ループルートはスタート地点に「戻る」ためのwayを最後に追加
// ─────────────────────────────────────────────────────

async function validateAndTrimRoute(
  checkpointSpots: SpotInfo[],
  originLat: number,
  originLng: number,
  durationMin: number
): Promise<{
  spots: SpotInfo[];
  distanceKm: number;
  actualMin: number;
  geometry: GeoJSON.LineString | undefined;
}> {
  const target = durationMin;
  const hi = target * (1 + TOLERANCE);

  let spots = [...checkpointSpots];

  for (let attempt = 0; attempt < 4; attempt++) {
    // ループルート: 最後にスタート地点へ戻るポイントを追加
    const routePoints = [
      { lat: originLat, lng: originLng },
      ...spots.map((s) => ({ lat: s.lat, lng: s.lng })),
      { lat: originLat, lng: originLng }, // ← ループ完結：スタートに戻る
    ];

    const route = await calculateRoute(routePoints);
    if (!route) break;

    const distanceKm = parseFloat((route.distanceMeters / 1000).toFixed(1));

    // ★ OSRMのdurationSecondsは信頼せず、distanceから直接計算する
    // Googleマップ実測速度 3.87km/h で統一
    const actualMin = Math.round((distanceKm / 3.87) * 60);

    console.log(`[ROUTE DEBUG] attempt=${attempt} spots=${spots.length} distance=${distanceKm}km actualMin=${actualMin}min target=${target}min`);

    if (actualMin <= hi) {
      return { spots, distanceKm, actualMin, geometry: route.geometry };
    }

    // 時間オーバー → スポットを1つ削って再試行
    if (spots.length > 1) {
      // 最もスコアが低い（最後に選ばれた）スポットを削除
      spots = spots.slice(0, -1);
    } else {
      // 距離から所要時間を再計算
      const trimmedMin = Math.round((distanceKm / 3.87) * 60);
      return {
        spots,
        distanceKm,
        actualMin: trimmedMin,
        geometry: route.geometry,
      };
    }
  }

  // fallback
  const fallbackDist = parseFloat((target * WALK_KM_PER_MIN).toFixed(1));
  return { spots, distanceKm: fallbackDist, actualMin: target, geometry: undefined };
}

// ─────────────────────────────────────────────────────
// ⑦ 難易度・カテゴリ説明
// ─────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────
// ⑧ 単一コース生成
// ─────────────────────────────────────────────────────

async function buildOneCourse(
  type: CourseType,
  spots: SpotInfo[],
  originLat: number,
  originLng: number,
  durationMin: number
): Promise<Course | null> {
  const candidateSpots = selectCheckpoints(spots, originLat, originLng, durationMin, type);
  if (candidateSpots.length < 1) return null;

  const { spots: finalSpots, distanceKm, actualMin, geometry } =
    await validateAndTrimRoute(candidateSpots, originLat, originLng, durationMin);

  if (finalSpots.length === 0) return null;

  const checkpoints: Checkpoint[] = [
    {
      order: 1,
      name: "出発地点",
      lat: originLat,
      lng: originLng,
      description: "スタート / ゴール",
      isStart: true,
    },
    ...finalSpots.map((s, i) => ({
      order: i + 2,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      description: categoryDescription(s.category),
      osmId: s.id,
    })),
    // ループ完結: スタート地点をゴールとして再掲
    {
      order: finalSpots.length + 2,
      name: "出発地点へ戻る",
      lat: originLat,
      lng: originLng,
      description: "ゴール",
      isGoal: true,
    },
  ];

  const spotNames  = finalSpots.map((s) => s.name);
  const categories = finalSpots.map((s) => s.category);

  return {
    id: generateId(type),
    type,
    name: buildCourseName(type, spotNames[0]),
    distanceKm,
    durationMin: actualMin,
    difficulty: estimateDifficulty(distanceKm),
    tags: inferTags(categories),
    description: buildCourseDescription(type, spotNames, actualMin, distanceKm),
    bestTime: COURSE_BEST_TIME[type],
    checkpoints,
    routeGeoJson: geometry,
  };
}

// ─────────────────────────────────────────────────────
// ⑨ メインエクスポート
// ─────────────────────────────────────────────────────

const COURSE_TYPES: CourseType[] = ["nature", "historical", "town"];

export async function generateCourses(
  spots: SpotInfo[],
  originLat: number,
  originLng: number,
  durationMin: number
): Promise<Course[]> {
  const results = await Promise.allSettled(
    COURSE_TYPES.map((type) => buildOneCourse(type, spots, originLat, originLng, durationMin))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<Course> =>
      r.status === "fulfilled" && r.value !== null
    )
    .map((r) => r.value);
}
