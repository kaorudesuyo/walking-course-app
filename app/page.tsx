"use client";

import { useState } from "react";
import LocationPicker, { type LocationData } from "@/components/LocationPicker";
import DurationSelector from "@/components/DurationSelector";
import StepsSelector from "@/components/StepsSelector";
import CourseCard from "@/components/CourseCard";
import { generateCoursesClient, type GenerateResult } from "@/lib/course-generator-client";
import { stepsToDistance, distanceToMinutes } from "@/lib/utils";

type Step = "input" | "loading" | "results";
type Mode = "time" | "steps";

export default function HomePage() {
  const [step, setStep]       = useState<Step>("input");
  const [mode, setMode]       = useState<Mode>("time");
  const [location, setLocation] = useState<LocationData | null>(null);
  const [duration, setDuration] = useState(30);
  const [targetSteps, setTargetSteps] = useState(6000);
  const [results, setResults] = useState<GenerateResult | null>(null);
  const [error, setError]     = useState("");
  const [loadingMsg, setLoadingMsg] = useState("準備中...");

  const effectiveDuration = mode === "time"
    ? duration
    : distanceToMinutes(stepsToDistance(targetSteps));

  async function handleSearch() {
    if (!location) { setError("出発地点を設定してください"); return; }
    setError(""); setStep("loading"); setLoadingMsg("準備中...");
    try {
      const result = await generateCoursesClient(
        location.lat, location.lng, effectiveDuration,
        (msg) => setLoadingMsg(msg)
      );
      setResults(result);
      setStep("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
      setStep("input");
    }
  }

  /* ── LOADING ── */
  if (step === "loading") {
    return (
      <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg)" }}>
        <div style={{ textAlign: "center", maxWidth: 320 }}>
          <div style={{ width: 1, height: 60, background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.3))", margin: "0 auto 40px" }} />
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", fontWeight: 300, color: "var(--white)", letterSpacing: "0.06em", marginBottom: 12 }}>
            Generating
          </div>
          <div style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.72rem", color: "var(--muted)", letterSpacing: "0.22em", textTransform: "uppercase", animation: "pulse 2.5s ease-in-out infinite", minHeight: "1.4em" }}>
            {loadingMsg}
          </div>
          <div style={{ width: 40, height: 40, border: "1px solid var(--border)", borderTopColor: "rgba(255,255,255,0.6)", borderRadius: "50%", animation: "spin 1.4s linear infinite", margin: "32px auto 0" }} />
          <button className="btn btn-ghost" style={{ marginTop: 40, letterSpacing: "0.22em" }} onClick={() => setStep("input")}>
            Cancel
          </button>
        </div>
      </main>
    );
  }

  /* ── RESULTS ── */
  if (step === "results" && results) {
    return (
      <main style={{ minHeight: "100dvh", background: "var(--bg)" }}>
        <header style={{
          position: "sticky", top: 0, zIndex: 100,
          background: "rgba(10,10,10,0.92)", backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border)",
          padding: "0 clamp(1.2rem,5vw,4rem)",
          height: 60, display: "flex", alignItems: "center", gap: 24,
        }}>
          <button className="btn btn-ghost" onClick={() => setStep("input")}>← Back</button>
          <div style={{ height: 20, width: 1, background: "var(--border)" }} />
          <span style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.68rem", color: "var(--muted)", letterSpacing: "0.25em", textTransform: "uppercase" }}>
            {results.areaName} — {mode === "time" ? `${duration} min` : `${targetSteps.toLocaleString()} steps`}
          </span>
        </header>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "clamp(2rem,5vw,4rem) clamp(1.2rem,5vw,4rem) 80px" }}>
          <div className="section-label" style={{ marginBottom: 8 }}>Walking Courses</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.6rem,4vw,2.4rem)", fontWeight: 300, color: "var(--white)", letterSpacing: "0.04em", marginBottom: 40 }}>
            {results.courses.length} courses found
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--border)" }}>
            {results.courses.map((course, i) => (
              <CourseCard key={course.id} course={course} index={i} />
            ))}
          </div>
          <div style={{ textAlign: "center", fontFamily: "'Jost', sans-serif", fontSize: "0.6rem", color: "rgba(255,255,255,0.15)", marginTop: 40, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Powered by OpenStreetMap
          </div>
        </div>
      </main>
    );
  }

  /* ── INPUT ── */
  return (
    <main style={{ minHeight: "100dvh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 36, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.65rem", letterSpacing: "0.28em", color: "var(--muted)", textTransform: "uppercase" }}>
          Walking Course
        </span>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(2rem,6vw,5rem) clamp(1.2rem,5vw,4rem)" }}>
        <div style={{ width: "100%", maxWidth: 520 }}>
          <div style={{ marginBottom: 48 }}>
            <div className="section-label" style={{ marginBottom: 16 }}>01 — Route Planner</div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(2rem,6vw,3.2rem)", fontWeight: 300, letterSpacing: "0.02em", lineHeight: 1.1, color: "var(--white)", marginBottom: 20 }}>
              Find Your Walk
            </h1>
            <div style={{ width: 40, height: 1, background: "rgba(255,255,255,0.3)", marginBottom: 20 }} />
            <p style={{ fontFamily: "'Noto Serif JP', serif", fontSize: "0.88rem", color: "var(--muted)", fontWeight: 300, lineHeight: 2, letterSpacing: "0.04em" }}>
              現在地と目標を設定するだけで、自然・歴史・街歩きの3コースを無料提案。
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <LocationPicker location={location} onLocationSet={setLocation} />
            <hr className="divider" />

            {/* Mode switcher */}
            <div>
              <div className="label" style={{ marginBottom: 14 }}>Planning Mode</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, border: "1px solid var(--border)" }}>
                {([
                  { key: "time" as const,  label: "Time",  sub: "歩く時間から" },
                  { key: "steps" as const, label: "Steps", sub: "目標歩数から" },
                ]).map(({ key, label, sub }) => (
                  <button key={key} onClick={() => setMode(key)} className="btn"
                    style={{
                      padding: "14px 12px", flexDirection: "column", gap: 4,
                      fontFamily: "'Jost', sans-serif",
                      background: mode === key ? "var(--white)" : "var(--accent)",
                      color: mode === key ? "var(--bg)" : "var(--muted)",
                      borderRight: "1px solid var(--border)", transition: "all 0.2s ease",
                    }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 400, letterSpacing: "0.15em", textTransform: "uppercase" }}>{label}</span>
                    <span style={{ fontSize: "0.6rem", opacity: 0.7, letterSpacing: "0.08em" }}>{sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {mode === "time"
              ? <DurationSelector value={duration} onChange={setDuration} />
              : <StepsSelector value={targetSteps} onChange={setTargetSteps} />
            }

            {/* 換算サマリー */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, border: "1px solid var(--border)", background: "var(--accent)" }}>
              {[
                { val: effectiveDuration, unit: "min", lbl: "歩行時間" },
                { val: mode === "time"
                    ? `${(duration/60*3.87).toFixed(1)}`
                    : stepsToDistance(targetSteps),
                  unit: "km", lbl: "目安距離" },
                { val: mode === "time"
                    ? Math.round(duration/60*3.87*1000/0.75).toLocaleString()
                    : targetSteps.toLocaleString(),
                  unit: "歩", lbl: "推定歩数" },
              ].map(({ val, unit, lbl }) => (
                <div key={lbl} style={{ padding: "14px 16px", borderRight: "1px solid var(--border)" }}>
                  <div style={{ fontFamily: "'Jost', sans-serif", fontSize: "1rem", fontWeight: 300, color: "var(--white)" }}>
                    {val}<span style={{ fontSize: "0.58rem", marginLeft: 3, color: "var(--muted)", letterSpacing: "0.1em" }}>{unit}</span>
                  </div>
                  <div className="label" style={{ marginTop: 3 }}>{lbl}</div>
                </div>
              ))}
            </div>

            {error && (
              <div style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.68rem", color: "rgba(255,120,120,0.9)", letterSpacing: "0.1em" }}>
                {error}
              </div>
            )}

            <button className="btn btn-white"
              style={{ width: "100%", padding: "18px 32px", opacity: location ? 1 : 0.3, cursor: location ? "pointer" : "not-allowed" }}
              onClick={handleSearch} disabled={!location}>
              Search Courses
            </button>

            <div style={{ textAlign: "center", fontFamily: "'Jost', sans-serif", fontSize: "0.6rem", color: "rgba(255,255,255,0.15)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
              Free · No Account · No Tracking
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 52, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.62rem", letterSpacing: "0.22em", color: "var(--muted)", textTransform: "uppercase" }}>
          ©2026 Kaoru Furubayashi
        </span>
      </div>
    </main>
  );
}
