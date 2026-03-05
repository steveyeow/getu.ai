import { useState } from "react";
import { T } from "../../lib/theme.js";
import { useTasks } from "../../hooks/useTasks.js";
import type { Task, TaskStatus } from "../../../shared/types.js";

const STATUS_COLOR: Record<TaskStatus, string> = {
  pending:   T.textDim,
  running:   T.green,
  completed: "#2563EB",
  failed:    "#DC2626",
  paused:    T.textDim,
};

const AGENT_COLOR: Record<string, string> = {
  SCOUT:     "#2563EB",
  PULSE:     "#D97706",
  FORGE:     "#7C3AED",
  HERALD:    "#0891B2",
  LENS:      "#BE185D",
  COMMUNITY: "#059669",
};

interface Props { userId: string; onChat: () => void; }

export default function MissionCenter({ userId, onChat }: Props) {
  const { tasks, loading, pause, remove, setPriority } = useTasks(userId);
  const [filter, setFilter]               = useState<TaskStatus | "all">("all");
  const [expanded, setExpanded]           = useState<string | null>(null);

  const filtered = filter === "all" ? tasks : tasks.filter(t => t.status === filter);

  const counts = {
    running:   tasks.filter(t => t.status === "running").length,
    pending:   tasks.filter(t => t.status === "pending").length,
    completed: tasks.filter(t => t.status === "completed").length,
    failed:    tasks.filter(t => t.status === "failed").length,
  };

  const latestResult = tasks.filter(t => t.status === "completed")[0];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600 }}>Missions</h1>
          {counts.running > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: T.mono, fontSize: 11, color: T.green }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, display: "inline-block", animation: "pulse 2s infinite" }} />
              {counts.running} running
            </div>
          )}
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
          {([
            { label: "Running",   value: counts.running,   accent: T.green },
            { label: "Pending",   value: counts.pending,   accent: T.textMid },
            { label: "Completed", value: counts.completed, accent: "#2563EB" },
            { label: "Total",     value: tasks.length,     accent: T.textDim },
          ]).map(s => (
            <div key={s.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, padding: "12px 16px" }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: s.value > 0 ? s.accent : T.textDim }}>{s.value}</div>
              <div style={{ fontSize: 11, fontFamily: T.mono, color: T.textDim, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Latest result */}
        {latestResult && (
          <div style={{ background: T.greenLight, border: `1px solid ${T.greenMid}`, borderRadius: 9, padding: "10px 14px", display: "flex", gap: 10, marginBottom: 20, alignItems: "flex-start" }}>
            <div style={{ fontSize: 10, fontFamily: T.mono, color: T.green, fontWeight: 600, paddingTop: 2, flexShrink: 0 }}>LATEST</div>
            <div style={{ fontSize: 12, color: "#166534", lineHeight: 1.6 }}>
              <strong>{latestResult.agentName}</strong>: {latestResult.resultSummary ?? latestResult.title}
            </div>
          </div>
        )}

        {/* Filter pills */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {(["all", "running", "pending", "completed", "failed"] as const).map(s => {
            const count = s === "all" ? tasks.length : counts[s] ?? 0;
            const active = filter === s;
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                style={{
                  background:   active ? T.text : T.surface,
                  color:        active ? "#fff" : T.textMid,
                  border:       `1px solid ${active ? T.text : T.border}`,
                  borderRadius: 100,
                  padding:      "4px 12px",
                  fontSize:     12,
                  fontFamily:   T.mono,
                  cursor:       "pointer",
                }}
              >
                {s} {count > 0 && <span style={{ opacity: .6 }}>({count})</span>}
              </button>
            );
          })}
        </div>

        {/* Task list */}
        {loading ? (
          <div style={{ textAlign: "center", color: T.textDim, fontSize: 13, padding: 40 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <EmptyMissions onChat={onChat} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                expanded={expanded === task.id}
                onToggle={() => setExpanded(expanded === task.id ? null : task.id)}
                onPause={() => pause(task.id)}
                onDelete={() => remove(task.id)}
                onSetPriority={p => setPriority(task.id, p)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Task Card ─────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task:         Task;
  expanded:     boolean;
  onToggle:     () => void;
  onPause:      () => void;
  onDelete:     () => void;
  onSetPriority: (priority: number) => void;
}

function TaskCard({ task, expanded, onToggle, onPause, onDelete, onSetPriority }: TaskCardProps) {
  const agentColor  = AGENT_COLOR[task.agentName] ?? T.textMid;
  const statusColor = STATUS_COLOR[task.status];
  const isRunning   = task.status === "running";

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden", animation: "slideIn .2s ease" }}>
      {/* Card header */}
      <div
        onClick={onToggle}
        style={{ padding: "14px 16px", cursor: "pointer", display: "flex", gap: 12, alignItems: "flex-start" }}
      >
        {/* Agent badge */}
        <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, background: `${agentColor}15`, border: `1px solid ${agentColor}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 500, color: agentColor }}>{task.agentName.slice(0, 3)}</span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {task.title}
            </span>
            <StatusBadge status={task.status} color={statusColor} running={isRunning} />
          </div>
          <div style={{ fontSize: 11, color: T.textDim, fontFamily: T.mono, marginTop: 3 }}>
            {task.agentName} · {formatTime(task.createdAt)}
          </div>
          {task.resultSummary && (
            <div style={{ fontSize: 12, color: T.textMid, marginTop: 6, lineHeight: 1.5 }}>
              {task.resultSummary}
            </div>
          )}
        </div>

        <ChevronIcon rotated={expanded} />
      </div>

      {/* Expanded: goal + actions */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${T.border}`, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 12, color: T.textMid, lineHeight: 1.6 }}>
            <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim, display: "block", marginBottom: 4 }}>GOAL</span>
            {task.goal}
          </div>

          {/* Result data summary */}
          {task.resultData && <ResultSummary data={task.resultData} />}

          {/* Priority (pending/paused only) */}
          {(task.status === "pending" || task.status === "paused") && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontFamily: T.mono, color: T.textDim }}>Priority</span>
              {[1, 2, 3, 4, 5].map(p => (
                <button
                  key={p}
                  onClick={() => onSetPriority(p)}
                  style={{
                    width: 28, height: 28, borderRadius: 6, border: `1px solid ${task.priority === p ? T.text : T.border}`,
                    background: task.priority === p ? T.text : T.surface, color: task.priority === p ? "#fff" : T.textMid,
                    fontSize: 12, fontWeight: 500, fontFamily: T.mono, cursor: "pointer",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 6 }}>
            {(task.status === "running" || task.status === "pending") && (
              <ActionBtn onClick={onPause} label="Pause" />
            )}
            {(task.status === "completed" || task.status === "failed" || task.status === "paused") && (
              <ActionBtn onClick={onDelete} label="Delete" danger />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, color, running }: { status: TaskStatus; color: string; running: boolean }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 100, background: `${color}12`, flexShrink: 0 }}>
      {running && <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, display: "inline-block", animation: "pulse 1.4s infinite" }} />}
      <span style={{ fontSize: 10, fontFamily: T.mono, color }}>{status}</span>
    </span>
  );
}

