import type { Course } from "@/types/course";
import { TAG_LABELS, DIFFICULTY_LABELS } from "@/types/course";
import Link from "next/link";
const TYPE_LABEL: Record<string,string> = { nature:"Nature", historical:"Historical", town:"Town" };
export default function CourseCard({ course, index }: { course: Course; index: number }) {
  return (
    <Link href={`/courses/${course.id}?data=${encodeURIComponent(JSON.stringify(course))}`}
      style={{display:"block",textDecoration:"none"}} className={`anim-fade-up anim-delay-${Math.min(index+1,3)}`}>
      <div className="surface" style={{padding:"28px 32px",cursor:"pointer",transition:"border-color 0.25s,background 0.25s"}}
        onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.borderColor="rgba(255,255,255,0.3)";(e.currentTarget as HTMLDivElement).style.background="rgba(255,255,255,0.04)";}}
        onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.borderColor="var(--border)";(e.currentTarget as HTMLDivElement).style.background="var(--accent)";}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
          <div>
            <span className="label" style={{display:"block",marginBottom:10}}>{TYPE_LABEL[course.type]}</span>
            <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(1.3rem,3vw,1.7rem)",fontWeight:300,color:"var(--white)",letterSpacing:"0.04em",lineHeight:1.2}}>
              {course.name}
            </h3>
          </div>
          <span style={{color:"var(--muted)",fontSize:"1rem",fontFamily:"'Jost',sans-serif",fontWeight:200,marginTop:4}}>→</span>
        </div>
        <div style={{display:"flex",gap:28,marginBottom:20,paddingBottom:20,borderBottom:"1px solid var(--border)"}}>
          {[{val:course.distanceKm,unit:"km",lbl:"距離"},{val:course.durationMin,unit:"min",lbl:"所要時間"},{val:DIFFICULTY_LABELS[course.difficulty].replace(/★+\s*/,""),unit:"",lbl:"難易度"}].map(({val,unit,lbl})=>(
            <div key={lbl}>
              <div style={{fontFamily:"'Jost',sans-serif",fontSize:"1.1rem",fontWeight:300,color:"var(--white)"}}>
                {val}<span style={{fontSize:"0.62rem",marginLeft:3,color:"var(--muted)",letterSpacing:"0.1em"}}>{unit}</span>
              </div>
              <div className="label" style={{marginTop:2}}>{lbl}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
          {course.tags.map(tag=><span key={tag} className="tag">{TAG_LABELS[tag]?.replace(/^.+? /,"")??tag}</span>)}
        </div>
        <p style={{fontFamily:"'Noto Serif JP',serif",fontSize:"0.82rem",color:"var(--muted)",lineHeight:1.9,margin:0,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>
          {course.description}
        </p>
      </div>
    </Link>
  );
}
