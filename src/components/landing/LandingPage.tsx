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

type AgentName = "ARIA" | "getu.ai" | "Twitter Manager" | "Reddit Scout" | "Lead Finder" | "Community Finder" | "Content Studio";

interface DemoStepExt extends DemoStep {
  agent?: AgentName;
}

// ── Demo Script 1: Multi-agent overview ──────────────────────────────────────

const DEMO_OVERVIEW: DemoStepExt[] = [
  {
    role: "agent",
    agent: "getu.ai",
    text: "Tell me about your product — I'll find your first users.",
  },
  {
    role: "user",
    text: "Patchwork — API monitoring for DevOps. We catch 5xx before PagerDuty does.",
    delay: 500,
  },
  {
    role: "plan",
    label: "PLAN MODE",
    text: "",
    items: [
      "Twitter Manager — find signal posts & engage",
      "Reddit Scout — find relevant subreddits & threads",
      "Lead Finder — discover ICP leads on LinkedIn",
      "Community Finder — join Discord & Slack groups",
      "Content Studio — create & publish short videos",
    ],
    delay: 300,
  },
  {
    role: "user",
    text: "Start with Twitter Manager and Lead Finder.",
    delay: 500,
  },
  {
    role: "sys",
    text: "✓ Twitter Manager deployed\n✓ Lead Finder deployed",
    delay: 300,
  },
  {
    role: "exec",
    agent: "Twitter Manager",
    label: "TWITTER MANAGER",
    text: "",
    items: [
      "Found 9 signal posts matching your ICP",
      "Drafted 3 replies · ⏳ awaiting your approval",
    ],
    delay: 400,
  },
  {
    role: "user",
    text: "Approve all 3.",
    delay: 400,
  },
  {
    role: "sys",
    text: "✓ 3 replies posted · 1 reply received, asked for demo",
    delay: 300,
  },
  {
    role: "exec",
    agent: "Lead Finder",
    label: "LEAD FINDER · LINKEDIN",
    text: "",
    items: [
      "Found 30 ICP leads: SREs at 200–2k SaaS companies",
      "Drafted 5 connection requests · ⏳ awaiting approval",
    ],
    delay: 400,
  },
  {
    role: "card",
    label: "RESULTS · 24H",
    text: "",
    items: [
      "📊 9 signals found · 30 leads discovered",
      "💬 3 replies sent · 5 connections pending",
      "🎯 1 demo booked · 2 follow-ups queued",
    ],
    delay: 400,
  },
];

// ── Demo Script 2: Twitter deep-dive ─────────────────────────────────────────

const DEMO_TWITTER: DemoStepExt[] = [
  {
    role: "user",
    text: "Help me grow on Twitter. Find people with API monitoring pain.",
    delay: 500,
  },
  {
    role: "sys",
    text: "✓ Twitter Manager deployed",
    delay: 300,
  },
  {
    role: "agent",
    agent: "Twitter Manager",
    text: "Found 9 signal posts matching your ICP. Here are the top 3:",
    delay: 400,
  },
  {
    role: "card",
    label: "SIGNALS FOUND",
    text: "",
    items: [
      "🔥 @sre_sarah: \"wish I could catch 5xx before PagerDuty wakes me\"",
      "🔥 @k8s_mike: \"spent 4h on a latency spike a good monitor would catch\"",
      "🔥 @devops_jen: \"evaluated 6 tools, none catch errors early enough\"",
    ],
    delay: 400,
  },
  {
    role: "agent",
    agent: "Twitter Manager",
    text: "Drafted a reply to @sre_sarah:",
    delay: 300,
  },
  {
    role: "exec",
    agent: "Twitter Manager",
    label: "DRAFT REPLY",
    text: "",
    items: [
      "\"We built Patchwork to catch the 5xx 90s before PD fires. 5-min demo?\"",
      "✓ Tone: empathetic, not salesy",
      "⏳ Awaiting your approval",
    ],
    delay: 400,
  },
  {
    role: "user",
    text: "Looks good, approve it.",
    delay: 400,
  },
  {
    role: "sys",
    text: "✓ Reply posted · @sre_sarah liked + replied \"yes please\"",
    delay: 300,
  },
  {
    role: "agent",
    agent: "Twitter Manager",
    text: "Also published an 8-tweet thread for authority building:",
    delay: 400,
  },
  {
    role: "exec",
    agent: "Twitter Manager",
    label: "THREAD PUBLISHED",
    text: "",
    items: [
      "\"10k API incidents — what 95% had in common\" (8 tweets)",
      "⏳ Awaiting your approval to pin",
    ],
    delay: 400,
  },
  {
    role: "user",
    text: "Pin it.",
    delay: 300,
  },
  {
    role: "card",
    label: "TWITTER · 24H",
    text: "",
    items: [
      "📊 9 signals · 6 replies sent (all approved)",
      "📈 2.1k impressions · 47 likes · 12 RTs",
      "🎯 2 demos booked · 3 new followers",
    ],
    delay: 400,
  },
];

