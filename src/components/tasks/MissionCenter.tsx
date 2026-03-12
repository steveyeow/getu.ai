import { useState, useEffect, useRef } from "react";
import { T } from "../../lib/theme.js";
import { useTasks } from "../../hooks/useTasks.js";

type MissionStatus = "running" | "paused" | "completed" | "failed";

interface ActivityEntry {
  text: string;
  status: "done" | "in_progress";
  time: string;
}

interface Mission {
  id: string;
  conversationId: string;
  agentName: string;
  agentColor: string;
  title: string;
  goal: string;
  status: MissionStatus;
  schedule: string;
  startedAt: string;
  stats: { label: string; value: number; suffix?: string }[];
  activity: ActivityEntry[];
}

const MISSIONS: Mission[] = [
  {
    id: "m1", conversationId: "conv-tm-1",
    agentName: "Twitter Manager", agentColor: "#D97706",
    title: "Publish 3 tweets on AI marketing",
    goal: "Write and publish 3 high-engagement tweets about AI-powered marketing automation",
    status: "running", schedule: "Daily, 9am–6pm", startedAt: "3 hours ago",
    stats: [{ label: "POSTED", value: 1 }, { label: "DRAFTED", value: 2 }, { label: "IMPRESSIONS", value: 340 }],
    activity: [
      { text: "Published tweet: Top 3 GTM mistakes founders make", status: "done", time: "12m" },
      { text: "Drafting tweet #2 on AI lead gen automation", status: "in_progress", time: "2m" },
      { text: "Analyzed trending hashtags in B2B SaaS", status: "done", time: "18m" },
    ],
  },
  {
    id: "m2", conversationId: "conv-rs-1",
    agentName: "Reddit Scout", agentColor: "#FF4500",
    title: "Find signal posts about AI marketing",
    goal: "Scan r/SaaS, r/startups, and r/marketing for posts discussing AI marketing pain",
    status: "running", schedule: "Every 6 hours", startedAt: "2 hours ago",
    stats: [{ label: "SIGNALS", value: 7 }, { label: "SUBS", value: 4 }, { label: "RELEVANCE", value: 82, suffix: "%" }],
    activity: [
      { text: "Found 3 new signal posts on r/startups", status: "done", time: "8m" },
      { text: "Scanning r/marketing for GTM automation posts", status: "in_progress", time: "1m" },
      { text: "Scored 5 posts by ICP relevance", status: "done", time: "22m" },
    ],
  },
  {
    id: "m3", conversationId: "conv-lf-1",
    agentName: "Lead Finder", agentColor: "#0A66C2",
    title: "Find VP Marketing leads at Series A startups",
    goal: "Search LinkedIn for VP Marketing and Head of Growth at Seed–Series B SaaS companies",
    status: "running", schedule: "Weekly, 50 leads/batch", startedAt: "5 days ago",
    stats: [{ label: "LEADS", value: 18 }, { label: "QUALIFIED", value: 12 }, { label: "OUTREACH", value: 4 }],
    activity: [
      { text: "Identified 4 VP Marketing leads on LinkedIn", status: "done", time: "38m" },
      { text: "Cross-referencing leads with Twitter activity", status: "in_progress", time: "5m" },
      { text: "Scored 18 profiles by ICP quality", status: "done", time: "1h" },
    ],
  },
];

// Simulated live log entries that stream in one by one
interface LogLine {
  id: number;
  agent: string;
  color: string;
  text: string;
  time: string;
  status: "done" | "in_progress";
}

