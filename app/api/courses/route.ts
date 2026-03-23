import { NextRequest, NextResponse } from "next/server";
import { fetchNearbySpots } from "@/lib/overpass";
import { reverseGeocode } from "@/lib/nominatim";
import { generateCourses } from "@/lib/course-generator";
import type { CoursesRequest, CoursesResponse } from "@/types/course";

export async function POST(req: NextRequest) {
  try {
    const body: CoursesRequest = await req.json();
    const { latitude, longitude, duration } = body;

    if (!latitude || !longitude || !duration) {
      return NextResponse.json(
        { error: "latitude, longitude, duration は必須です" },
        { status: 400 }
      );
    }

    if (duration < 15 || duration > 120) {
      return NextResponse.json(
        { error: "duration は 15〜120 分の範囲で指定してください" },
        { status: 400 }
      );
    }

    // 検索半径: 総道路距離の半分を直線換算（迂回係数1.25で割る）
    // = 片道で到達できる最大直線距離
    // 例: 30分 → 総距離2.4km → 片道1.2km → 直線0.96km → 検索960m
    const totalRoadKm = (duration / 60) * 3.87;
    const radiusMeters = Math.round((totalRoadKm / 2 / 1.25) * 1000);

    // 並行してスポット取得 + 地名取得
    const [spots, areaName] = await Promise.all([
      fetchNearbySpots(latitude, longitude, radiusMeters),
      reverseGeocode(latitude, longitude),
    ]);

    if (spots.length < 3) {
      return NextResponse.json(
        { error: "周辺にスポットが見つかりませんでした。別の場所をお試しください。" },
        { status: 422 }
      );
    }

    const courses = await generateCourses(spots, latitude, longitude, duration);

    if (courses.length === 0) {
      return NextResponse.json(
        { error: "コースを生成できませんでした。時間や場所を変えてお試しください。" },
        { status: 422 }
      );
    }

    const response: CoursesResponse = {
      areaName,
      courses,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Course generation error:", error);
    return NextResponse.json(
      { error: "コース生成中にエラーが発生しました。しばらくしてからお試しください。" },
      { status: 500 }
    );
  }
}
