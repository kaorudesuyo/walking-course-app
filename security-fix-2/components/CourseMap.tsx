"use client";
import { useMemo } from "react";
import type { Course } from "@/types/course";

export default function CourseMap({ course }: { course: Course }) {
  const iframeSrc = useMemo(() => {
    // セキュリティ: 座標を数値に強制変換・範囲検証してからURLを構築する。
    // toFixed(6) により出力は数値とカンマのみとなり、URLパラメータ注入が不可能。
    const pts = course.checkpoints
      .map(c => ({ lat: Number(c.lat), lng: Number(c.lng) }))
      .filter(c =>
        Number.isFinite(c.lat) && Number.isFinite(c.lng) &&
        Math.abs(c.lat) <= 90 && Math.abs(c.lng) <= 180
      );
    if (pts.length < 2) return null;
    const origin = `${pts[0].lat.toFixed(6)},${pts[0].lng.toFixed(6)}`;
    const middle = pts.slice(1, -1);
    const daddr = middle.length > 0
      ? middle.map(c => `${c.lat.toFixed(6)},${c.lng.toFixed(6)}`).join(" to:") + " to:" + origin
      : origin;
    return `https://maps.google.com/maps?saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(daddr)}&dirflg=w&output=embed&t=m&z=15`;
  }, [course.checkpoints]);

  if (!iframeSrc) return (
    <div style={{width:"100%",height:320,background:"var(--accent)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Jost',sans-serif",fontSize:11,color:"var(--muted)",letterSpacing:"0.1em"}}>MAP UNAVAILABLE</div>
  );
  return (
    <div style={{width:"100%",height:320,overflow:"hidden",border:"1px solid var(--border)"}}>
      <iframe src={iframeSrc} width="100%" height="100%" style={{border:0,display:"block"}} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" sandbox="allow-scripts allow-same-origin allow-popups" title={`${course.name} ルートマップ`}/>
    </div>
  );
}