const SEED_LOGS: Omit<LogLine, "id">[] = [
  { agent: "Twitter Manager",  color: "#D97706", text: "Analyzing trending hashtags in B2B SaaS…",                    time: "09:41:02", status: "done" },
  { agent: "Reddit Scout",     color: "#FF4500", text: "Connecting to Reddit API…",                                    time: "09:41:05", status: "done" },
  { agent: "Lead Finder",      color: "#0A66C2", text: "Starting LinkedIn search: VP Marketing, Series A…",            time: "09:41:08", status: "done" },
  { agent: "Twitter Manager",  color: "#D97706", text: "Found 12 trending topics matching ICP criteria",               time: "09:41:14", status: "done" },
  { agent: "Reddit Scout",     color: "#FF4500", text: "Scanning r/SaaS — 342 posts in last 24h",                      time: "09:41:18", status: "done" },
  { agent: "Lead Finder",      color: "#0A66C2", text: "Querying Sales Navigator: 127 results",                        time: "09:41:22", status: "done" },
  { agent: "Reddit Scout",     color: "#FF4500", text: "Signal match: 'Looking for alternatives to manual outreach'",  time: "09:41:28", status: "done" },
  { agent: "Twitter Manager",  color: "#D97706", text: "Drafted tweet #1: 'Top 3 GTM mistakes founders make'",         time: "09:41:33", status: "done" },
  { agent: "Lead Finder",      color: "#0A66C2", text: "Scoring 18 profiles by ICP quality…",                          time: "09:41:38", status: "done" },
  { agent: "Twitter Manager",  color: "#D97706", text: "Tweet #1 published — tracking engagement",                     time: "09:41:45", status: "done" },
  { agent: "Reddit Scout",     color: "#FF4500", text: "Signal match: 'Best tools for cold email automation?'",        time: "09:41:52", status: "done" },
  { agent: "Lead Finder",      color: "#0A66C2", text: "4 high-quality leads identified (score > 0.85)",               time: "09:41:58", status: "done" },
  { agent: "Reddit Scout",     color: "#FF4500", text: "Scanning r/startups — 189 posts in last 24h",                  time: "09:42:04", status: "done" },
  { agent: "Twitter Manager",  color: "#D97706", text: "Drafting tweet #2 on AI lead gen automation…",                 time: "09:42:10", status: "in_progress" },
  { agent: "Lead Finder",      color: "#0A66C2", text: "Cross-referencing leads with Twitter activity…",               time: "09:42:15", status: "in_progress" },
  { agent: "Reddit Scout",     color: "#FF4500", text: "Scoring 5 posts by ICP relevance…",                            time: "09:42:20", status: "in_progress" },
];

const STREAMING_LOGS: Omit<LogLine, "id">[] = [
  { agent: "Twitter Manager",  color: "#D97706", text: "Tweet #1 received 23 impressions in 2 min",                    time: "09:42:28", status: "done" },
  { agent: "Reddit Scout",     color: "#FF4500", text: "3 new signal posts matched on r/startups",                     time: "09:42:35", status: "done" },
  { agent: "Lead Finder",      color: "#0A66C2", text: "Found Twitter account for lead: @sarahl_vp",                   time: "09:42:41", status: "done" },
  { agent: "Twitter Manager",  color: "#D97706", text: "Engaging with @saasfounder's thread on outbound",              time: "09:42:48", status: "done" },
  { agent: "Reddit Scout",     color: "#FF4500", text: "Signal match: 'Our manual outreach takes 20 hrs/week'",        time: "09:42:55", status: "done" },
  { agent: "Lead Finder",      color: "#0A66C2", text: "Drafting personalized outreach for top 4 leads…",              time: "09:43:02", status: "in_progress" },
  { agent: "Twitter Manager",  color: "#D97706", text: "Liked 4 posts from ICP-matching accounts",                     time: "09:43:10", status: "done" },
  { agent: "Reddit Scout",     color: "#FF4500", text: "Scanning r/marketing — 276 posts in last 24h",                 time: "09:43:18", status: "done" },
  { agent: "Lead Finder",      color: "#0A66C2", text: "Lead score update: 12 qualified out of 18",                    time: "09:43:25", status: "done" },
  { agent: "Twitter Manager",  color: "#D97706", text: "Tweet #2 draft ready for review",                              time: "09:43:33", status: "done" },
  { agent: "Reddit Scout",     color: "#FF4500", text: "Signal match: 'Wish there was an AI to handle GTM'",           time: "09:43:40", status: "done" },
  { agent: "Lead Finder",      color: "#0A66C2", text: "Outreach draft sent for review — 4 messages ready",            time: "09:43:48", status: "done" },
];

