import { useState, useEffect, useRef } from "react";
import { T } from "../../lib/theme.js";

interface Props {
  onGetStarted: () => void;
  onSignIn:     () => void;
}

// Demo script shown in the interactive terminal
const DEMO_STEPS = [
  { role: "agent", text: "Hi, I'm ARIA, your chief of agent staff, tell me about your product and let's get you 100 users who truly love you." },
  { role: "user",  text: "B2B SaaS for logistics ops teams. Mid-market US companies." },
  { role: "agent", text: "Got it. Mapping your ICP — ops managers and supply chain directors at 200–2000 person companies in freight and 3PL.\n\nDeploying your agents now..." },
  { role: "sys",   text: "✓ SCOUT (signal finding + outreach)   ✓ PULSE (Twitter)" },
  { role: "agent", text: "Your marketing team is live. Head to your dashboard →", cta: true },
] as const;

export default function LandingPage({ onGetStarted, onSignIn }: Props) {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: T.bg, overflow: "hidden" }}>
      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", height: 52, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <span style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 500, color: T.text }}>
          getu<span style={{ color: T.green }}>.ai</span>
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onSignIn} style={{ background: "none", border: "none", fontSize: 14, color: T.textMid, padding: "7px 14px", cursor: "pointer" }}>
            Sign in
          </button>
          <button onClick={onGetStarted} style={{ background: T.text, color: "#fff", border: "none", padding: "7px 18px", borderRadius: 7, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
            Get started →
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 48px", gap: 56, overflow: "hidden" }}>
        {/* Left — copy */}
        <div style={{ flex: "0 0 50%", animation: "fadeUp .45s ease both" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 100, border: `1px solid ${T.greenMid}`, background: T.greenLight, marginBottom: 20 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.green, display: "inline-block" }} />
            <span style={{ fontSize: 11, color: T.green, fontFamily: T.mono }}>open beta</span>
          </div>
          <h1 style={{ fontFamily: T.serif, fontSize: 36, lineHeight: 1.2, color: T.text, marginBottom: 16, fontWeight: 400 }}>
            Meet your AI marketing team,<br />
            <span style={{ color: T.green }}>ready to deploy.</span>
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.75, color: T.textMid, marginBottom: 26, maxWidth: 420 }}>
            Describe your product. GetU.ai learns your goals, maps your ICP, builds the strategy, and deploys specialist agents that find leads, publish content, run outreach — all on autopilot.
          </p>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button onClick={onGetStarted} style={{ background: T.text, color: "#fff", border: "none", padding: "11px 22px", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
              Create your sandbox →
            </button>
            <span style={{ fontSize: 12, color: T.textDim, fontFamily: T.mono }}>no setup needed</span>
          </div>
        </div>

        {/* Right — interactive terminal */}
        <div style={{ flex: "0 0 46%", height: "calc(100% - 120px)", maxHeight: 400, animation: "fadeUp .45s .1s ease both", animationFillMode: "forwards", opacity: 0 }}>
          <DemoTerminal onEnter={onGetStarted} />
          <p style={{ marginTop: 8, fontSize: 11, color: T.textDim, fontFamily: T.mono, textAlign: "center" }}>↑ interactive demo</p>
        </div>
      </div>

      {/* PG quote */}
      <div style={{ padding: "12px 48px", textAlign: "center", flexShrink: 0 }}>
        <p style={{ fontSize: 12, color: T.textDim, fontFamily: T.serif, fontStyle: "italic", margin: 0 }}>
          "It's better to have 100 users love you than 1 million kinda like you."
          <span style={{ fontStyle: "normal", marginLeft: 6, fontSize: 11, color: T.textDim }}>— Paul Graham</span>
        </p>
      </div>
    </div>
  );
}

// ── Demo Terminal ─────────────────────────────────────────────────────────────

