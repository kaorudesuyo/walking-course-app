"use client";
import { useEffect, useState } from "react";

/**
 * 起動時スプラッシュ演出（X風）— 周游 SYUYU
 *
 * 演出シーケンス（合計 約2.4秒）:
 *   0.0s  黒背景の中央に小さくアイコン表示
 *   0.06s アイコンが「こちらに向かってくる」ように拡大（scale 0.4 → 1.0）
 *         同時に下部へブランド名「周游 / SYUYU」がフェードイン
 *   1.5s  アイコンが画面いっぱいまで拡大しフェードアウト、ブランド名も消える
 *   2.1s  スプラッシュ全体がフェードアウトし、アプリ本体が現れる
 *
 * sessionStorage で「同一セッションでは初回のみ表示」に制御。
 */
export default function SplashScreen() {
  const [phase, setPhase] = useState<"hidden" | "enter" | "zoom" | "done">("hidden");

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("splashShown") === "1") {
      setPhase("done");
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      sessionStorage.setItem("splashShown", "1");
      setPhase("done");
      return;
    }
    sessionStorage.setItem("splashShown", "1");
    const t1 = setTimeout(() => setPhase("enter"), 60);
    const t2 = setTimeout(() => setPhase("zoom"), 1500);
    const t3 = setTimeout(() => setPhase("done"), 2300);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  if (phase === "done") return null;

  const iconTransform =
    phase === "hidden" ? "scale(0.4)" :
    phase === "enter"  ? "scale(1)" :
                          "scale(8)";
  const iconOpacity = phase === "zoom" ? 0 : 1;
  const overlayOpacity = phase === "zoom" ? 0 : 1;
  // ブランド名は enter フェーズで出現、zoom で消える
  const brandOpacity = phase === "enter" ? 1 : 0;
  const brandTransform = phase === "enter" ? "translateY(0)" : "translateY(8px)";

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed", inset: 0, zIndex: 9999, background: "#0a0a0a",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        opacity: overlayOpacity,
        transition: "opacity 0.6s ease 0.15s",
        pointerEvents: phase === "zoom" ? "none" : "auto",
      }}
    >
      {/* アイコン */}
      <div
        style={{
          width: 96, height: 96,
          transform: iconTransform, opacity: iconOpacity,
          transition:
            phase === "enter"
              ? "transform 1.1s cubic-bezier(0.22, 1, 0.36, 1)"
              : phase === "zoom"
              ? "transform 0.8s cubic-bezier(0.7, 0, 0.84, 0), opacity 0.7s ease"
              : "none",
          willChange: "transform, opacity",
        }}
      >
        <svg width="96" height="96" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <circle cx="17" cy="49" r="3.2" fill="#f5f5f0" />
          <path d="M17 49 C 26 42, 20 30, 30 25 S 44 20, 46 16"
            fill="none" stroke="#f5f5f0" strokeWidth="2.7" strokeLinecap="round" strokeDasharray="0.1 7.5" />
          <circle cx="47" cy="15" r="4.6" fill="none" stroke="#f5f5f0" strokeWidth="2.3" />
        </svg>
      </div>

      {/* ブランド名 */}
      <div
        style={{
          position: "absolute",
          bottom: "calc(50% - 130px)",
          textAlign: "center",
          opacity: brandOpacity,
          transform: brandTransform,
          transition: "opacity 0.7s ease 0.35s, transform 0.7s ease 0.35s",
        }}
      >
        <div style={{
          fontFamily: "'Noto Serif JP', serif", fontSize: "1.5rem", fontWeight: 300,
          color: "#f5f5f0", letterSpacing: "0.3em", paddingLeft: "0.3em",
        }}>
          周游
        </div>
        <div style={{
          fontFamily: "'Jost', sans-serif", fontSize: "0.62rem", fontWeight: 400,
          color: "rgba(245,245,240,0.55)", letterSpacing: "0.45em", paddingLeft: "0.45em", marginTop: 8,
        }}>
          SYUYU
        </div>
      </div>
    </div>
  );
}