const STATUS_ICON: Record<string, string> = { pass: "✓", fail: "✗", warn: "⚠" };
const STATUS_CLR:  Record<string, string> = { pass: T.green, fail: "#DC2626", warn: "#D97706" };

function ResultSummary({ data }: { data: Task["resultData"] }) {
  if (!data) return null;

  if (data.type === "geo_report") {
    const r      = data.report;
    const grade  = r.grade;
    const gradeColor = r.overallScore >= 80 ? T.green : r.overallScore >= 55 ? "#D97706" : "#DC2626";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Score banner */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, background: T.bg, borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: gradeColor, fontFamily: T.mono, lineHeight: 1 }}>{grade}</div>
            <div style={{ fontSize: 10, color: T.textDim, fontFamily: T.mono }}>grade</div>
          </div>
          <div style={{ width: 1, height: 36, background: T.border }} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, color: T.text }}>{r.overallScore}<span style={{ fontSize: 12, color: T.textDim }}>/100</span></div>
            <div style={{ fontSize: 11, color: T.textDim, fontFamily: T.mono }}>
              Foundational {r.foundationalScore}/60 · Intelligence {r.intelligenceScore}/40
            </div>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 11, color: T.textDim, fontFamily: T.mono, textAlign: "right" }}>
            <div>{new URL(r.url).hostname}</div>
            <div>{new Date(r.checkedAt).toLocaleDateString()}</div>
          </div>
        </div>

        {/* Check grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
          {r.checks.map(c => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", background: T.bg, borderRadius: 5 }}>
              <span style={{ fontSize: 11, color: STATUS_CLR[c.status], fontFamily: T.mono, flexShrink: 0 }}>{STATUS_ICON[c.status]}</span>
              <span style={{ fontSize: 11, color: T.textMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
              <span style={{ marginLeft: "auto", fontSize: 10, color: T.textDim, fontFamily: T.mono, flexShrink: 0 }}>{c.score}/{c.maxScore}</span>
            </div>
          ))}
        </div>

        {/* Top fixes */}
        {r.topFixes.length > 0 && (
          <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 7, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, fontFamily: T.mono, color: "#92400e", marginBottom: 6, letterSpacing: 0.4 }}>TOP FIXES</div>
            {r.topFixes.map((fix, i) => (
              <div key={i} style={{ fontSize: 11, color: "#78350f", lineHeight: 1.55, marginBottom: 4 }}>
                {i + 1}. {fix}
              </div>
            ))}
          </div>
        )}

        {/* AI test prompts */}
        {r.aiTestPrompts.length > 0 && (
          <div style={{ background: T.bg, borderRadius: 7, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, fontFamily: T.mono, color: T.textDim, marginBottom: 6, letterSpacing: 0.4 }}>TEST IN CHATGPT / PERPLEXITY / CLAUDE</div>
            {r.aiTestPrompts.map((q, i) => (
              <div key={i} style={{ fontSize: 11, color: T.textMid, fontFamily: T.mono, padding: "3px 0", borderBottom: i < r.aiTestPrompts.length - 1 ? `1px solid ${T.border}` : "none" }}>
                "{q}"
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (data.type === "signal_posts") {
    return (
      <div style={{ background: T.bg, borderRadius: 6, padding: "8px 10px", fontSize: 12, color: T.textMid }}>
        Found <strong style={{ color: T.text }}>{data.posts.length}</strong> signal posts
        {data.posts.slice(0, 2).map((p: { url: string; platform: string; content: string }) => (
          <div key={p.url} style={{ marginTop: 4, display: "flex", gap: 6, alignItems: "flex-start" }}>
            <span style={{ fontSize: 10, fontFamily: T.mono, color: T.green, flexShrink: 0 }}>{p.platform}</span>
            <a href={p.url} target="_blank" rel="noreferrer" style={{ color: T.textMid, textDecoration: "none", fontSize: 11, lineHeight: 1.4 }}>
              {p.content.slice(0, 80)}…
            </a>
          </div>
        ))}
      </div>
    );
  }
  if (data.type === "icp_profiles") {
    return (
      <div style={{ background: T.bg, borderRadius: 6, padding: "8px 10px", fontSize: 12, color: T.textMid }}>
        Found <strong style={{ color: T.text }}>{data.profiles.length}</strong> ICP-matching profiles
      </div>
    );
  }
  return null;
}

function ActionBtn({ onClick, label, danger }: { onClick: () => void; label: string; danger?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:   "none",
        border:       `1px solid ${danger && hov ? "#DC2626" : T.border}`,
        borderRadius: 6,
        padding:      "4px 10px",
        fontSize:     11,
        color:        danger && hov ? "#DC2626" : T.textMid,
        fontFamily:   T.mono,
        cursor:       "pointer",
      }}
    >
      {label}
    </button>
  );
}

function EmptyMissions({ onChat }: { onChat: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <div style={{ fontSize: 32, marginBottom: 12, color: T.textDim }}>◻</div>
      <div style={{ fontSize: 13, color: T.textMid, marginBottom: 16 }}>No missions yet.</div>
      <button
        onClick={onChat}
        style={{ background: T.text, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, cursor: "pointer" }}
      >
        Chat with ARIA to get started →
      </button>
    </div>
  );
}

function ChevronIcon({ rotated }: { rotated: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, transform: rotated ? "rotate(180deg)" : "none", transition: "transform .15s", marginTop: 2 }}>
      <path d="M3 5l4 4 4-4" stroke={T.textDim} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000)  return "just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return d.toLocaleDateString();
}
