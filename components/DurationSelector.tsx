"use client";
import { durationToDistance } from "@/lib/utils";

const DURATIONS = [15, 30, 45, 60, 75, 90, 105, 120];

interface Props { value: number; onChange: (v: number) => void; }

export default function DurationSelector({ value, onChange }: Props) {
  const dist = durationToDistance(value);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <span className="label">Duration</span>
        <span style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.68rem", color: "var(--muted)", letterSpacing: "0.1em" }}>
          ~{dist} km
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, border: "1px solid var(--border)" }}>
        {DURATIONS.map((d) => (
          <button
            key={d}
            onClick={() => onChange(d)}
            className="btn"
            style={{
              padding: "11px 4px",
              fontSize: "0.72rem",
              fontFamily: "'Jost', sans-serif",
              letterSpacing: "0.12em",
              background: value === d ? "var(--white)" : "var(--accent)",
              color: value === d ? "var(--bg)" : "var(--muted)",
              borderRight: "1px solid var(--border)",
              borderBottom: "1px solid var(--border)",
              transition: "all 0.2s ease",
            }}
          >
            {d}<span style={{ fontSize: "0.55rem", marginLeft: 2, opacity: 0.7 }}>m</span>
          </button>
        ))}
      </div>
    </div>
  );
}
