import { useState } from "react";
import { T } from "../../lib/theme.js";
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
  collapsed:              boolean;
  onToggleCollapse:       () => void;
}

export default function Sidebar({
  activeTab, onTabChange, tasks, userEmail,
  conversations, activeConvId, onNewChat, onSelectConversation,
  collapsed, onToggleCollapse,
}: Props) {
  const runningCount = tasks.filter(t => t.status === "running").length;

  return (
    <aside style={{
      width:         collapsed ? 54 : 220,
      flexShrink:    0,
      background:    T.bg,
      borderRight:   `1px solid ${T.border}`,
      display:       "flex",
      flexDirection: "column",
      height:        "100%",
      transition:    "width .2s ease",
      overflow:      "hidden",
    }}>
      {/* Logo + collapse toggle */}
      <div style={{
        padding: collapsed ? "16px 0 12px" : "16px 18px 12px",
        borderBottom: `1px solid ${T.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "space-between",
        minHeight: 47,
      }}>
        {collapsed ? (
          <button
            onClick={onToggleCollapse}
            title="Expand sidebar"
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: 4, display: "flex", alignItems: "center",
            }}
          >
            <span style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 500, color: T.text }}>g<span style={{ color: T.green }}>.</span></span>
          </button>
        ) : (
          <>
            <span style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 500, color: T.text, whiteSpace: "nowrap" }}>
              getu<span style={{ color: T.green }}>.ai</span>
            </span>
            <CollapseButton onClick={onToggleCollapse} />
          </>
        )}
      </div>

      {/* New Chat button */}
      <div style={{ padding: collapsed ? "10px 8px 6px" : "10px 8px 6px" }}>
        {collapsed ? (
          <CollapsedNewChatButton onClick={onNewChat} />
        ) : (
          <NewChatButton onClick={onNewChat} />
        )}
      </div>

      {/* Nav */}
      <nav style={{ padding: "4px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
        <NavItem
          icon={<MissionsIcon />}
          label="Missions"
          active={activeTab === "missions"}
          onClick={() => onTabChange("missions")}
          badge={runningCount > 0 ? runningCount : undefined}
          collapsed={collapsed}
        />
        <NavItem icon={<AgentsIcon />} label="Agents" active={activeTab === "agents"} onClick={() => onTabChange("agents")} collapsed={collapsed} />
        <NavItem icon={<SkillsIcon />} label="Skills" active={activeTab === "skills"} onClick={() => onTabChange("skills")} collapsed={collapsed} />
      </nav>

      {/* Recent missions — hidden when collapsed */}
      {!collapsed && tasks.length > 0 && (
        <div style={{ padding: "10px 8px 4px" }}>
          <div style={{ fontSize: 10, color: T.textDim, fontFamily: T.mono, letterSpacing: 0.5, padding: "2px 10px 6px", textTransform: "uppercase" }}>
            Recent missions
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {tasks.slice(0, 5).map(task => (
              <MissionItem
                key={task.id}
                task={task}
                onClick={() => onTabChange("missions")}
              />
            ))}
          </div>
        </div>
      )}

      {/* Conversation history — hidden when collapsed */}
      {!collapsed && conversations.length > 0 && (
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
      {(collapsed || conversations.length === 0) && <div style={{ flex: 1 }} />}

      {/* Running indicator */}
      {runningCount > 0 && (
        collapsed ? (
          <div style={{ margin: "0 auto 8px", width: 6, height: 6, borderRadius: "50%", background: T.green, animation: "pulse 2s infinite" }} title={`${runningCount} agent${runningCount > 1 ? "s" : ""} running`} />
        ) : (
          <div style={{ margin: "0 8px 8px", padding: "8px 10px", background: T.greenLight, border: `1px solid ${T.greenMid}`, borderRadius: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, display: "inline-block", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 11, color: T.green, fontFamily: T.mono }}>
                {runningCount} agent{runningCount > 1 ? "s" : ""} running
              </span>
            </div>
          </div>
        )
      )}

      {/* User info */}
      <div style={{ padding: collapsed ? "10px 0" : "10px 12px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "center" }}>
        {collapsed ? (
          <span title={userEmail} style={{ width: 24, height: 24, borderRadius: "50%", background: T.sidebarAct, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: T.textMid, fontFamily: T.mono }}>
            {userEmail.charAt(0).toUpperCase()}
          </span>
        ) : (
          <div style={{ fontSize: 11, color: T.textDim, fontFamily: T.mono, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>
            {userEmail}
          </div>
        )}
      </div>
    </aside>
  );
}

// ── Collapse Button ───────────────────────────────────────────────────────────

function CollapseButton({ onClick }: { onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title="Collapse sidebar"
      style={{
        background: "none", border: "none", cursor: "pointer",
        padding: 4, display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 4,
        color: hov ? T.text : T.textDim,
        transition: "color .15s",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
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
      New mission
    </button>
  );
}

function CollapsedNewChatButton({ onClick }: { onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title="New mission"
      style={{
        display:      "flex",
        alignItems:   "center",
        justifyContent: "center",
        width:        "100%",
        padding:      "7px 0",
        background:   hov ? T.sidebarHov : "transparent",
        border:       `1px solid ${hov ? T.borderMid : T.border}`,
        borderRadius: 7,
        fontSize:     16,
        color:        T.textMid,
        cursor:       "pointer",
        transition:   "background .1s, border-color .1s",
      }}
    >
      +
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
  icon:       React.ReactNode;
  label:      string;
  active:     boolean;
  onClick:    () => void;
  badge?:     number;
  collapsed?: boolean;
}

function NavItem({ icon, label, active, onClick, badge, collapsed }: NavItemProps) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={collapsed ? label : undefined}
      style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: collapsed ? "center" : "flex-start",
        gap:            collapsed ? 0 : 8,
        padding:        collapsed ? "8px 0" : "8px 10px",
        borderRadius:   7,
        background:     active ? T.sidebarAct : hov ? T.sidebarHov : "transparent",
        border:         "none",
        color:          active ? T.text : T.textMid,
        fontSize:       13,
        fontWeight:     active ? 500 : 400,
        width:          "100%",
        textAlign:      "left",
        cursor:         "pointer",
        position:       "relative",
      }}
    >
      <span style={{ opacity: active ? 1 : 0.6, flexShrink: 0 }}>{icon}</span>
      {!collapsed && <span style={{ flex: 1 }}>{label}</span>}
      {!collapsed && badge !== undefined && (
        <span style={{ background: T.green, color: "#fff", borderRadius: 100, fontSize: 10, padding: "1px 6px", fontFamily: T.mono }}>
          {badge}
        </span>
      )}
      {collapsed && badge !== undefined && (
        <span style={{
          position: "absolute", top: 2, right: 4,
          width: 8, height: 8, borderRadius: "50%",
          background: T.green,
        }} />
      )}
    </button>
  );
}

// ── Mission Item ──────────────────────────────────────────────────────────────

const MISSION_STATUS_COLOR: Record<string, string> = {
  completed: "#16a34a",
  running:   "#D97706",
  failed:    "#DC2626",
  pending:   T.textDim,
  paused:    T.textDim,
};

function MissionItem({ task, onClick }: { task: Task; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  const statusColor = MISSION_STATUS_COLOR[task.status] ?? T.textDim;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={task.title}
      style={{
        display:      "flex",
        alignItems:   "center",
        gap:          8,
        width:        "100%",
        padding:      "5px 10px",
        borderRadius: 6,
        background:   hov ? T.sidebarHov : "transparent",
        border:       "none",
        textAlign:    "left",
        cursor:       "pointer",
        transition:   "background .1s",
      }}
    >
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: statusColor, flexShrink: 0,
        animation: task.status === "running" ? "pulse 2s infinite" : "none",
      }} />
      <span style={{
        fontSize: 12, color: T.textMid,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        flex: 1,
      }}>
        {task.title}
      </span>
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
