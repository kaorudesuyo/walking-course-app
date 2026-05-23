"use client";
import { useState } from "react";
export default function ShareButton({ title, text, url }: { title: string; text: string; url?: string }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = url??(typeof window!=="undefined"?window.location.href:"");
  async function handleShare() {
    if (navigator.share) { try { await navigator.share({title,text,url:shareUrl}); return; } catch {} }
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  }
  return (
    <button className="btn btn-outline" style={{width:"100%",padding:"15px 32px"}} onClick={handleShare}>
      {copied?"URL をコピーしました":"このコースをシェア"}
    </button>
  );
}
