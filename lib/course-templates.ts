import type { CourseType, TagKey, BestTime } from "@/types/course";
import type { SpotCategory } from "./overpass";

// ============================================================
// コースのコンセプト定義
// 3コースが明確に異なる体験になるよう、名称・文体・推しカテゴリを
// タイプごとにはっきり分ける。
//   nature     = 「緑と静けさ」   … 公園・水辺・自然を巡るリフレッシュ系
//   historical = 「時間の旅」     … 神社仏閣・史跡を巡る文化探訪系
//   town       = 「街の発見」     … 観光スポット・街並みを巡る散策系
// ============================================================

const NAME_SUFFIXES: Record<CourseType, string[]> = {
  nature:     ["グリーンループ", "自然周回コース", "緑の周遊路", "せせらぎ周回", "森と水辺めぐり"],
  historical: ["歴史周遊コース", "社寺めぐりループ", "時の周回路", "史跡周遊", "古の道めぐり"],
  town:       ["まちなか周遊", "街の発見ループ", "シティ周回コース", "街角めぐり", "下町周遊路"],
};

export function buildCourseName(type: CourseType, mainSpotName: string): string {
  const suffixes = NAME_SUFFIXES[type];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  const short = mainSpotName.length > 10 ? mainSpotName.slice(0, 10) : mainSpotName;
  return `${short} ${suffix}`;
}

const INTROS: Record<CourseType, string[]> = {
  nature: [
    "木漏れ日と鳥のさえずりに包まれながら",
    "緑豊かな自然の息吹を感じながら",
    "四季折々の植生が彩る路を歩きながら",
    "都市の喧騒を離れ、水辺と緑の静けさの中で",
  ],
  historical: [
    "長い歴史が息づく社寺や史跡を辿りながら",
    "古来より人々に親しまれてきた祈りの場を巡り",
    "石畳と社殿が織りなす静寂の中で",
    "幾百年の時を経た土地の記憶に触れながら",
  ],
  town: [
    "地域の日常風景と活気ある通りを楽しみながら",
    "個性豊かな店先や路地裏の発見を重ねながら",
    "生活感あふれる街並みと地域文化を感じながら",
    "この街ならではの表情を一つずつ見つけながら",
  ],
};

const CONCEPT_LABEL: Record<CourseType, string> = {
  nature:     "自然と水辺を巡るリフレッシュ周回コース",
  historical: "社寺・史跡を巡る歴史探訪の周回コース",
  town:       "街の見どころを巡る発見の周回コース",
};

export function buildCourseDescription(
  type: CourseType, spotNames: string[], durationMin: number, distanceKm: number
): string {
  const intro = INTROS[type][Math.floor(Math.random() * INTROS[type].length)];
  const main  = spotNames[0] ?? "この地域";
  const sub   = spotNames.slice(1, 3);
  const subText = sub.length > 0 ? `${sub.join("、")}などを経由し、` : "";
  const timeLabel =
    durationMin <= 20 ? "短時間でも充実した" :
    durationMin <= 40 ? "ちょうど良い距離の" :
    durationMin <= 70 ? "じっくり楽しめる" : "本格的な";
  return `【${CONCEPT_LABEL[type]}】`
    + `${intro}歩く、${timeLabel}約${distanceKm}kmのコースです。`
    + `${main}を目玉に、${subText}同じ道を折り返さずぐるりと一周して出発地点に戻ります。`
    + `所要時間は約${durationMin}分の想定です。`;
}

export const CATEGORY_TO_TAGS: Record<SpotCategory, TagKey[]> = {
  park: ["park", "nature"], shrine: ["shrine", "historical"],
  temple: ["temple", "historical"], historical: ["historical"],
  viewpoint: ["viewpoint", "nature"], river: ["river", "nature"],
  nature: ["nature", "forest"], attraction: ["town"],
};

export function inferTags(categories: SpotCategory[]): TagKey[] {
  const tagSet = new Set<TagKey>();
  for (const cat of categories) {
    for (const tag of CATEGORY_TO_TAGS[cat] ?? []) tagSet.add(tag);
  }
  return Array.from(tagSet).slice(0, 4);
}

export const COURSE_BEST_TIME: Record<CourseType, BestTime[]> = {
  nature: ["morning", "afternoon"],
  historical: ["morning", "afternoon", "evening"],
  town: ["afternoon", "evening"],
};

export const CATEGORY_WEIGHT: Record<SpotCategory, number> = {
  park: 10, viewpoint: 9, shrine: 8, temple: 8,
  nature: 7, river: 7, historical: 6, attraction: 5,
};

// コンセプト差別化の要: タイプごとの推しカテゴリを明確に分ける
export const TYPE_PREFERRED_CATEGORIES: Record<CourseType, SpotCategory[]> = {
  nature:     ["park", "nature", "river", "viewpoint"],
  historical: ["shrine", "temple", "historical"],
  town:       ["attraction", "viewpoint"],
};
