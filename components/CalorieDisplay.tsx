"use client";

import { useState } from "react";
import { calcCalories, distanceToSteps } from "@/lib/utils";

interface Props {
  distanceKm: number;
  durationMin: number;
}

export default function CalorieDisplay({ distanceKm, durationMin }: Props) {
  const [weight, setWeight] = useState(60);
  const [editing, setEditing] = useState(false);

  const calories = calcCalories(distanceKm, weight);
  const steps    = distanceToSteps(distanceKm);

  // カロリーの目安コメント
  const comment =
    calories < 50  ? "おにぎり約0.3個分" :
    calories < 100 ? `おにぎり約${(calories / 170).toFixed(1)}個分` :
    calories < 200 ? `ショートケーキ約${(calories / 330).toFixed(1)}個分` :
    calories < 300 ? `ラーメン約${(calories / 450).toFixed(1)}杯分` :
                     `ラーメン約${(calories / 450).toFixed(1)}杯分`;

  return (
    <div className="surface" style={{ padding: "20px 24px" }}>
      <div className="label" style={{ marginBottom: 16 }}>Calories & Steps</div>

      {/* メトリクス */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, marginBottom: 16, border: "1px solid var(--border)" }}>
        {/* カロリー */}
        <div style={{ padding: "16px", borderRight: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2rem", fontWeight: 300, color: "var(--white)", letterSpacing: "0.02em", lineHeight: 1 }}>
            {calories}
            <span style={{ fontSize: "0.72rem", marginLeft: 4, color: "var(--muted)", fontFamily: "'Jost', sans-serif", letterSpacing: "0.1em" }}>kcal</span>
          </div>
          <div className="label" style={{ marginTop: 6 }}>消費カロリー</div>
        </div>

        {/* 歩数 */}
        <div style={{ padding: "16px" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2rem", fontWeight: 300, color: "var(--white)", letterSpacing: "0.02em", lineHeight: 1 }}>
            {steps.toLocaleString()}
            <span style={{ fontSize: "0.72rem", marginLeft: 4, color: "var(--muted)", fontFamily: "'Jost', sans-serif", letterSpacing: "0.1em" }}>歩</span>
          </div>
          <div className="label" style={{ marginTop: 6 }}>推定歩数</div>
        </div>
      </div>

      {/* カロリー目安 */}
      <div style={{
        fontFamily: "'Noto Serif JP', serif", fontSize: "0.75rem",
        color: "var(--muted)", marginBottom: 16, lineHeight: 1.7,
      }}>
        ≒ {comment}に相当する消費カロリー
      </div>

      {/* 体重設定 */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
        <span className="label" style={{ flexShrink: 0 }}>体重（任意）</span>
        {editing ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
            <input
              type="number"
              min={30} max={200}
              value={weight}
              onChange={(e) => setWeight(Math.max(30, Math.min(200, Number(e.target.value))))}
              className="input"
              style={{ padding: "6px 10px", fontSize: "0.82rem", width: 80, textAlign: "right" }}
              autoFocus
            />
            <span style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.65rem", color: "var(--muted)" }}>kg</span>
            <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: "0.62rem" }}
              onClick={() => setEditing(false)}>確定</button>
          </div>
        ) : (
          <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: "0.65rem", letterSpacing: "0.1em" }}
            onClick={() => setEditing(true)}>
            {weight} kg で計算中（変更）
          </button>
        )}
      </div>
    </div>
  );
}
