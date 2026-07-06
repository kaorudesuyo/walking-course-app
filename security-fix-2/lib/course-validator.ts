// ============================================================
// コースデータの厳格なスキーマ検証
// 共有URL (?data=...) から受け取ったJSONは攻撃者が自由に細工できるため、
// 全フィールドの型・範囲・長さを検証し、ホワイトリスト外の値を拒否する。
// 未知のフィールドは捨てて新しいオブジェクトを構築する（プロトタイプ汚染対策）。
// ============================================================

import type { Course, Checkpoint, CourseType, Difficulty, BestTime, TagKey } from "@/types/course";

const COURSE_TYPES: CourseType[] = ["nature", "historical", "town"];
const DIFFICULTIES: Difficulty[] = ["flat", "moderate", "hilly"];
const BEST_TIMES: BestTime[] = ["morning", "afternoon", "evening", "night"];
const TAG_KEYS: TagKey[] = [
  "nature", "seasonal", "birds", "historical", "shrine", "temple",
  "river", "sea", "viewpoint", "town", "cafe", "shopping", "park", "forest",
];

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function validLat(v: unknown): v is number {
  return isFiniteNumber(v) && v >= -90 && v <= 90;
}

function validLng(v: unknown): v is number {
  return isFiniteNumber(v) && v >= -180 && v <= 180;
}

/** 文字列検証: 型チェック + 長さ制限（超過分は切り捨て） */
function cleanString(v: unknown, maxLen: number): string | null {
  if (typeof v !== "string" || v.length === 0) return null;
  return v.slice(0, maxLen);
}

function validateCheckpoint(raw: unknown, index: number): Checkpoint | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;

  if (!validLat(r.lat) || !validLng(r.lng)) return null;
  const name = cleanString(r.name, 100);
  if (!name) return null;

  // 未知フィールドを捨てて安全なオブジェクトを新規構築
  return {
    order: isFiniteNumber(r.order) ? Math.round(r.order) : index + 1,
    name,
    lat: r.lat,
    lng: r.lng,
    description: cleanString(r.description, 100) ?? undefined,
    isStart: r.isStart === true,
    isGoal: r.isGoal === true,
    osmId: cleanString(r.osmId, 60) ?? undefined,
  };
}

/**
 * 共有URLから受け取ったコースデータを検証する。
 * 検証に失敗した場合は null を返す（呼び出し側でエラー表示）。
 */
export function validateCourse(raw: unknown): Course | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;

  // 必須フィールドの型・値検証
  const id = cleanString(r.id, 50);
  const name = cleanString(r.name, 80);
  const description = cleanString(r.description, 600);
  if (!id || !name || !description) return null;

  if (!COURSE_TYPES.includes(r.type as CourseType)) return null;
  if (!DIFFICULTIES.includes(r.difficulty as Difficulty)) return null;

  if (!isFiniteNumber(r.distanceKm) || r.distanceKm < 0 || r.distanceKm > 100) return null;
  if (!isFiniteNumber(r.durationMin) || r.durationMin < 1 || r.durationMin > 1000) return null;

  // タグ: ホワイトリスト検証、最大6個
  if (!Array.isArray(r.tags)) return null;
  const tags = r.tags.filter((t): t is TagKey => TAG_KEYS.includes(t as TagKey)).slice(0, 6);

  // おすすめ時間帯: ホワイトリスト検証
  if (!Array.isArray(r.bestTime)) return null;
  const bestTime = r.bestTime.filter((t): t is BestTime => BEST_TIMES.includes(t as BestTime)).slice(0, 4);

  // チェックポイント: 2〜12個、各要素を検証
  if (!Array.isArray(r.checkpoints)) return null;
  if (r.checkpoints.length < 2 || r.checkpoints.length > 12) return null;
  const checkpoints: Checkpoint[] = [];
  for (let i = 0; i < r.checkpoints.length; i++) {
    const cp = validateCheckpoint(r.checkpoints[i], i);
    if (!cp) return null;
    checkpoints.push(cp);
  }

  // routeGeoJson は現在の表示（Googleマップiframe）で未使用のため
  // 攻撃対象領域を減らす目的で破棄する
  return {
    id, name, description, tags, bestTime, checkpoints,
    type: r.type as CourseType,
    difficulty: r.difficulty as Difficulty,
    distanceKm: r.distanceKm,
    durationMin: Math.round(r.durationMin),
  };
}