const AVAILABLE_AGENTS = [
  { name: "Twitter Manager",  color: "#D97706", icon: "TM", tagline: "Find signal posts, reply with value, and publish threads automatically" },
  { name: "Reddit Scout",     color: "#FF4500", icon: "RS", tagline: "Find signal communities and posts on Reddit where your ICP discusses pain" },
  { name: "Lead Finder",      color: "#0A66C2", icon: "LF", tagline: "Search LinkedIn, Twitter & Reddit for decision makers matching your ICP" },
  { name: "Community Finder", color: "#059669", icon: "CF", tagline: "Find Discord servers, Twitter groups, and Reddit spaces where your audience gathers" },
  { name: "Content Studio",   color: "#E11D48", icon: "CS", tagline: "Generate images, copy, and short-form video for TikTok and social media" },
  { name: "GEO Optimizer",    color: "#0891B2", icon: "GO", tagline: "Make your site visible to AI search engines like ChatGPT, Perplexity & Claude" },
];

interface Props {
  userId: string;
  onChat: () => void;
  onNavigate?: (tab: "chat" | "missions" | "skills" | "agents") => void;
  onOpenConversation?: (conversationId: string, agentName: string, agentColor: string) => void;
  onChatWithAgent?: (agent: { name: string; color: string; tagline: string; starter: string }) => void;
}

export default function MissionCenter({ userId, onChat, onNavigate, onOpenConversation, onChatWithAgent }: Props) {
  const { tasks } = useTasks(userId);
  void tasks;

  const [statuses, setStatuses] = useState<Record<string, MissionStatus>>(
    () => Object.fromEntries(MISSIONS.map(m => [m.id, m.status]))
  );

  function togglePause(id: string) {
    setStatuses(prev => ({ ...prev, [id]: prev[id] === "running" ? "paused" : "running" }));
  }
  function stop(id: string) {
    setStatuses(prev => ({ ...prev, [id]: "completed" }));
  }

  const runningCount = Object.values(statuses).filter(s => s === "running").length;

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* Left panel — mission cards */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, fontFamily: T.mono, color: T.text }}>Mission Control</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
              {runningCount > 0 ? (
                <>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, display: "inline-block", animation: "pulse 2s infinite" }} />
                  <span style={{ fontSize: 12, fontFamily: T.mono, color: T.green }}>{runningCount} mission{runningCount > 1 ? "s" : ""} running</span>
                </>
              ) : (
                <span style={{ fontSize: 12, fontFamily: T.mono, color: T.textDim }}>No active missions</span>
              )}
            </div>
          </div>
          <NewMissionButton onSelectAgent={(agent) => onChatWithAgent?.({ name: agent.name, color: agent.color, tagline: agent.tagline, starter: "" })} />
        </div>

        {/* Mission cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginTop: 20 }}>
          {MISSIONS.map(m => (
            <MissionCard
              key={m.id}
              mission={m}
              status={statuses[m.id]}
              onTogglePause={() => togglePause(m.id)}
              onStop={() => stop(m.id)}
              onOpen={() => onOpenConversation?.(m.conversationId, m.agentName, m.agentColor)}
            />
          ))}
        </div>
      </div>

      {/* Right panel — live activity feed */}
      <LiveActivityFeed />
    </div>
  );
}

// ── New Mission button with agent picker dropdown ────────────────────────────

function NewMissionButton({ onSelectAgent }: { onSelectAgent: (agent: typeof AVAILABLE_AGENTS[number]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ background: T.text, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontFamily: T.mono, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
      >
        + New Mission
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
          <path d="M2 3.5l3 3 3-3" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0,
          background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)", padding: 6,
          minWidth: 280, zIndex: 100, animation: "fadeUp .15s ease",
        }}>
          <div style={{ padding: "6px 10px 8px", fontSize: 10, fontFamily: T.mono, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Choose an agent
          </div>
          {AVAILABLE_AGENTS.map(agent => (
            <AgentPickerRow key={agent.name} agent={agent} onSelect={() => { onSelectAgent(agent); setOpen(false); }} />
          ))}
        </div>
      )}
    </div>
  );
}

