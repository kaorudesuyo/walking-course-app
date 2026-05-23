"use client";
import { useEffect, useState } from "react";
import { buildGoogleMapsUrl, buildAppleMapsUrl, isIOS } from "@/lib/utils";
import type { Checkpoint } from "@/types/course";
export default function MapAppButtons({ checkpoints }: { checkpoints: Checkpoint[] }) {
  const [showApple, setShowApple] = useState(false);
  useEffect(() => { setShowApple(isIOS()); }, []);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      <a href={buildGoogleMapsUrl(checkpoints)} target="_blank" rel="noopener noreferrer" className="btn btn-white" style={{width:"100%",padding:"16px 32px"}}>Google マップで開く</a>
      {showApple&&<a href={buildAppleMapsUrl(checkpoints)} className="btn btn-outline" style={{width:"100%",padding:"15px 32px"}}>Apple マップで開く</a>}
    </div>
  );
}
