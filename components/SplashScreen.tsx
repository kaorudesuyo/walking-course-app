"use client";
import { useEffect, useState } from "react";

/**
 * 起動時スプラッシュ演出（X風）
 *
 * 演出シーケンス（合計 約2.2秒）:
 *   0.0s  黒背景の中央に小さくアイコン表示
 *   0.2s  アイコンが「こちらに向かってくる」ように拡大（scale 0.4 → 1.0）
 *   1.3s  さらに画面いっぱいまで拡大しながらフェードアウト（scale 1.0 → 8.0）
 *   1.9s  スプラッシュ全体がフェードアウトし、アプリ本体が現れる
 *
 * sessionStorage で「同一セッションでは初回のみ表示」に制御。
 * ページ遷移のたびに再生されると煩わしいため。
 */
export default function SplashScreen() {
  const [phase, setPhase] = useState<"hidden" | "enter" | "zoom" | "done">("hidden");

  useEffect(() => {
    // 同一セッションで再訪した場合はスキップ
    if (typeof window !== "undefined" && sessionStorage.getItem("splashShown") === "1") {
      setPhase("done");
      return;
    }

    // prefers-reduced-motion: アニメーションを控える設定なら即スキップ
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      sessionStorage.setItem("splashShown", "1");
      setPhase("done");
      return;
    }

    sessionStorage.setItem("splashShown", "1");

    // フェーズを時間差で進める
    const t1 = setTimeout(() => setPhase("enter"), 60);    // 出現→拡大開始
    const t2 = setTimeout(() => setPhase("zoom"), 1300);   // 手前へ突き抜ける拡大
    const t3 = setTimeout(() => setPhase("done"), 2100);   // 消えてアプリ表示

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  if (phase === "done") return null;

  // フェーズごとのアイコン変形
  const iconTransform =
    phase === "hidden" ? "scale(0.4)" :
    phase === "enter"  ? "scale(1)" :
                          "scale(8)";  // zoom
  const iconOpacity = phase === "zoom" ? 0 : 1;
  const overlayOpacity = phase === "zoom" ? 0 : 1;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: overlayOpacity,
        transition: "opacity 0.6s ease 0.15s",
        pointerEvents: phase === "zoom" ? "none" : "auto",
      }}
    >
      <div
        style={{
          width: 96,
          height: 96,
          transform: iconTransform,
          opacity: iconOpacity,
          transition:
            phase === "enter"
              ? "transform 1.1s cubic-bezier(0.22, 1, 0.36, 1)"   // ふわっと迫る
              : phase === "zoom"
              ? "transform 0.8s cubic-bezier(0.7, 0, 0.84, 0), opacity 0.7s ease"  // 加速して突き抜ける
              : "none",
          willChange: "transform, opacity",
        }}
      >
        {/* 案3「歩みの軌跡」アイコン（SVGインライン: 拡大しても鮮明） */}
        <svg width="96" height="96" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <circle cx="17" cy="49" r="3.2" fill="#f5f5f0" />
          <path
            d="M17 49 C 26 42, 20 30, 30 25 S 44 20, 46 16"
            fill="none"
            stroke="#f5f5f0"
            strokeWidth="2.7"
            strokeLinecap="round"
            strokeDasharray="0.1 7.5"
          />
          <circle cx="47" cy="15" r="4.6" fill="none" stroke="#f5f5f0" strokeWidth="2.3" />
        </svg>
      </div>
    </div>
  );
}