function AgentPickerRow({ agent, onSelect }: { agent: typeof AVAILABLE_AGENTS[number]; onSelect: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%",
        padding: "9px 10px", borderRadius: 7, border: "none",
        background: hov ? T.bg : "transparent",
        cursor: "pointer", transition: "background .1s",
        textAlign: "left",
      }}
    >
      <div style={{ width: 26, height: 26, borderRadius: 7, background: `${agent.color}14`, border: `1px solid ${agent.color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 600, color: agent.color }}>{agent.icon}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: T.text }}>{agent.name}</div>
        <div style={{ fontSize: 10, color: T.textDim, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{agent.tagline}</div>
      </div>
    </button>
  );
}

// ── Live Activity Feed (terminal-style) ──────────────────────────────────────

function LiveActivityFeed() {
  const [lines, setLines] = useState<LogLine[]>(() =>
    SEED_LOGS.map((l, i) => ({ ...l, id: i }))
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const streamIdx = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      if (streamIdx.current >= STREAMING_LOGS.length) {
        streamIdx.current = 0;
      }
      const next = STREAMING_LOGS[streamIdx.current];
      streamIdx.current++;
      setLines(prev => [...prev, { ...next, id: prev.length }]);
    }, 3200 + Math.random() * 1800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines.length]);

  return (
    <div style={{
      width: 340, flexShrink: 0,
      background: T.bg, borderLeft: "none",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Feed header */}
      <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.green, display: "inline-block", animation: "pulse 2s infinite" }} />
        <span style={{ fontSize: 12, fontFamily: T.mono, fontWeight: 500, color: T.text }}>Live Activity</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, fontFamily: T.mono, color: T.textDim }}>auto-scroll</span>
      </div>

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

// ── Mission card ─────────────────────────────────────────────────────────────

function MissionCard({ mission, status, onTogglePause, onStop, onOpen }: {
  mission: Mission; status: MissionStatus; onTogglePause: () => void; onStop: () => void; onOpen: () => void;
}) {
  const initials = mission.agentName.split(" ").map(w => w[0]).join("").slice(0, 2);
  const isRunning = status === "running";
  const isPaused = status === "paused";
  const isCompleted = status === "completed" || status === "failed";
  const [cardHov, setCardHov] = useState(false);

  const badge = isRunning
    ? { label: "Running", color: T.green, bg: T.greenLight, border: T.greenMid, pulse: true }
    : isPaused
    ? { label: "Paused", color: "#D97706", bg: "#FEF3C7", border: "#FDE68A", pulse: false }
    : status === "failed"
    ? { label: "Failed", color: "#DC2626", bg: "#FEE2E2", border: "#FECACA", pulse: false }
    : { label: "Completed", color: T.textDim, bg: T.bg, border: T.border, pulse: false };

  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setCardHov(true)}
      onMouseLeave={() => setCardHov(false)}
      style={{
        background: T.surface,
        border: `1px solid ${cardHov ? mission.agentColor + "50" : T.border}`,
        borderRadius: 12,
        padding: 18, display: "flex", flexDirection: "column", gap: 12,
        opacity: isCompleted ? 0.75 : isPaused ? 0.85 : 1,
        transition: "all .2s",
        cursor: "pointer",
        boxShadow: cardHov ? `0 4px 16px ${mission.agentColor}12` : "none",
      }}
    >
      {/* Header: agent tag + status badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: `${mission.agentColor}18`, border: `1.5px solid ${mission.agentColor}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: mission.agentColor }}>{initials}</span>
          </div>
          <span style={{ fontSize: 10, fontFamily: T.mono, fontWeight: 600, color: mission.agentColor }}>{mission.agentName}</span>
        </div>
        <span style={{
          display: "flex", alignItems: "center", gap: 5,
          fontSize: 10, fontFamily: T.mono, fontWeight: 500,
          color: badge.color, background: badge.bg,
          borderRadius: 100, padding: "3px 10px",
          border: `1px solid ${badge.border}`,
        }}>
          {badge.pulse && <span style={{ width: 5, height: 5, borderRadius: "50%", background: badge.color, display: "inline-block", animation: "pulse 2s infinite" }} />}
          {badge.label}
        </span>
      </div>

      {/* Mission title + goal */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.text, lineHeight: 1.3 }}>{mission.title}</div>
        <div style={{ fontSize: 11, color: T.textDim, lineHeight: 1.5, marginTop: 4 }}>{mission.goal}</div>
      </div>

      {/* Stats bar */}
      <div style={{ display: "flex", background: T.bg, borderRadius: 8, overflow: "hidden", border: `1px solid ${T.border}` }}>
        {mission.stats.map((s, i) => (
          <div key={s.label} style={{ flex: 1, padding: "7px 10px", textAlign: "center", borderRight: i < mission.stats.length - 1 ? `1px solid ${T.border}` : "none" }}>
            <div style={{ fontSize: 14, fontWeight: 600, fontFamily: T.mono, color: i === 0 ? mission.agentColor : T.text }}>{s.value}{s.suffix ?? ""}</div>
            <div style={{ fontSize: 8, fontFamily: T.mono, color: T.textDim, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Per-mission activity (latest 3) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {mission.activity.map((entry, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderTop: i > 0 ? `1px solid ${T.border}` : "none" }}>
            <span style={{
              width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
              background: entry.status === "in_progress" ? (isRunning ? T.green : "#D97706") : mission.agentColor,
              opacity: entry.status === "done" ? 0.4 : 1,
            }} />
            <span style={{ flex: 1, fontSize: 11, color: T.textMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.text}</span>
            <span style={{ fontSize: 10, fontFamily: T.mono, flexShrink: 0, color: entry.status === "in_progress" ? (isRunning ? T.green : "#D97706") : T.textDim }}>{entry.time}</span>
          </div>
        ))}
      </div>

      {/* Controls */}
      {!isCompleted && (
        <div style={{ display: "flex", gap: 8, borderTop: `1px solid ${T.border}`, paddingTop: 10 }} onClick={e => e.stopPropagation()}>
          <ControlBtn
            onClick={onTogglePause}
            icon={isRunning ? <PauseIcon /> : <PlayIcon />}
            label={isRunning ? "Pause" : "Resume"}
            color={isRunning ? T.textMid : T.green}
            hoverColor={isRunning ? "#D97706" : T.green}
          />
          <ControlBtn
            onClick={onStop}
            icon={<StopIcon />}
            label="Stop"
            color={T.textDim}
            hoverColor="#DC2626"
          />
          <div style={{ flex: 1 }} />
          <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontFamily: T.mono, color: T.textDim, alignSelf: "center" }}>
            <ClockIcon />{mission.schedule}
          </span>
        </div>
      )}

      {/* Completed footer */}
      {isCompleted && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
          <CheckIcon color={mission.agentColor} />
          <span style={{ fontSize: 10, fontFamily: T.mono, color: T.textDim }}>Started {mission.startedAt}</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 10, fontFamily: T.mono, color: T.textDim }}>{mission.schedule}</span>
        </div>
      )}
    </div>
  );
}

