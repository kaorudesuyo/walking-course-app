"use client";

import { stepsToDistance, distanceToMinutes } from "@/lib/utils";

const STEPS_OPTIONS = [3000, 6000, 9000, 12000, 15000];

interface Props {
  value: number;
  onChange: (steps: number) => void;
}

export default function StepsSelector({ value, onChange }: Props) {
  const dist = stepsToDistance(value);
  const mins = distanceToMinutes(dist);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <span className="label">Target Steps</span>
        <span style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.68rem", color: "var(--muted)", letterSpacing: "0.1em" }}>
          ~{dist} km / ~{mins} min
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 1, border: "1px solid var(--border)" }}>
        {STEPS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onChange(s)}
            className="btn"
            style={{
              padding: "14px 4px",
              flexDirection: "column",
              gap: 3,
              fontFamily: "'Jost', sans-serif",
              letterSpacing: "0.05em",
              background: value === s ? "var(--white)" : "var(--accent)",
              color: value === s ? "var(--bg)" : "var(--muted)",
              borderRight: "1px solid var(--border)",
              borderBottom: "1px solid var(--border)",
              transition: "all 0.2s ease",
            }}
          >
            <span style={{ fontSize: "0.85rem", fontWeight: 400, letterSpacing: "0.02em" }}>
              {(s / 10000).toFixed(1) === "0.3" ? "3K"
               : s >= 10000 ? `${s/10000}万` : `${s/1000}K`}
            </span>
            <span style={{ fontSize: "0.55rem", opacity: 0.7, letterSpacing: "0.08em" }}>steps</span>
          </button>
        ))}
      </div>

      {/* 歩数の目安説明 */}
      <div style={{
        marginTop: 10, padding: "10px 14px",
        border: "1px solid var(--border)",
        background: "var(--accent)",
        fontFamily: "'Jost', sans-serif", fontSize: "0.65rem",
        color: "var(--muted)", letterSpacing: "0.08em", lineHeight: 1.8,
      }}>
        {value === 3000 && "軽い散歩。買い物や短い休憩に最適。"}
        {value === 6000 && "厚生労働省が推奨する健康維持の目安。"}
        {value === 9000 && "生活習慣病予防に効果的な運動量。"}
        {value === 12000 && "積極的な健康づくりに推奨される運動量。"}
        {value === 15000 && "本格ウォーキング。しっかり体を動かしたい方に。"}
      </div>
    </div>
  );
}
