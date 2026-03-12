import { useState, useEffect } from "react";
import { T } from "../../lib/theme.js";

interface Props {
  onReady: () => void;
}

const STEPS = [
  { label: "Initializing sandbox environment",   duration: 600 },
  { label: "Provisioning ARIA orchestrator",      duration: 700 },
  { label: "Loading agent toolkit",               duration: 600 },
];

const READY_PAUSE = 1400;

export default function SandboxLoader({ onReady }: Props) {
  const [current, setCurrent] = useState(0);
  const [ready, setReady] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (current >= STEPS.length) {
      const t = setTimeout(() => setReady(true), 300);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCurrent(c => c + 1), STEPS[current].duration);
    return () => clearTimeout(t);
  }, [current]);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setFadeOut(true), READY_PAUSE);
    return () => clearTimeout(t);
  }, [ready]);

  useEffect(() => {
    if (!fadeOut) return;
    const t = setTimeout(onReady, 450);
    return () => clearTimeout(t);
  }, [fadeOut, onReady]);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: T.bg,
        transition: "opacity .45s ease",
        opacity: fadeOut ? 0 : 1,
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: 44, animation: "fadeUp .3s ease both" }}>
        <span style={{ fontFamily: T.mono, fontSize: 16, fontWeight: 500, color: T.text }}>
          getu<span style={{ color: T.green }}>.ai</span>
        </span>
      </div>

      {/* Steps */}
      <div style={{ width: 280, display: "flex", flexDirection: "column", gap: 14, marginBottom: ready ? 32 : 0, transition: "margin-bottom .3s ease" }}>
        {STEPS.map((step, i) => {
          const done = i < current;
          const active = i === current && current < STEPS.length;
          const pending = i > current;

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                opacity: pending ? 0 : 1,
                transform: pending ? "translateY(4px)" : "none",
                transition: "opacity .3s ease, transform .3s ease",
              }}
            >
              <div style={{ width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {done ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation: "fadeUp .2s ease both" }}>
                    <circle cx="8" cy="8" r="7" stroke={T.green} strokeWidth="1.5" fill="none" />
                    <path d="M5 8l2 2 4-4" stroke={T.green} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : active ? (
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      border: `2px solid ${T.green}`,
                      borderTopColor: "transparent",
                      animation: "spin .7s linear infinite",
                    }}
                  />
                ) : (
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.borderMid }} />
                )}
              </div>

              <span
                style={{
                  fontFamily: T.mono,
                  fontSize: 12,
                  color: done ? T.text : active ? T.text : T.textDim,
                  fontWeight: 400,
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Ready banner */}
      <div
        style={{
          opacity: ready ? 1 : 0,
          transform: ready ? "none" : "translateY(8px)",
          transition: "opacity .4s ease, transform .4s ease",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          pointerEvents: ready ? "auto" : "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 20px",
            borderRadius: 10,
            background: T.greenLight,
            border: `1px solid ${T.greenMid}`,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="8" stroke={T.green} strokeWidth="1.5" fill={T.greenLight} />
            <path d="M5.5 9l2.5 2.5 4.5-4.5" stroke={T.green} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 500, color: T.green }}>
            Ready to run your agents
          </span>
        </div>
        <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textDim }}>
          Launching workspace…
        </span>
      </div>
    </div>
  );
}
