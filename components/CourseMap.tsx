"use client";
import { useMemo } from "react";
import type { Course } from "@/types/course";
export default function CourseMap({ course }: { course: Course }) {
  const iframeSrc = useMemo(() => {
    const cps = course.checkpoints;
    if (cps.length < 2) return null;
    const origin = `${cps[0].lat},${cps[0].lng}`;
    const middle = cps.slice(1,-1);
    const embedUrl = `https://maps.google.com/maps?saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(middle.length>0?middle.map(c=>`${c.lat},${c.lng}`).join(" to:")+" to:"+origin:origin)}&dirflg=w&output=embed&t=m&z=15`;
    return embedUrl;
  }, [course.checkpoints]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!iframeSrc) return (
    <div style={{width:"100%",height:320,background:"var(--accent)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Jost',sans-serif",fontSize:11,color:"var(--muted)",letterSpacing:"0.1em"}}>MAP UNAVAILABLE</div>
  );
  return (
    <div style={{width:"100%",height:320,overflow:"hidden",border:"1px solid var(--border)"}}>
      <iframe src={iframeSrc} width="100%" height="100%" style={{border:0,display:"block"}} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title={`${course.name} ルートマップ`}/>
    </div>
  );
}
