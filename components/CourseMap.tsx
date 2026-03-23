"use client";

import { useMemo } from "react";
import type { Course } from "@/types/course";

interface Props {
  course: Course;
}

/**
 * Google Maps Embed でルートを表示する。
 *
 * Google Maps Embed API の directions モードを使用:
 * https://www.google.com/maps/embed/v1/directions
 *   - APIキー不要の代替: maps.google.com/maps?... をiframeで表示
 *
 * ループルート: origin = destination = 出発地、waypoints = 中間スポット
 */
export default function CourseMap({ course }: Props) {
  const iframeSrc = useMemo(() => {
    const cps = course.checkpoints;
    if (cps.length < 2) return null;

    // origin = 出発地 (index 0)
    // destination = 出発地に戻る (最後、index n)
    // waypoints = 中間スポット (index 1 〜 n-1)
    const origin = `${cps[0].lat},${cps[0].lng}`;
    const middle = cps.slice(1, -1);

    // Google Maps の埋め込みURLを構築
    // maps.google.com/maps?saddr=...&daddr=...&waypoints=...&output=embed
    let url = `https://www.google.com/maps/dir/?api=1`
      + `&origin=${encodeURIComponent(origin)}`
      + `&destination=${encodeURIComponent(origin)}`  // ループ: 出発地に戻る
      + `&travelmode=walking`;

    if (middle.length > 0) {
      const waypointsStr = middle.map((c) => `${c.lat},${c.lng}`).join("%7C");
      url += `&waypoints=${waypointsStr}`;
    }

    // iframe表示用: /dir/ の代わりに embed 向けのURLに変換
    // Google Maps の埋め込みは以下の形式で動作する
    const embedUrl = `https://maps.google.com/maps?`
      + `saddr=${encodeURIComponent(origin)}`
      + `&daddr=${encodeURIComponent(
          middle.length > 0
            ? middle.map((c) => `${c.lat},${c.lng}`).join(" to:")
            + ` to:${origin}`
            : origin
        )}`
      + `&dirflg=w`        // 徒歩モード
      + `&output=embed`    // 埋め込み表示
      + `&t=m`             // マップタイプ: 標準
      + `&z=15`;           // ズームレベル

    return embedUrl;
  }, [course.checkpoints, course.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!iframeSrc) {
    return (
      <div style={{
        width: "100%", height: 320,
        background: "var(--dim)", border: "1px solid var(--border)",
        borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--mono)", fontSize: 11, color: "var(--subtle)",
      }}>
        MAP UNAVAILABLE
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: 320, borderRadius: 2, overflow: "hidden", border: "1px solid var(--border)" }}>
      <iframe
        src={iframeSrc}
        width="100%"
        height="100%"
        style={{ border: 0, display: "block" }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={`${course.name} のルートマップ`}
      />
    </div>
  );
}