function DemoTerminal({ onEnter }: { onEnter: () => void }) {
  const [lines, setLines]   = useState<Array<{ role: string; text: string; id: number; live?: boolean; cta?: boolean }>>([]);
  const [step, setStep]     = useState(0);
  const [typing, setTyping] = useState(false);
  const [waiting, setWaiting] = useState(false); // waiting for user to type
  const [input, setInput]   = useState("");
  const endRef              = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [lines]);

  // Auto-advance non-user steps
  useEffect(() => {
    if (step >= DEMO_STEPS.length || typing || waiting) return;
    const item = DEMO_STEPS[step];
    if (item.role === "user") { setWaiting(true); return; }
    const t = setTimeout(() => {
      setTyping(true);
      setLines(l => [...l, { role: item.role, text: item.text, id: step, live: true, cta: "cta" in item ? item.cta : false }]);
    }, step === 0 ? 600 : 700);
    return () => clearTimeout(t);
  }, [step, typing, waiting]);

  function onTyped() { setTyping(false); setStep(s => s + 1); }

  function send() {
    if (!input.trim()) return;
    setLines(l => [...l, { role: "user", text: input, id: step }]);
    setInput("");
    setWaiting(false);
    setStep(s => s + 1);
  }

  const placeholder = waiting && step < DEMO_STEPS.length ? (DEMO_STEPS[step] as { text: string }).text : "waiting...";

  return (
    <div style={{ background: "#fafaf8", border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.07)", display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Title bar */}
      <div style={{ padding: "9px 14px", background: "#e8e5de", display: "flex", alignItems: "center", gap: 6 }}>
        {["#FF6057","#FFBD2E","#28CA41"].map(c => <span key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, display: "inline-block" }} />)}
        <span style={{ marginLeft: 8, fontSize: 11, color: T.textDim, fontFamily: T.mono }}>getu.ai</span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px 6px" }}>
        {lines.map(line => {
          const isLive = line.live && lines[lines.length - 1]?.id === line.id;
          return (
            <div key={line.id} style={{ marginBottom: 14, animation: "slideIn .2s ease" }}>
              {line.role === "agent" && (
                <>
                  <div style={{ fontSize: 10, color: T.green, fontFamily: T.mono, marginBottom: 3 }}>ARIA</div>
                  <div style={{ fontSize: 13, color: T.text, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                    {isLive
                      ? <Typewriter text={line.text} onDone={onTyped} onCta={line.cta ? onEnter : undefined} />
                      : line.cta
                        ? renderCta(line.text, onEnter)
                        : line.text}
                  </div>
                </>
              )}
              {line.role === "user" && (
                <>
                  <div style={{ fontSize: 10, color: T.textDim, fontFamily: T.mono, marginBottom: 3 }}>YOU</div>
                  <div style={{ fontSize: 13, color: T.textMid }}>{line.text}</div>
                </>
              )}
              {line.role === "sys" && (
                <div style={{ fontSize: 11, color: T.green, background: T.greenLight, border: `1px solid ${T.greenMid}`, padding: "6px 10px", borderRadius: 6, fontFamily: T.mono }}>
                  {isLive ? <Typewriter text={line.text} speed={12} onDone={onTyped} /> : line.text}
                </div>
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "10px 14px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ color: T.green, fontFamily: T.mono, fontSize: 13 }}>›</span>
        <input
          disabled={!waiting}
          placeholder={waiting ? placeholder : "waiting..."}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          style={{ flex: 1, border: "none", background: "transparent", fontFamily: T.mono, fontSize: 12, color: waiting ? T.text : T.textDim }}
        />
        {waiting && (
          <button onClick={send} style={{ background: T.green, color: "#fff", border: "none", padding: "4px 10px", borderRadius: 5, fontSize: 11, fontFamily: T.mono, cursor: "pointer" }}>↵</button>
        )}
      </div>
    </div>
  );
}

function renderCta(text: string, onEnter: () => void) {
  const parts = text.split(/(dashboard)/i);
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === "dashboard"
          ? <span key={i} onClick={onEnter} style={{ color: T.green, textDecoration: "underline", cursor: "pointer" }}>dashboard</span>
          : p
      )}
    </>
  );
}

// ── Typewriter ────────────────────────────────────────────────────────────────

interface TypewriterProps {
  text:    string;
  speed?:  number;
  onDone?: () => void;
  onCta?:  () => void;
}

function Typewriter({ text, speed = 16, onDone, onCta }: TypewriterProps) {
  const [out, setOut] = useState("");

  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(iv);
        // Trigger CTA click automatically after last char if onCta provided
        if (onCta) setTimeout(onCta, 800);
        else onDone?.();
      }
    }, speed);
    return () => clearInterval(iv);
  }, [text]);

  if (!onCta) return <>{out}</>;

  // Render the "dashboard →" part as a link once we've typed past it
  const parts = out.split(/(dashboard)/i);
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === "dashboard"
          ? <span key={i} onClick={onCta} style={{ color: T.green, textDecoration: "underline", cursor: "pointer" }}>dashboard</span>
          : p
      )}
    </>
  );
}
