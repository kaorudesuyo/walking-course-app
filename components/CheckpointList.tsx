import type { Checkpoint } from "@/types/course";

export default function CheckpointList({ checkpoints }: { checkpoints: Checkpoint[] }) {
  return (
    <div>
      {checkpoints.map((cp, i) => {
        const isStart = cp.isStart || i === 0;
        const isGoal  = cp.isGoal  || i === checkpoints.length - 1;
        return (
          <div key={cp.order} style={{ display: "flex", gap: 18, paddingBottom: 18 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div style={{
                width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.62rem", fontFamily: "'Jost', sans-serif", fontWeight: 400, letterSpacing: "0.05em",
                background: isStart || isGoal ? "var(--white)" : "transparent",
                color: isStart || isGoal ? "var(--bg)" : "var(--muted)",
                border: `1px solid ${isStart || isGoal ? "var(--white)" : "var(--border)"}`,
                flexShrink: 0,
              }}>
                {isStart ? "S" : isGoal ? "G" : i}
              </div>
              {i < checkpoints.length - 1 && (
                <div style={{ width: 1, flex: 1, minHeight: 14, background: "var(--border)", marginTop: 6 }} />
              )}
            </div>
            <div style={{ paddingTop: 3, paddingBottom: 4 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1rem", fontWeight: 300, color: "var(--white)", letterSpacing: "0.03em" }}>
                {cp.name}
              </div>
              {cp.description && (
                <div style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.65rem", color: "var(--muted)", marginTop: 3, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  {cp.description}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
