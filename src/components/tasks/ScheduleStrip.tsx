import { T, useTheme } from "../../lib/theme.js";

// One scheduled sub-task within a Mission. e.g. "Reply scan, every 30 min, 9am–6pm"
export interface ScheduleSegment {
  label:     string;          // e.g. "Reply scan"
  startHour: number;           // 0–24
  endHour:   number;           // 0–24
  frequency: string;           // e.g. "every 30 min" or "1× / day"
}

export interface ScheduleData {
  timezone:     string;        // e.g. "PST · UTC-8"
  nextRunIn:    string;        // e.g. "14m" or "—"
  segments:     ScheduleSegment[];
}

interface Props {
  data:  ScheduleData;
  color: string;               // agent color
  compact?: boolean;
}

/**
 * ScheduleStrip — a glanceable schedule display for Mission cards.
 *
 * Shows: timezone + next-run pill, a 24h bar with active windows tinted
 * in the agent color, and one row per scheduled sub-task with its frequency.
 */
export default function ScheduleStrip({ data, color, compact }: Props) {
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const trackBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
  const segmentBg = isDark ? `${color}55` : `${color}40`;

  // Merge overlapping segments to render a single union for the active-window bar
  const unionRanges = mergeRanges(data.segments.map(s => [s.startHour, s.endHour] as [number, number]));

  return (
    <div style={{
      background: T.bg,
      border: `1px solid ${T.border}`,
      borderRadius: 8,
      padding: compact ? "8px 10px" : "10px 12px",
      display: "flex",
      flexDirection: "column",
      gap: compact ? 6 : 8,
    }}>
      {/* Header: timezone + next run */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 9, fontFamily: T.mono, color: T.textDim, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Schedule · {data.timezone}
        </span>
        {data.nextRunIn && data.nextRunIn !== "—" && (
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontFamily: T.mono, color: T.green }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.green, animation: "pulse 2s infinite" }} />
            Next run in {data.nextRunIn}
          </span>
        )}
      </div>

      {/* 24h bar */}
      <div style={{ position: "relative", height: 14, marginTop: 1 }}>
        {/* Track */}
        <div style={{ position: "absolute", inset: 0, top: 4, height: 6, background: trackBg, borderRadius: 3 }} />
        {/* Active segments */}
        {unionRanges.map((r, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: 4, height: 6,
              left:  `${(r[0] / 24) * 100}%`,
              width: `${((r[1] - r[0]) / 24) * 100}%`,
              background: segmentBg,
              borderRadius: 3,
            }}
          />
        ))}
        {/* Hour ticks */}
        {[0, 6, 12, 18, 24].map(h => (
          <div
            key={h}
            style={{
              position: "absolute",
              top: 0, height: 14,
              left: `${(h / 24) * 100}%`,
              width: 1,
              background: T.borderMid,
              opacity: 0.5,
            }}
          />
        ))}
      </div>

      {/* Hour labels */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, fontFamily: T.mono, color: T.textDim, marginTop: -4 }}>
        <span>0</span><span>6</span><span>12</span><span>18</span><span>24</span>
      </div>

      {/* Per-segment list */}
      {!compact && data.segments.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4, paddingTop: 6, borderTop: `1px solid ${T.border}` }}>
          {data.segments.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, fontFamily: T.mono }}>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: color, flexShrink: 0 }} />
              <span style={{ color: T.textMid, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
              <span style={{ color: T.textDim }}>{s.frequency}</span>
              <span style={{ color: T.textDim }}>·</span>
              <span style={{ color: T.textDim }}>{formatHourRange(s.startHour, s.endHour)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatHourRange(start: number, end: number): string {
  if (start === 0 && end === 24) return "24/7";
  return `${formatHour(start)}–${formatHour(end)}`;
}

function formatHour(h: number): string {
  if (h === 0 || h === 24) return "12am";
  if (h === 12) return "12pm";
  if (h < 12) return `${h}am`;
  return `${h - 12}pm`;
}

function mergeRanges(ranges: [number, number][]): [number, number][] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    if (sorted[i][0] <= last[1]) {
      last[1] = Math.max(last[1], sorted[i][1]);
    } else {
      out.push(sorted[i]);
    }
  }
  return out;
}
