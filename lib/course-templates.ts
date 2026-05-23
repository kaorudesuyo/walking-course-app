import type { CourseType, TagKey, BestTime } from "@/types/course";
import type { SpotCategory } from "./overpass";

const NAME_SUFFIXES: Record<CourseType, string[]> = {
  nature:     ["グリーンウォーク", "自然散策", "緑道コース", "せせらぎコース", "森の小道"],
  historical: ["歴史散策", "史跡めぐり", "古道ウォーク", "時代の道", "社寺めぐり"],
  town:       ["まちあるき", "街道コース", "商店街散歩", "下町散策", "シティウォーク"],
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
    "都市の喧騒を離れ、自然の静けさの中で",
  ],
  historical: [
    "長い歴史が息づく町並みを辿りながら",
    "古来より人々に親しまれてきた土地を歩き",
    "石畳と社殿が織りなす静寂の中で",
    "幾百年の時を経た建造物に触れながら",
  ],
  town: [
    "地域の日常風景と活気ある通りを楽しみながら",
    "個性豊かな店先や路地裏を覗きながら",
    "生活感あふれる街並みと地域文化を感じながら",
    "下町情緒と現代が交差する通りを歩き",
  ],
};

export function buildCourseDescription(type: CourseType, spotNames: string[], durationMin: number, distanceKm: number): string {
  const intro = INTROS[type][Math.floor(Math.random() * INTROS[type].length)];
  const main  = spotNames[0] ?? "この地域";
  const sub   = spotNames.slice(1, 3);
  const subText = sub.length > 0 ? `${sub.join("、")}などを経由します。` : "";
  const timeLabel =
    durationMin <= 20 ? "短時間でも充実した" :
    durationMin <= 40 ? "ちょうど良い距離の" :
    durationMin <= 70 ? "じっくり楽しめる" : "本格的な";
  return `${intro}歩く、${timeLabel}${distanceKm}kmのウォーキングコースです。`
    + `${main}をメインスポットに、${subText}`
    + `所要時間は約${durationMin}分を想定しています。`;
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

export const TYPE_PREFERRED_CATEGORIES: Record<CourseType, SpotCategory[]> = {
  nature:     ["park", "nature", "river", "viewpoint"],
  historical: ["shrine", "temple", "historical", "viewpoint"],
  town:       ["attraction", "viewpoint", "park"],
};
