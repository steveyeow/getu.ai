import { useState, useEffect, useRef, useCallback } from "react";
import { T } from "../../lib/theme.js";

interface Props {
  onGetStarted: () => void;
  onSignIn:     () => void;
}

type StepRole = "agent" | "user" | "sys" | "card" | "plan" | "exec";

interface DemoStep {
  role: StepRole;
  text: string;
  label?: string;
  delay?: number;
  items?: string[];
  status?: string;
}

const DEMO_STEPS: DemoStep[] = [
  // ── Act 1: Meet ARIA, describe your product ──
  {
    role: "agent",
    text: "Hi, I'm ARIA — your AI chief of staff for growth.\nTell me about your product, and I'll build a GTM strategy and deploy agents to find your first 100 users.",
  },
  {
    role: "user",
    text: "We built Patchwork — an API monitoring tool for DevOps teams at mid-market SaaS companies. We catch 5xx errors before PagerDuty does.",
    delay: 600,
  },

  // ── Act 2: ARIA analyzes & builds strategy ──
  {
    role: "agent",
    text: "Great. Let me map your Ideal Customer Profile.",
  },
  {
    role: "card",
    label: "ICP ANALYSIS",
    text: "",
    items: [
      "Persona: DevOps Leads & SREs",
      "Company: 200–2,000 person SaaS",
      "Stack: Microservices, K8s, CI/CD heavy",
      "Pain: Alert fatigue, slow incident response",
      "Channels: Twitter/X, Reddit r/devops, Hacker News",
    ],
  },
  {
    role: "agent",
    text: "Here's my recommended GTM plan:",
  },
  {
    role: "plan",
    label: "GTM STRATEGY",
    text: "",
    items: [
      "Phase 1 — Signal Hunting: find people complaining about monitoring gaps on Twitter, Reddit & HN",
      "Phase 2 — Warm Outreach: craft personalized replies referencing their exact pain",
      "Phase 3 — Content Flywheel: publish \"5xx war stories\" thread series on Twitter to build authority",
      "Phase 4 — Community Seeding: engage in r/devops and DevOps Discord with value-first answers",
    ],
  },
  {
    role: "user",
    text: "Love it. Let's start with Phase 1 & 2 — deploy the agents.",
    delay: 500,
  },

  // ── Act 3: Deploy agents ──
  {
    role: "sys",
    text: "✓ SCOUT deployed — scanning Twitter, Reddit, HN for signal posts\n✓ PULSE deployed — preparing content calendar\n✓ COMMUNITY deployed — monitoring r/devops & Discord",
  },

  // ── Act 4: SCOUT finds leads ──
  {
    role: "agent",
    text: "SCOUT found 14 high-intent signals in the last 2 hours:",
  },
  {
    role: "card",
    label: "SCOUT — LIVE SIGNALS",
    text: "",
    items: [
      "@sre_sarah: \"wish I could catch 5xx spikes before PagerDuty wakes me up at 3am\"",
      "r/devops: \"our monitoring is garbage, evaluated 6 tools and still lost\"",
      "HN thread: \"best API observability tools in 2026? nothing feels right\"",
      "@k8s_mike: \"spent 4h debugging a latency spike that a good monitor would've caught in seconds\"",
    ],
  },

  // ── Act 5: Agent executes — Twitter reply ──
  {
    role: "agent",
    text: "I drafted a personalized reply to @sre_sarah. Here's the plan:",
  },
  {
    role: "exec",
    label: "TWITTER AGENT — EXECUTION",
    text: "",
    items: [
      "→ Target: @sre_sarah's tweet about PagerDuty alert fatigue",
      "→ Action: Reply with empathy + mention Patchwork's pre-alert detection",
      "→ Draft: \"Felt this — we built Patchwork specifically to catch the 5xx spike 90s before PD fires. Happy to show you a 5-min demo if useful.\"",
      "✓ Tone check: Passed (helpful, not salesy)",
      "⏳ Status: Awaiting your approval",
    ],
  },
  {
    role: "sys",
    text: "↳ Reply approved & posted to @sre_sarah's thread\n↳ 2 more drafts ready for review in Mission Center",
  },

  // ── Act 6: Results rolling in ──
  {
    role: "agent",
    text: "24-hour agent activity summary:",
  },
  {
    role: "card",
    label: "DAILY REPORT",
    text: "",
    items: [
      "Signals found: 14 high-intent leads across 3 platforms",
      "Replies sent: 6 personalized (100% approved by you)",
      "Engagement: 3 replies received, 2 asked for demos",
      "Content published: 1 Twitter thread (\"5xx war stories\") — 1.2k impressions",
      "Pipeline: 2 demo calls booked for this week",
    ],
  },
  {
    role: "agent",
    text: "Your agents are running 24/7. I'll keep surfacing the best leads and optimizing outreach.\n\nReady to see your live dashboard?",
  },
];

