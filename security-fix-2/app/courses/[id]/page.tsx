"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Course } from "@/types/course";
import { TAG_LABELS, DIFFICULTY_LABELS, BEST_TIME_LABELS } from "@/types/course";
import { validateCourse } from "@/lib/course-validator";
import CheckpointList from "@/components/CheckpointList";
import MapAppButtons from "@/components/MapAppButtons";
import ShareButton from "@/components/ShareButton";
import CourseMap from "@/components/CourseMap";
import CalorieDisplay from "@/components/CalorieDisplay";
const TYPE_LABEL: Record<string,string> = { nature:"Nature", historical:"Historical", town:"Town" };
export default function CourseDetailPage() {
  const searchParams = useSearchParams();
  const [course, setCourse] = useState<Course|null>(null);
  const [error, setError]   = useState("");
  useEffect(() => {
    const raw = searchParams.get("data");
    if (!raw) { setError("コースデータが見つかりません"); return; }
    // セキュリティ: パース前にサイズ上限を確認（巨大JSONによるDoS対策）
    // 正当なコースデータ（最大12チェックポイント）は16KBを超えない
    if (raw.length > 16000) { setError("コースデータが大きすぎます"); return; }
    try {
      // 1) URIデコード（不正なエンコードは例外になる）
      const decoded = decodeURIComponent(raw);
      // 2) JSONパース
      const parsed: unknown = JSON.parse(decoded);
      // 3) スキーマ検証（型・範囲・長さ・ホワイトリスト）— 不正データは拒否
      const validated = validateCourse(parsed);
      if (!validated) { setError("コースデータが不正です"); return; }
      setCourse(validated);
    } catch {
      setError("コースデータの読み込みに失敗しました");
    }
  }, [searchParams]);
  if (error) return (
    <main style={{minHeight:"100dvh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg)"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontFamily:"'Jost',sans-serif",fontSize:"0.72rem",color:"rgba(255,120,120,0.9)",marginBottom:24}}>{error}</div>
        <Link href="/" className="btn btn-outline" style={{padding:"12px 28px"}}>Back to Home</Link>
      </div>
    </main>
  );
  if (!course) return (
    <main style={{minHeight:"100dvh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg)"}}>
      <div style={{width:32,height:32,border:"1px solid var(--border)",borderTopColor:"rgba(255,255,255,0.6)",borderRadius:"50%",animation:"spin 1.2s linear infinite"}}/>
    </main>
  );
  return (
    <main style={{minHeight:"100dvh",background:"var(--bg)"}}>
      <div style={{height:36,borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontFamily:"'Jost',sans-serif",fontSize:"0.65rem",letterSpacing:"0.28em",color:"var(--muted)",textTransform:"uppercase"}}>Walking Course</span>
      </div>
      <header style={{position:"sticky",top:36,zIndex:100,background:"rgba(10,10,10,0.92)",backdropFilter:"blur(16px)",borderBottom:"1px solid var(--border)",padding:"0 clamp(1.2rem,5vw,4rem)",height:60,display:"flex",alignItems:"center",gap:24}}>
        <Link href="/" className="btn btn-ghost">← Back</Link>
        <div style={{height:20,width:1,background:"var(--border)"}}/>
        <span style={{fontFamily:"'Jost',sans-serif",fontSize:"0.68rem",color:"var(--muted)",letterSpacing:"0.25em",textTransform:"uppercase"}}>{TYPE_LABEL[course.type]}</span>
      </header>
      <div style={{maxWidth:800,margin:"0 auto",padding:"clamp(2.5rem,6vw,5rem) clamp(1.2rem,5vw,4rem) 80px"}}>
        <div className="anim-fade-up" style={{marginBottom:48}}>
          <div className="section-label" style={{marginBottom:12}}>{TYPE_LABEL[course.type]}</div>
          <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(1.8rem,5vw,3rem)",fontWeight:300,letterSpacing:"0.02em",color:"var(--white)",marginBottom:24,lineHeight:1.15}}>{course.name}</h1>
          <div style={{width:40,height:1,background:"rgba(255,255,255,0.3)",marginBottom:28}}/>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:1,border:"1px solid var(--border)",marginBottom:24}}>
            {[{val:course.distanceKm,unit:"km",lbl:"距離"},{val:course.durationMin,unit:"min",lbl:"所要時間"},{val:DIFFICULTY_LABELS[course.difficulty],unit:"",lbl:"難易度"}].map(({val,unit,lbl})=>(
              <div key={lbl} className="surface" style={{padding:"20px"}}>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1.8rem",fontWeight:300,color:"var(--white)"}}>
                  {val}<span style={{fontSize:"0.72rem",marginLeft:4,color:"var(--muted)",fontFamily:"'Jost',sans-serif"}}>{unit}</span>
                </div>
                <div className="label" style={{marginTop:4}}>{lbl}</div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
            {course.tags.map(tag=><span key={tag} className="tag">{TAG_LABELS[tag]??tag}</span>)}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <span className="label">おすすめ時間帯</span>
            {course.bestTime.map(t=><span key={t} style={{fontFamily:"'Jost',sans-serif",fontSize:"0.68rem",color:"var(--muted)",letterSpacing:"0.1em"}}>{BEST_TIME_LABELS[t]}</span>)}
          </div>
        </div>
        <div className="anim-fade-up anim-delay-1" style={{marginBottom:40}}>
          <CalorieDisplay distanceKm={course.distanceKm} durationMin={course.durationMin}/>
        </div>
        <hr className="divider" style={{marginBottom:40}}/>
        <div className="anim-fade-up anim-delay-1" style={{marginBottom:40}}>
          <div className="section-label" style={{marginBottom:16}}>Map</div>
          <CourseMap course={course}/>
        </div>
        <hr className="divider" style={{marginBottom:40}}/>
        <div className="anim-fade-up anim-delay-1" style={{marginBottom:40}}>
          <div className="section-label" style={{marginBottom:16}}>About This Course</div>
          <p style={{fontFamily:"'Noto Serif JP',serif",fontSize:"0.9rem",color:"var(--muted)",lineHeight:2.1,fontWeight:300}}>{course.description}</p>
        </div>
        <hr className="divider" style={{marginBottom:40}}/>
        <div className="anim-fade-up anim-delay-2" style={{marginBottom:40}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:24}}>
            <span className="section-label" style={{marginBottom:0}}>Checkpoints</span>
            <span style={{fontFamily:"'Jost',sans-serif",fontSize:"0.65rem",color:"var(--muted)",letterSpacing:"0.15em"}}>{course.checkpoints.length} stops</span>
          </div>
          <CheckpointList checkpoints={course.checkpoints}/>
        </div>
        <hr className="divider" style={{marginBottom:40}}/>
        <div className="anim-fade-up anim-delay-2" style={{marginBottom:24}}>
          <div className="section-label" style={{marginBottom:16}}>Navigate</div>
          <p style={{fontFamily:"'Noto Serif JP',serif",fontSize:"0.82rem",color:"var(--muted)",marginBottom:20,lineHeight:1.9,fontWeight:300}}>使い慣れた地図アプリでナビを開始できます。</p>
          <MapAppButtons checkpoints={course.checkpoints}/>
        </div>
        <ShareButton title={course.name} text={`${course.name}（${course.distanceKm}km / ${course.durationMin}分）`}/>
        <div style={{textAlign:"center",fontFamily:"'Jost',sans-serif",fontSize:"0.6rem",color:"rgba(255,255,255,0.12)",marginTop:48,letterSpacing:"0.18em",textTransform:"uppercase"}}>Data © OpenStreetMap Contributors</div>
      </div>
      <div style={{height:52,borderTop:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontFamily:"'Jost',sans-serif",fontSize:"0.62rem",letterSpacing:"0.22em",color:"var(--muted)",textTransform:"uppercase"}}>©2026 Kaoru Furubayashi</span>
      </div>
    </main>
  );
}
