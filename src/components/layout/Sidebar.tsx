import { useState } from "react";
import { T } from "../../lib/theme.js";
import { supabase } from "../../lib/supabase.js";
import type { Task, Conversation } from "../../../shared/types.js";

export type SidebarTab = "chat" | "missions" | "skills" | "agents";

interface Props {
  activeTab:              SidebarTab;
  onTabChange:            (tab: SidebarTab) => void;
  tasks:                  Task[];
  userEmail:              string;
  conversations:          Conversation[];
  activeConvId?:          string;
  onNewChat:              () => void;
  onSelectConversation:   (id: string) => void;
}

export default function Sidebar({
  activeTab, onTabChange, tasks, userEmail,
  conversations, activeConvId, onNewChat, onSelectConversation,
}: Props) {
  const [hovSignOut, setHovSignOut] = useState(false);

  const runningCount = tasks.filter(t => t.status === "running").length;

  return (
    <aside style={{
      width:         220,
      flexShrink:    0,
      background:    T.bg,
      borderRight:   `1px solid ${T.border}`,
      display:       "flex",
      flexDirection: "column",
      height:        "100%",
    }}>
      {/* Logo */}
      <div style={{ padding: "16px 18px 12px", borderBottom: `1px solid ${T.border}` }}>
        <span style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 500, color: T.text }}>
          getu<span style={{ color: T.green }}>.ai</span>
        </span>
      </div>

      {/* New Chat button */}
      <div style={{ padding: "10px 8px 6px" }}>
        <NewChatButton onClick={onNewChat} />
      </div>

      {/* Nav */}
      <nav style={{ padding: "4px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
        <NavItem
          icon={<MissionsIcon />}
          label="Missions"
          active={activeTab === "missions"}
          onClick={() => onTabChange("missions")}
          badge={runningCount > 0 ? runningCount : undefined}
        />
        <NavItem icon={<AgentsIcon />}  label="Agents"         active={activeTab === "agents"}   onClick={() => onTabChange("agents")} />
        <NavItem icon={<SkillsIcon />}  label="Skills"         active={activeTab === "skills"}   onClick={() => onTabChange("skills")} />
      </nav>

      {/* Conversation history */}
      {conversations.length > 0 && (
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px 4px" }}>
          <div style={{ fontSize: 10, color: T.textDim, fontFamily: T.mono, letterSpacing: 0.5, padding: "2px 10px 6px", textTransform: "uppercase" }}>
            Recent chats
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {conversations.map(conv => (
              <ConvItem
                key={conv.id}
                conv={conv}
                active={conv.id === activeConvId}
                onClick={() => onSelectConversation(conv.id)}
              />
            ))}
          </div>
        </div>
      )}
      {conversations.length === 0 && <div style={{ flex: 1 }} />}

      {/* Running indicator */}
      {runningCount > 0 && (
        <div style={{ margin: "0 8px 8px", padding: "8px 10px", background: T.greenLight, border: `1px solid ${T.greenMid}`, borderRadius: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, display: "inline-block", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 11, color: T.green, fontFamily: T.mono }}>
              {runningCount} agent{runningCount > 1 ? "s" : ""} running
            </span>
          </div>
        </div>
      )}

      {/* User + sign out */}
      <div style={{ padding: "10px 12px", borderTop: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 11, color: T.textDim, marginBottom: 6, fontFamily: T.mono, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {userEmail}
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          onMouseEnter={() => setHovSignOut(true)}
          onMouseLeave={() => setHovSignOut(false)}
          style={{
            background:   "none",
            border:       `1px solid ${T.border}`,
            borderRadius: 6,
            padding:      "5px 10px",
            fontSize:     11,
            color:        hovSignOut ? T.text : T.textDim,
            fontFamily:   T.mono,
            width:        "100%",
            textAlign:    "left",
            transition:   "color .1s",
            cursor:       "pointer",
          }}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

// ── New Chat Button ────────────────────────────────────────────────────────────

function NewChatButton({ onClick }: { onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:      "flex",
        alignItems:   "center",
        gap:          6,
        width:        "100%",
        padding:      "7px 10px",
        background:   hov ? T.sidebarHov : "transparent",
        border:       `1px solid ${hov ? T.borderMid : T.border}`,
        borderRadius: 7,
        fontSize:     13,
        color:        T.text,
        fontWeight:   500,
        cursor:       "pointer",
        transition:   "background .1s, border-color .1s",
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1, color: T.textMid }}>+</span>
      New chat
    </button>
  );
}

// ── Conversation Item ──────────────────────────────────────────────────────────

function ConvItem({ conv, active, onClick }: { conv: Conversation; active: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  const title = conv.title || "New conversation";
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={title}
      style={{
        display:      "block",
        width:        "100%",
        padding:      "6px 10px",
        borderRadius: 6,
        background:   active ? T.sidebarAct : hov ? T.sidebarHov : "transparent",
        border:       "none",
        fontSize:     12,
        color:        active ? T.text : T.textMid,
        textAlign:    "left",
        cursor:       "pointer",
        overflow:     "hidden",
        textOverflow: "ellipsis",
        whiteSpace:   "nowrap",
        transition:   "background .1s",
      }}
    >
      {title}
    </button>
  );
}

// ── Nav Item ──────────────────────────────────────────────────────────────────

interface NavItemProps {
  icon:    React.ReactNode;
  label:   string;
  active:  boolean;
  onClick: () => void;
  badge?:  number;
}

function NavItem({ icon, label, active, onClick, badge }: NavItemProps) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:      "flex",
        alignItems:   "center",
        gap:          8,
        padding:      "8px 10px",
        borderRadius: 7,
        background:   active ? T.sidebarAct : hov ? T.sidebarHov : "transparent",
        border:       "none",
        color:        active ? T.text : T.textMid,
        fontSize:     13,
        fontWeight:   active ? 500 : 400,
        width:        "100%",
        textAlign:    "left",
        cursor:       "pointer",
      }}
    >
      <span style={{ opacity: active ? 1 : 0.6, flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge !== undefined && (
        <span style={{ background: T.green, color: "#fff", borderRadius: 100, fontSize: 10, padding: "1px 6px", fontFamily: T.mono }}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const ChatIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M12.5 3h-10A.5.5 0 002 3.5v7a.5.5 0 00.5.5H5l2.5 2.5L10 11h2.5a.5.5 0 00.5-.5v-7a.5.5 0 00-.5-.5z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
  </svg>
);
const SkillsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M7.5 1.5l1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9L3.9 12.5l.7-4L1.7 5.7l4-.6z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
  </svg>
);
const MissionsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M2 4h11M2 7.5h8M2 11h5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);
const AgentsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <circle cx="7.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.1"/>
    <path d="M2 13c0-2.761 2.462-5 5.5-5s5.5 2.239 5.5 5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
  </svg>
);
