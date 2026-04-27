import { T } from "../../lib/theme.js";
import type { Task } from "../../../shared/types.js";

const AGENT_META = [
  { name: "SCOUT",  role: "Signal & Prospecting", color: "#2563EB", desc: "Finds signal posts and ICP-matching people on Twitter, LinkedIn, Reddit" },
  { name: "PULSE",  role: "Twitter Content",       color: "#D97706", desc: "Builds thought leadership — threads, engagement, audience growth", soon: true },
  { name: "FORGE",  role: "SEO Content",           color: "#7C3AED", desc: "Keyword research, blog writing, content calendar", soon: true },
];

interface Props {
  tasks:      Task[];
  onChat:     () => void;
}

export default function Dashboard({ tasks, onChat }: Props) {
  const running   = tasks.filter(t => t.status === "running");
  const completed = tasks.filter(t => t.status === "completed");
  const pending   = tasks.filter(t => t.status === "pending");

  // Morning report: surface the most recent completed task result
  const latestResult = completed[0];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: 18, fontWeight: 600 }}>Dashboard</h1>
          {running.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: T.mono, fontSize: 11, color: T.green }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, display: "inline-block", animation: "pulse 2s infinite" }} />
              {running.length} running
            </div>
          )}
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {[
            { label: "Active agents",  value: running.length },
            { label: "Pending tasks",  value: pending.length },
            { label: "Completed",      value: completed.length },
            { label: "Total missions", value: tasks.length },
          ].map(s => (
            <div key={s.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 18px" }}>
              <div style={{ fontSize: 24, fontWeight: 600, color: T.text }}>{s.value}</div>
              <div style={{ fontFamily: T.mono, fontSize: 11, color: T.textDim, marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Morning report / latest result */}
        {latestResult ? (
          <div style={{ background: T.greenLight, border: `1px solid ${T.greenMid}`, borderRadius: 10, padding: "13px 16px", display: "flex", gap: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: T.surface, border: `1px solid ${T.greenMid}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.mono, fontSize: 10, color: T.green, flexShrink: 0 }}>A</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.green, marginBottom: 3, fontFamily: T.mono }}>LATEST RESULT</div>
              <div style={{ fontSize: 13, color: T.text, lineHeight: 1.65 }}>
                <strong>{latestResult.agentName}</strong>: {latestResult.resultSummary ?? latestResult.title}
              </div>
            </div>
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "20px 20px", textAlign: "center" }}>
            <p style={{ fontSize: 14, color: T.textMid, marginBottom: 12 }}>No Missions running yet. Chat with getu.ai to get started.</p>
            <button
              onClick={onChat}
              style={{ background: T.text, color: T.bg, border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, cursor: "pointer" }}
            >
              Chat with getu.ai →
            </button>
          </div>
        ) : null}

        {/* Active agent cards */}
        {running.length > 0 && (
          <>
            <h2 style={{ fontSize: 14, fontWeight: 500, color: T.textMid, fontFamily: T.mono, letterSpacing: .5 }}>ACTIVE AGENTS</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {running.map(task => (
                <RunningTaskCard key={task.id} task={task} />
              ))}
            </div>
          </>
        )}

        {/* Agent roster */}
        <h2 style={{ fontSize: 14, fontWeight: 500, color: T.textMid, fontFamily: T.mono, letterSpacing: .5 }}>AGENT ROSTER</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {AGENT_META.map(agent => (
            <div key={agent.name} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, opacity: agent.soon ? .55 : 1 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: `${agent.color}12`, border: `1px solid ${agent.color}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 500, color: agent.color }}>{agent.name.slice(0,3)}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{agent.name}</div>
                <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>{agent.desc}</div>
              </div>
              {agent.soon
                ? <span style={{ fontSize: 10, fontFamily: T.mono, color: T.textDim, border: `1px solid ${T.border}`, borderRadius: 100, padding: "2px 8px" }}>soon</span>
                : <span style={{ fontSize: 10, fontFamily: T.mono, color: T.green, background: T.greenLight, borderRadius: 100, padding: "2px 8px" }}>ready</span>
              }
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

function RunningTaskCard({ task }: { task: Task }) {
  const color = ({ SCOUT: "#2563EB", PULSE: "#D97706", FORGE: "#7C3AED" } as Record<string, string>)[task.agentName] ?? T.textMid;
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 11, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <div style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 500, color }}>{task.agentName}</div>
          <div style={{ fontSize: 11, color: T.textDim, marginTop: 1 }}>{task.title}</div>
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontFamily: T.mono, color: T.green, background: T.greenLight, borderRadius: 100, padding: "2px 8px" }}>
          <span style={{ width: 4, height: 4, borderRadius: "50%", background: T.green, display: "inline-block", animation: "pulse 1.4s infinite" }} />
          running
        </span>
      </div>
      <div style={{ background: `${color}08`, border: `1px solid ${color}18`, borderRadius: 6, padding: "6px 10px", fontFamily: T.mono, fontSize: 11, color }}>
        <span style={{ opacity: .5 }}>goal: </span>{task.goal.slice(0, 80)}{task.goal.length > 80 ? "…" : ""}
      </div>
    </div>
  );
}