const LOOP_PAUSE_MS = 3500;

export default function LandingPage({ onGetStarted, onSignIn }: Props) {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: T.bg, overflow: "hidden" }}>
      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", height: 52, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <span style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 500, color: T.text }}>
          getu<span style={{ color: T.green }}>.ai</span>
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <a href="https://x.com/getu_ai" target="_blank" rel="noopener noreferrer" style={{ color: T.textDim, padding: 6, display: "flex", alignItems: "center", transition: "color .15s" }} onMouseEnter={e => (e.currentTarget.style.color = T.text)} onMouseLeave={e => (e.currentTarget.style.color = T.textDim)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          <a href="https://discord.gg/srRJpbcMjF" target="_blank" rel="noopener noreferrer" style={{ color: T.textDim, padding: 6, display: "flex", alignItems: "center", transition: "color .15s" }} onMouseEnter={e => (e.currentTarget.style.color = T.text)} onMouseLeave={e => (e.currentTarget.style.color = T.textDim)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
          </a>
          <div style={{ width: 1, height: 16, background: T.border, margin: "0 4px" }} />
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
          <h1 style={{ fontFamily: T.serifDisplay, fontSize: 36, lineHeight: 1.2, color: T.text, marginBottom: 16, fontWeight: 300 }}>
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

        {/* Right — auto-playing terminal demo */}
        <div style={{ flex: "0 0 46%", height: "calc(100% - 120px)", maxHeight: 460, animation: "fadeUp .45s .1s ease both", animationFillMode: "forwards", opacity: 0 }}>
          <DemoTerminal />
          <p style={{ marginTop: 8, fontSize: 11, color: T.textDim, fontFamily: T.mono, textAlign: "center" }}>↑ live preview — loops automatically</p>
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

interface LineData {
  role: StepRole;
  text: string;
  label?: string;
  items?: string[];
  status?: string;
  id: number;
  live?: boolean;
}

function DemoTerminal() {
  const [lines, setLines] = useState<LineData[]>([]);
  const [step, setStep]   = useState(0);
  const [busy, setBusy]   = useState(false);
  const [fading, setFading] = useState(false);
  const endRef            = useRef<HTMLDivElement>(null);
  const containerRef      = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const resetDemo = useCallback(() => {
    setFading(true);
    setTimeout(() => {
      setLines([]);
      setStep(0);
      setBusy(false);
      setFading(false);
    }, 600);
  }, []);

  useEffect(() => {
    if (step >= DEMO_STEPS.length || busy) return;
    const item = DEMO_STEPS[step];
    const delay = item.delay ?? (step === 0 ? 800 : 700);

    const t = setTimeout(() => {
      setBusy(true);
      setLines(l => [...l, {
        role: item.role,
        text: item.text,
        label: item.label,
        items: item.items,
        status: item.status,
        id: step,
        live: true,
      }]);
    }, delay);
    return () => clearTimeout(t);
  }, [step, busy]);

  // When the full demo finishes, wait then loop
  useEffect(() => {
    if (step < DEMO_STEPS.length || busy) return;
    const t = setTimeout(resetDemo, LOOP_PAUSE_MS);
    return () => clearTimeout(t);
  }, [step, busy, resetDemo]);

  function onTyped() {
    setBusy(false);
    setStep(s => s + 1);
  }

  return (
    <div style={{
      background: "#fafaf8",
      border: `1px solid ${T.border}`,
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
      display: "flex",
      flexDirection: "column",
      height: "100%",
    }}>
      {/* Title bar */}
      <div style={{ padding: "9px 14px", background: "#e8e5de", display: "flex", alignItems: "center", gap: 6 }}>
        {["#FF6057","#FFBD2E","#28CA41"].map(c => (
          <span key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, display: "inline-block" }} />
        ))}
        <span style={{ marginLeft: 8, fontSize: 11, color: T.textDim, fontFamily: T.mono }}>getu.ai — agent workspace</span>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 18px 6px",
          transition: "opacity .5s ease",
          opacity: fading ? 0 : 1,
        }}
      >
        {lines.map(line => {
          const isLive = line.live && lines[lines.length - 1]?.id === line.id;
          return (
            <div key={line.id} style={{ marginBottom: 14, animation: "slideIn .2s ease" }}>
              {line.role === "agent" && <AgentBubble line={line} isLive={isLive} onDone={onTyped} />}
              {line.role === "user"  && <UserBubble  line={line} isLive={isLive} onDone={onTyped} />}
              {line.role === "sys"   && <SysBubble   line={line} isLive={isLive} onDone={onTyped} />}
              {line.role === "card"  && <CardBubble  line={line} isLive={isLive} onDone={onTyped} />}
              {line.role === "plan"  && <PlanBubble  line={line} isLive={isLive} onDone={onTyped} />}
              {line.role === "exec"  && <ExecBubble  line={line} isLive={isLive} onDone={onTyped} />}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </div>
  );
}

// ── Bubble Components ─────────────────────────────────────────────────────────

function AgentBubble({ line, isLive, onDone }: { line: LineData; isLive: boolean; onDone: () => void }) {
  return (
    <>
      <div style={{ fontSize: 10, color: T.green, fontFamily: T.mono, marginBottom: 3 }}>ARIA</div>
      <div style={{ fontSize: 12.5, color: T.text, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
        {isLive ? <Typewriter text={line.text} onDone={onDone} /> : line.text}
      </div>
    </>
  );
}

function UserBubble({ line, isLive, onDone }: { line: LineData; isLive: boolean; onDone: () => void }) {
  const step = DEMO_STEPS[line.id];
  return (
    <>
      <div style={{ fontSize: 10, color: T.textDim, fontFamily: T.mono, marginBottom: 3 }}>YOU</div>
      <div style={{ fontSize: 12.5, color: T.textMid }}>
        {isLive ? <Typewriter text={step.text} speed={22} onDone={onDone} /> : step.text}
      </div>
    </>
  );
}

function SysBubble({ line, isLive, onDone }: { line: LineData; isLive: boolean; onDone: () => void }) {
  return (
    <div style={{
      fontSize: 11,
      color: T.green,
      background: T.greenLight,
      border: `1px solid ${T.greenMid}`,
      padding: "6px 10px",
      borderRadius: 6,
      fontFamily: T.mono,
      whiteSpace: "pre-wrap",
    }}>
      {isLive ? <Typewriter text={line.text} speed={10} onDone={onDone} /> : line.text}
    </div>
  );
}

function CardBubble({ line, isLive, onDone }: { line: LineData; isLive: boolean; onDone: () => void }) {
  return (
    <div style={{
      border: `1px solid ${T.borderMid}`,
      borderRadius: 8,
      overflow: "hidden",
    }}>
      <div style={{
        padding: "5px 10px",
        background: "#f0eee9",
        fontSize: 10,
        fontFamily: T.mono,
        fontWeight: 500,
        color: T.textMid,
        letterSpacing: "0.5px",
      }}>
        {line.label}
      </div>
      <div style={{ padding: "8px 10px" }}>
        {isLive
          ? <TypewriterList items={line.items || []} onDone={onDone} />
          : (line.items || []).map((item, i) => (
              <div key={i} style={{ fontSize: 11.5, color: T.text, fontFamily: T.mono, lineHeight: 1.7 }}>
                • {item}
              </div>
            ))
        }
      </div>
    </div>
  );
}

function PlanBubble({ line, isLive, onDone }: { line: LineData; isLive: boolean; onDone: () => void }) {
  return (
    <div style={{
      border: `1px solid #c4b5fd`,
      borderRadius: 8,
      overflow: "hidden",
      background: "#f5f3ff",
    }}>
      <div style={{
        padding: "5px 10px",
        background: "#ede9fe",
        fontSize: 10,
        fontFamily: T.mono,
        fontWeight: 500,
        color: "#7c3aed",
        letterSpacing: "0.5px",
        display: "flex",
        alignItems: "center",
        gap: 5,
      }}>
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h8M2 12h10" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round"/></svg>
        {line.label}
      </div>
      <div style={{ padding: "8px 10px" }}>
        {isLive
          ? <TypewriterList items={line.items || []} onDone={onDone} bullet="→" />
          : (line.items || []).map((item, i) => (
              <div key={i} style={{ fontSize: 11.5, color: T.text, fontFamily: T.mono, lineHeight: 1.7 }}>
                → {item}
              </div>
            ))
        }
      </div>
    </div>
  );
}

function ExecBubble({ line, isLive, onDone }: { line: LineData; isLive: boolean; onDone: () => void }) {
  return (
    <div style={{
      border: `1px solid ${T.greenMid}`,
      borderRadius: 8,
      overflow: "hidden",
      background: "#f0fdf4",
    }}>
      <div style={{
        padding: "5px 10px",
        background: T.greenLight,
        fontSize: 10,
        fontFamily: T.mono,
        fontWeight: 500,
        color: T.green,
        letterSpacing: "0.5px",
        display: "flex",
        alignItems: "center",
        gap: 5,
      }}>
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M4 2l8 6-8 6V2z" fill={T.green}/></svg>
        {line.label}
      </div>
      <div style={{ padding: "8px 10px" }}>
        {isLive
          ? <TypewriterList items={line.items || []} onDone={onDone} bullet="" />
          : (line.items || []).map((item, i) => (
              <div key={i} style={{ fontSize: 11.5, color: T.text, fontFamily: T.mono, lineHeight: 1.7 }}>
                {item}
              </div>
            ))
        }
      </div>
    </div>
  );
}

// ── Typewriter ────────────────────────────────────────────────────────────────

interface TypewriterProps {
  text:    string;
  speed?:  number;
  onDone?: () => void;
}

function Typewriter({ text, speed = 14, onDone }: TypewriterProps) {
  const [out, setOut] = useState("");

  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(iv);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(iv);
  }, [text]);

  return <>{out}<span style={{ animation: "blink 1s step-end infinite", borderRight: `1.5px solid ${T.green}`, marginLeft: 1 }}>&nbsp;</span></>;
}

// ── TypewriterList — reveals items one by one ─────────────────────────────────

function TypewriterList({ items, onDone, bullet = "•" }: { items: string[]; onDone: () => void; bullet?: string }) {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (visible >= items.length) {
      onDone();
      return;
    }
    const t = setTimeout(() => setVisible(v => v + 1), 120 + items[visible].length * 3);
    return () => clearTimeout(t);
  }, [visible, items.length]);

  return (
    <>
      {items.slice(0, visible).map((item, i) => (
        <div key={i} style={{
          fontSize: 11.5,
          color: T.text,
          fontFamily: T.mono,
          lineHeight: 1.7,
          animation: "slideIn .15s ease",
        }}>
          {bullet ? `${bullet} ${item}` : item}
        </div>
      ))}
      {visible < items.length && (
        <div style={{ fontSize: 11.5, fontFamily: T.mono, color: T.textDim, animation: "pulse 1s ease infinite" }}>
          {bullet ? `${bullet} …` : "…"}
        </div>
      )}
    </>
  );
}