// ── Control button ───────────────────────────────────────────────────────────

function ControlBtn({ onClick, icon, label, color, hoverColor }: {
  onClick: () => void; icon: React.ReactNode; label: string; color: string; hoverColor: string;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "6px 12px", borderRadius: 6,
        border: `1px solid ${hov ? hoverColor + "40" : T.border}`,
        background: hov ? `${hoverColor}08` : "transparent",
        color: hov ? hoverColor : color,
        fontSize: 11, fontFamily: T.mono, fontWeight: 500,
        cursor: "pointer", transition: "all .15s",
      }}
    >
      {icon}{label}
    </button>
  );
}

// ── Icons ────────────────────────────────────────────────────────────────────

function PauseIcon() { return <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="4" height="12" rx="1" /><rect x="9" y="2" width="4" height="12" rx="1" /></svg>; }
function PlayIcon() { return <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5v11l9-5.5z" /></svg>; }
function StopIcon() { return <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="3" width="10" height="10" rx="1.5" /></svg>; }
function ClockIcon() { return <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ display: "inline-block", verticalAlign: "-1px", marginRight: 3 }}><circle cx="8" cy="8" r="6.5" /><path d="M8 4.5V8l2.5 1.5" /></svg>; }
function CheckIcon({ color }: { color: string }) { return <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><path d="M3 8.5l3.5 3.5L13 5" /></svg>; }
