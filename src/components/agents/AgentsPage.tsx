import { useState } from "react";
import { T } from "../../lib/theme.js";

export const AGENTS = [
  {
    name:       "GEO",
    tagline:    "AI Engine Optimization auditing",
    color:      "#0891B2",
    status:     "active" as const,
    desc:       "Audits any website for GEO status — AI bot access, llms.txt, structured data, and content quality. Produces a scored report with prioritized fixes.",
    caps:       ["AI bot access check", "llms.txt validation", "JSON-LD audit", "Content quality score", "Priority fix list"],
    platforms:  ["Any website"],
    starter:    "Check the GEO status of https://",
  },
  {
    name:       "SCOUT",
    tagline:    "Signal finding & ICP prospecting",
    color:      "#2563EB",
    status:     "active" as const,
    desc:       "Finds posts where people express the pain your product solves, and ICP-matching people on Twitter, LinkedIn, and Reddit. Drafts personalized outreach.",
    caps:       ["Signal post finding", "ICP people search", "Outreach drafting"],
    platforms:  ["Twitter/X", "LinkedIn", "Reddit"],
    starter:    "I want to find signal posts about ",
  },
  {
    name:       "PULSE",
    tagline:    "Twitter content & thought leadership",
    color:      "#D97706",
    status:     "soon" as const,
    desc:       "Builds your brand on Twitter — writes threads aligned with your ICP's pain points, joins conversations, grows your audience.",
    caps:       ["Thread writing", "Trend monitoring", "Engagement replies", "Audience building"],
    platforms:  ["Twitter/X"],
    starter:    "",
  },
  {
    name:       "FORGE",
    tagline:    "SEO blog content pipeline",
    color:      "#7C3AED",
    status:     "soon" as const,
    desc:       "Researches keywords your ICP searches for, writes SEO-optimized blog posts, maintains your content calendar.",
    caps:       ["Keyword research", "Blog writing", "On-page SEO", "Content calendar"],
    platforms:  ["Blog / CMS"],
    starter:    "",
  },
  {
    name:       "COMMUNITY",
    tagline:    "Discord & Telegram distribution",
    color:      "#059669",
    status:     "soon" as const,
    desc:       "Finds Discord servers and Telegram groups where your ICP gathers. Drafts authentic intro messages for human review.",
    caps:       ["Community discovery", "Intro drafting", "Relevance scoring"],
    platforms:  ["Discord", "Telegram"],
    starter:    "",
  },
  {
    name:       "HERALD",
    tagline:    "Email newsletter & nurture",
    color:      "#BE185D",
    status:     "soon" as const,
    desc:       "Writes and sends your newsletter, builds drip sequences, tracks open rates.",
    caps:       ["Newsletter writing", "Drip sequences", "A/B testing", "Segment targeting"],
    platforms:  ["Email"],
    starter:    "",
  },
] as const;

export type AgentInfo = (typeof AGENTS)[number];

interface Props {
  onNavigate: (tab: "missions") => void;
  onChatWithAgent: (agent: AgentInfo) => void;
}

export default function AgentsPage({ onNavigate, onChatWithAgent }: Props) {
  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "24px 20px" }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: T.text, fontFamily: T.mono }}>Agents</h2>
        <p style={{ fontSize: 12, color: T.textDim, marginTop: 4 }}>Click Chat to open in the main chat with a starter prompt pre-filled.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {AGENTS.map(agent => (
          <AgentCard key={agent.name} agent={agent} onChat={onChatWithAgent} />
        ))}
      </div>
    </div>
  );
}

// ── Agent card ─────────────────────────────────────────────────────────────────

function AgentCard({ agent, onChat }: { agent: AgentInfo; onChat: (agent: AgentInfo) => void }) {
  const [hov, setHov] = useState(false);
  const isActive = agent.status === "active";

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:    T.surface,
        border:        `1px solid ${hov && isActive ? agent.color + "40" : T.border}`,
        borderRadius:  12,
        padding:      20,
        display:       "flex",
        flexDirection: "column",
        gap:           14,
        transition:   "border-color .15s ease",
        position:      "relative",
      }}
    >
      {agent.status === "soon" && (
        <span style={{ position: "absolute", top: 12, right: 12, fontSize: 10, fontFamily: T.mono, color: T.textDim, background: T.bg, borderRadius: 100, padding: "2px 8px", border: `1px solid ${T.border}` }}>
          Coming soon
        </span>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <AgentAvatar name={agent.name} color={agent.color} size={44} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 600, color: agent.color }}>{agent.name}</div>
          <div style={{ fontSize: 12, color: T.textMid, lineHeight: 1.3 }}>{agent.tagline}</div>
        </div>
      </div>
      <p style={{ fontSize: 12, color: T.text, lineHeight: 1.6, margin: 0, flex: 1 }}>{agent.desc}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {agent.caps.slice(0, 4).map(c => (
          <span key={c} style={{ fontSize: 10, color: agent.color, background: `${agent.color}14`, borderRadius: 5, padding: "3px 8px", fontFamily: T.mono }}>{c}</span>
        ))}
      </div>
      <div style={{ fontSize: 10, color: T.textDim }}>{agent.platforms.join(", ")}</div>
      {isActive && (
        <button
          onClick={() => onChat(agent)}
          style={{
            display:         "inline-flex",
            alignItems:      "center",
            justifyContent:  "center",
            gap:             6,
            padding:         "10px 16px",
            background:      hov ? agent.color : T.border,
            color:           hov ? "#fff" : T.textMid,
            border:          "none",
            borderRadius:    8,
            fontSize:        13,
            fontWeight:      500,
            fontFamily:      T.mono,
            cursor:          "pointer",
            transition:      "background .15s, color .15s",
          }}
        >
          <ChatIcon />
          Chat with {agent.name}
        </button>
      )}
    </div>
  );
}

// ── Shared visuals ────────────────────────────────────────────────────────────

function AgentAvatar({ name, color, size }: { name: string; color: string; size: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.28, background: `${color}18`, border: `1.5px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontFamily: T.mono, fontSize: size * 0.38, fontWeight: 600, color }}>{name[0]}</span>
    </div>
  );
}

function ChatIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
      <path d="M12.5 3h-10A.5.5 0 002 3.5v7a.5.5 0 00.5.5H5l2.5 2.5L10 11h2.5a.5.5 0 00.5-.5v-7a.5.5 0 00-.5-.5z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
