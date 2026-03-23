import type { OsmElement, OverpassResponse } from "@/types/course";

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

// ウォーキング向けスポットのOSMタグ定義
const SPOT_QUERY_FILTERS = `
  node["leisure"="park"](around:{radius},{lat},{lng});
  node["leisure"="garden"](around:{radius},{lat},{lng});
  node["leisure"="nature_reserve"](around:{radius},{lat},{lng});
  node["amenity"="place_of_worship"]["religion"="shinto"](around:{radius},{lat},{lng});
  node["amenity"="place_of_worship"]["religion"="buddhist"](around:{radius},{lat},{lng});
  node["historic"="castle"](around:{radius},{lat},{lng});
  node["historic"="monument"](around:{radius},{lat},{lng});
  node["historic"="memorial"](around:{radius},{lat},{lng});
  node["tourism"="viewpoint"](around:{radius},{lat},{lng});
  node["tourism"="attraction"](around:{radius},{lat},{lng});
  node["natural"="water"]["name"](around:{radius},{lat},{lng});
  node["natural"="peak"](around:{radius},{lat},{lng});
  node["waterway"="river"]["name"](around:{radius},{lat},{lng});
  way["leisure"="park"]["name"](around:{radius},{lat},{lng});
  way["leisure"="garden"]["name"](around:{radius},{lat},{lng});
  way["natural"="water"]["name"](around:{radius},{lat},{lng});
`;

export interface SpotInfo {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: SpotCategory;
  osmTags: Record<string, string>;
}

export type SpotCategory =
  | "park"
  | "shrine"
  | "temple"
  | "historical"
  | "viewpoint"
  | "river"
  | "nature"
  | "attraction";

function classifyCategory(tags: Record<string, string>): SpotCategory {
  if (tags.leisure === "park" || tags.leisure === "garden" || tags.leisure === "nature_reserve") {
    return tags.natural ? "nature" : "park";
  }
  if (tags.amenity === "place_of_worship") {
    if (tags.religion === "shinto") return "shrine";
    if (tags.religion === "buddhist") return "temple";
  }
  if (tags.historic) return "historical";
  if (tags.tourism === "viewpoint") return "viewpoint";
  if (tags.natural === "water" || tags.waterway === "river") return "river";
  if (tags.tourism === "attraction") return "attraction";
  return "nature";
}

function getNameFromTags(tags: Record<string, string>): string | null {
  return tags["name:ja"] || tags.name || null;
}

export async function fetchNearbySpots(
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<SpotInfo[]> {
  const query = `
[out:json][timeout:15];
(
${SPOT_QUERY_FILTERS
  .replace(/{radius}/g, String(radiusMeters))
  .replace(/{lat}/g, String(lat))
  .replace(/{lng}/g, String(lng))}
);
out center 50;
  `.trim();

  const response = await fetch(OVERPASS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(18000),
    next: { revalidate: 3600 }, // 1時間キャッシュ
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  const data: OverpassResponse = await response.json();

  return data.elements
    .filter((el: OsmElement) => {
      const name = getNameFromTags(el.tags ?? {});
      return name && name.length > 0;
    })
    .map((el: OsmElement): SpotInfo => {
      const lat = el.lat ?? el.center?.lat ?? 0;
      const lng = el.lon ?? el.center?.lon ?? 0;
      const tags = el.tags ?? {};
      return {
        id: `${el.type}/${el.id}`,
        name: getNameFromTags(tags)!,
        lat,
        lng,
        category: classifyCategory(tags),
        osmTags: tags,
      };
    })
    .filter((s: SpotInfo) => s.lat !== 0 && s.lng !== 0);
}