const DEMO_SCRIPTS = [DEMO_OVERVIEW, DEMO_TWITTER];

const LOOP_PAUSE_MS = 3500;

export default function LandingPage({ onGetStarted }: Props) {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: T.bg, overflow: "hidden" }}>
      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", height: 52, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <span style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 500, color: T.text }}>
          getu<span style={{ color: T.green }}>.ai</span>
        </span>
        <button onClick={onGetStarted} style={{ background: T.text, color: "#fff", border: "none", padding: "7px 18px", borderRadius: 7, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
            Get started →
          </button>
      </nav>

      {/* Hero */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 48px", gap: 40, overflow: "hidden" }}>
        {/* Left — copy */}
        <div style={{ flex: "0 0 36%", animation: "fadeUp .45s ease both" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 100, border: `1px solid ${T.greenMid}`, background: T.greenLight, marginBottom: 18 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.green, display: "inline-block" }} />
            <span style={{ fontSize: 11, color: T.green, fontFamily: T.mono }}>open beta</span>
          </div>
          <h1 style={{ fontFamily: T.serifDisplay, fontSize: 34, lineHeight: 1.2, color: T.text, marginBottom: 14, fontWeight: 500 }}>
            Your GTM Agents,<br />
            <span style={{ color: T.green }}>get your first 100 users love you.</span>
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: T.textMid, marginBottom: 22, maxWidth: 380 }}>
            Describe your product. GetU deploys agents that find signal posts and engage, discover ICP-matching leads, join relevant communities, create and publish content, optimize GEO & SEO — and more, all on autopilot.
          </p>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button onClick={onGetStarted} style={{ background: T.text, color: "#fff", border: "none", padding: "11px 22px", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
              Create your sandbox →
            </button>
            <span style={{ fontSize: 12, color: T.textDim, fontFamily: T.mono }}>no setup needed</span>
          </div>
        </div>

        {/* Right — terminal demo + live activity side by side */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", gap: 12, height: "calc(100% - 60px)", maxHeight: 560, animation: "fadeUp .45s .1s ease both", animationFillMode: "forwards", opacity: 0 }}>
          <div style={{ flex: 1, minWidth: 0, height: "100%" }}>
            <DemoTerminal />
          </div>
          <div style={{ width: 240, flexShrink: 0, height: "100%" }}>
            <LandingLiveActivity />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ padding: "14px 48px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: 13, color: T.textDim, fontFamily: T.serifDisplay, fontStyle: "italic", fontWeight: 300, margin: 0 }}>
          "It's better to have 100 users love you than 1 million kinda like you."
          <span style={{ fontStyle: "normal", marginLeft: 8, fontFamily: T.mono, fontSize: 11 }}>— Paul Graham</span>
        </p>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <a href="https://x.com/getu_ai" target="_blank" rel="noopener noreferrer" style={{ color: T.textDim, padding: 4, display: "flex", alignItems: "center", transition: "color .15s" }} onMouseEnter={e => (e.currentTarget.style.color = T.text)} onMouseLeave={e => (e.currentTarget.style.color = T.textDim)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          <a href="https://discord.gg/srRJpbcMjF" target="_blank" rel="noopener noreferrer" style={{ color: T.textDim, padding: 4, display: "flex", alignItems: "center", transition: "color .15s" }} onMouseEnter={e => (e.currentTarget.style.color = T.text)} onMouseLeave={e => (e.currentTarget.style.color = T.textDim)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
          </a>
        </div>
      </footer>
    </div>
  );
}

// ── Landing Live Activity ─────────────────────────────────────────────────────

interface LandingLogLine {
  id: number;
  agent: string;
  color: string;
  text: string;
  time: string;
  status: "done" | "in_progress";
}

const LANDING_SEED: Omit<LandingLogLine, "id">[] = [
  { agent: "Twitter Manager",  color: "#D97706", text: "Analyzing trending hashtags in B2B SaaS…",                  time: "09:41:02", status: "done" },
  { agent: "Reddit Scout",     color: "#FF4500", text: "Connecting to Reddit API…",                                  time: "09:41:05", status: "done" },
  { agent: "Lead Finder",      color: "#0A66C2", text: "Starting LinkedIn search: VP Marketing, Series A…",          time: "09:41:08", status: "done" },
  { agent: "Community Finder", color: "#059669", text: "Scanning Discord server directory for B2B SaaS…",            time: "09:41:11", status: "done" },
  { agent: "Twitter Manager",  color: "#D97706", text: "Found 12 trending topics matching ICP criteria",             time: "09:41:14", status: "done" },
  { agent: "Reddit Scout",     color: "#FF4500", text: "Scanning r/SaaS — 342 posts in last 24h",                    time: "09:41:18", status: "done" },
  { agent: "Lead Finder",      color: "#0A66C2", text: "Querying Sales Navigator: 127 results",                      time: "09:41:22", status: "done" },
  { agent: "Community Finder", color: "#059669", text: "Found 'SaaS Growth Hackers' Discord — 2.4K members",         time: "09:41:25", status: "done" },
  { agent: "Reddit Scout",     color: "#FF4500", text: "Signal: 'Looking for alternatives to manual outreach'",      time: "09:41:28", status: "done" },
  { agent: "Twitter Manager",  color: "#D97706", text: "Drafted tweet: 'Top 3 GTM mistakes founders make'",          time: "09:41:33", status: "done" },
  { agent: "Lead Finder",      color: "#0A66C2", text: "Scoring 18 profiles by ICP quality…",                        time: "09:41:38", status: "done" },
  { agent: "Twitter Manager",  color: "#D97706", text: "Tweet published — tracking engagement",                      time: "09:41:45", status: "done" },
  { agent: "Community Finder", color: "#059669", text: "r/SaaSMarketing — 18K members, high ICP density",            time: "09:41:49", status: "done" },
];

const LANDING_STREAM: Omit<LandingLogLine, "id">[] = [
  { agent: "Reddit Scout",     color: "#FF4500", text: "Signal: 'Best tools for cold email automation?'",            time: "09:41:52", status: "done" },
  { agent: "Lead Finder",      color: "#0A66C2", text: "4 high-quality leads identified (score > 0.85)",             time: "09:41:58", status: "done" },
  { agent: "Twitter Manager",  color: "#D97706", text: "Replying to @sre_sarah — 'We catch 5xx before PD fires'",   time: "09:42:04", status: "done" },
  { agent: "Reddit Scout",     color: "#FF4500", text: "Scanning r/startups — 189 posts in last 24h",                time: "09:42:10", status: "done" },
  { agent: "Community Finder", color: "#059669", text: "Found Twitter community: #SaaSTwitter — 5.1K active",        time: "09:42:15", status: "done" },
  { agent: "Lead Finder",      color: "#0A66C2", text: "Found Twitter account for lead: @sarahl_vp",                 time: "09:42:20", status: "done" },
  { agent: "Twitter Manager",  color: "#D97706", text: "Tweet received 23 impressions in 2 min",                     time: "09:42:28", status: "done" },
  { agent: "Reddit Scout",     color: "#FF4500", text: "Signal: 'Our manual outreach takes 20 hrs/week'",            time: "09:42:35", status: "done" },
  { agent: "Community Finder", color: "#059669", text: "Ranked 6 communities by ICP density — top: SaaS Growth",     time: "09:42:40", status: "done" },
  { agent: "Twitter Manager",  color: "#D97706", text: "Engaging with @saasfounder's thread on outbound",            time: "09:42:48", status: "done" },
  { agent: "Lead Finder",      color: "#0A66C2", text: "Drafting personalized outreach for top 4 leads…",            time: "09:42:55", status: "in_progress" },
  { agent: "Reddit Scout",     color: "#FF4500", text: "3 new signal posts matched on r/startups",                   time: "09:43:02", status: "done" },
  { agent: "Twitter Manager",  color: "#D97706", text: "Liked 4 posts from ICP-matching accounts",                   time: "09:43:10", status: "done" },
  { agent: "Community Finder", color: "#059669", text: "Discovered 2 new Discord servers for GTM founders",          time: "09:43:18", status: "done" },
  { agent: "Lead Finder",      color: "#0A66C2", text: "Lead score update: 12 qualified out of 18",                  time: "09:43:25", status: "done" },
  { agent: "Reddit Scout",     color: "#FF4500", text: "Signal: 'Wish there was an AI to handle GTM'",               time: "09:43:33", status: "done" },
  { agent: "Twitter Manager",  color: "#D97706", text: "Tweet #2 draft ready for review · ⏳ awaiting approval",     time: "09:43:40", status: "done" },
  { agent: "Lead Finder",      color: "#0A66C2", text: "Outreach draft sent — 4 messages ready · ⏳ approval",       time: "09:43:48", status: "done" },
  { agent: "Community Finder", color: "#059669", text: "Community report ready — 9 groups, 14K total members",       time: "09:43:55", status: "done" },
];

function LandingLiveActivity() {
  const [lines, setLines] = useState<LandingLogLine[]>(() =>
    LANDING_SEED.map((l, i) => ({ ...l, id: i }))
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const streamIdx = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      if (streamIdx.current >= LANDING_STREAM.length) {
        streamIdx.current = 0;
      }
      const next = LANDING_STREAM[streamIdx.current];
      streamIdx.current++;
      setLines(prev => [...prev, { ...next, id: prev.length }]);
    }, 2400 + Math.random() * 1200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines.length]);

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
      {/* Log lines */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {lines.map((line) => (
          <div key={line.id} style={{
            padding: "6px 16px", fontSize: 11, lineHeight: 1.5,
            animation: "fadeUp .25s ease",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim }}>{line.time}</span>
              <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 600, color: line.color }}>{line.agent}</span>
            </div>
            <div style={{ color: line.status === "in_progress" ? T.text : T.textMid, marginTop: 2 }}>
              {line.text}
              {line.status === "in_progress" && <span style={{ display: "inline-block", width: 2, height: 11, background: T.green, marginLeft: 3, verticalAlign: "-1px", animation: "blink 1s infinite" }} />}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ── Demo Terminal (preserved — not currently rendered) ─────────────────────────

interface LineData {
  role: StepRole;
  text: string;
  label?: string;
  items?: string[];
  status?: string;
  agent?: AgentName;
  id: number;
  live?: boolean;
}

function DemoTerminal() {
  const [lines, setLines] = useState<LineData[]>([]);
  const [step, setStep]   = useState(0);
  const [busy, setBusy]   = useState(false);
  const [fading, setFading] = useState(false);
  const [scriptIdx, setScriptIdx] = useState(0);
  const endRef            = useRef<HTMLDivElement>(null);
  const containerRef      = useRef<HTMLDivElement>(null);

  const currentScript = DEMO_SCRIPTS[scriptIdx];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const resetDemo = useCallback(() => {
    setFading(true);
    setTimeout(() => {
      setLines([]);
      setStep(0);
      setBusy(false);
      setScriptIdx(idx => (idx + 1) % DEMO_SCRIPTS.length);
      setFading(false);
    }, 600);
  }, []);

  useEffect(() => {
    if (step >= currentScript.length || busy) return;
    const item = currentScript[step];
    const delay = item.delay ?? (step === 0 ? 800 : 700);

    const t = setTimeout(() => {
      setBusy(true);
      setLines(l => [...l, {
        role: item.role,
        text: item.text,
        label: item.label,
        items: item.items,
        status: item.status,
        agent: item.agent,
        id: step,
        live: true,
      }]);
    }, delay);
    return () => clearTimeout(t);
  }, [step, busy, currentScript]);

  useEffect(() => {
    if (step < currentScript.length || busy) return;
    const t = setTimeout(resetDemo, LOOP_PAUSE_MS);
    return () => clearTimeout(t);
  }, [step, busy, resetDemo, currentScript]);

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
        <span style={{ marginLeft: 8, fontSize: 11, color: T.textDim, fontFamily: T.mono, flex: 1 }}>getu.ai — get your first 100 users love you</span>
        <div style={{ display: "flex", gap: 4 }}>
          {DEMO_SCRIPTS.map((_, i) => (
            <span key={i} style={{
              width: i === scriptIdx ? 14 : 6,
              height: 6,
              borderRadius: 3,
              background: i === scriptIdx ? T.green : T.borderMid,
              display: "inline-block",
              transition: "all .3s ease",
            }} />
          ))}
        </div>
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
              {line.role === "agent" && <AgentBubble line={line} isLive={!!isLive} onDone={onTyped} />}
              {line.role === "user"  && <UserBubble  line={line} isLive={!!isLive} onDone={onTyped} />}
              {line.role === "sys"   && <SysBubble   line={line} isLive={!!isLive} onDone={onTyped} />}
              {line.role === "card"  && <CardBubble  line={line} isLive={!!isLive} onDone={onTyped} />}
              {line.role === "plan"  && <PlanBubble  line={line} isLive={!!isLive} onDone={onTyped} />}
              {line.role === "exec"  && <ExecBubble  line={line} isLive={!!isLive} onDone={onTyped} />}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </div>
  );
}

// ── Agent color map ───────────────────────────────────────────────────────────

const AGENT_COLORS: Record<AgentName, { color: string; bg: string; border: string }> = {
  "ARIA":             { color: T.green,    bg: T.greenLight, border: T.greenMid },
  "getu.ai":          { color: T.text,     bg: "#f0eee9",    border: T.borderMid },
  "Twitter Manager":  { color: "#D97706",  bg: "#fffbeb",    border: "#fcd34d"  },
  "Reddit Scout":     { color: "#FF4500",  bg: "#fff7ed",    border: "#fdba74"  },
  "Lead Finder":      { color: "#0A66C2",  bg: "#eff6ff",    border: "#93c5fd"  },
  "Community Finder": { color: "#059669",  bg: "#ecfdf5",    border: "#6ee7b7"  },
  "Content Studio":   { color: "#E11D48",  bg: "#fff1f2",    border: "#fda4af"  },
};

// ── Bubble Components ─────────────────────────────────────────────────────────

function AgentBubble({ line, isLive, onDone }: { line: LineData; isLive: boolean; onDone: () => void }) {
  const agentName = line.agent ?? "ARIA";
  const ac = AGENT_COLORS[agentName];
  return (
    <>
      <div style={{ fontSize: 10, color: ac.color, fontFamily: T.mono, marginBottom: 3 }}>{agentName}</div>
      <div style={{ fontSize: 12.5, color: T.text, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
        {isLive ? <Typewriter text={line.text} onDone={onDone} /> : line.text}
      </div>
    </>
  );
}

function UserBubble({ line, isLive, onDone }: { line: LineData; isLive: boolean; onDone: () => void }) {
  return (
    <>
      <div style={{ fontSize: 10, color: T.textDim, fontFamily: T.mono, marginBottom: 3 }}>YOU</div>
      <div style={{ fontSize: 12.5, color: T.textMid }}>
        {isLive ? <Typewriter text={line.text} speed={22} onDone={onDone} /> : line.text}
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
  const ac = line.agent ? AGENT_COLORS[line.agent] : AGENT_COLORS.ARIA;
  return (
    <div style={{
      border: `1px solid ${ac.border}`,
      borderRadius: 8,
      overflow: "hidden",
      background: ac.bg,
    }}>
      <div style={{
        padding: "5px 10px",
        background: ac.bg,
        fontSize: 10,
        fontFamily: T.mono,
        fontWeight: 500,
        color: ac.color,
        letterSpacing: "0.5px",
        display: "flex",
        alignItems: "center",
        gap: 5,
        borderBottom: `1px solid ${ac.border}`,
      }}>
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M4 2l8 6-8 6V2z" fill={ac.color}/></svg>
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
