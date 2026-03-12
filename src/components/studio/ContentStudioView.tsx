import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { T } from "../../lib/theme.js";
import type { SidebarTab } from "../layout/Sidebar.js";

// ── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  contentCards?: ContentPiece[];
}

interface ContentPiece {
  id: string;
  title: string;
  hook: string;
  description: string;
  platform: string;
  format: string;
  duration?: string;
  caption: string;
  hashtags: string[];
  tags: string[];
  bestTime: string;
  gradient: string;
  script?: string;
  status: "pending" | "approved" | "rejected";
  previewType: "video" | "carousel";
  carouselSlides?: string[];
}

type Phase = 1 | 2 | 3 | 4;
type WorkspaceTab = "content" | "brief" | "calendar" | "analytics";

const CS_COLOR = "#E11D48";

// ── Demo Content ─────────────────────────────────────────────────────────────

const DEMO_CONTENT: ContentPiece[] = [
  {
    id: "c1",
    title: "Hook-driven pain point video",
    hook: "\"Why are you still doing this manually?\"",
    description: "Opens with founder scrolling through LinkedIn DMs, cuts to screen recording of AI agents running autonomously. Uses trending audio with text overlay storytelling.",
    platform: "TikTok",
    format: "Vertical",
    duration: "0:32",
    caption: "I used to spend 3 hours a day on manual outbound. Now my AI agents do it while I sleep 🤖",
    hashtags: ["#SaaS", "#StartupLife", "#AIMarketing", "#GTM", "#Founder"],
    tags: ["pain-point", "hook-first", "trending-audio"],
    bestTime: "Tue 11am",
    gradient: "linear-gradient(135deg, #1a1714 0%, #3d2b2b 50%, #E11D48 100%)",
    script: `HOOK (0-3s): "You're still manually finding leads on LinkedIn?" [shocked face]

PROBLEM (3-12s): Show founder scrolling through profiles, copy-pasting into spreadsheets, crafting individual DMs. Text: "3 hours a day. Every day."

SOLUTION (12-25s): Cut to GetU.ai dashboard. Show AI agents working: finding signal posts, drafting replies, engaging. Text: "Or let AI do it in 3 minutes."

CTA (25-32s): "Link in bio. Your AI marketing team is waiting."`,
    status: "pending",
    previewType: "video",
  },
  {
    id: "c2",
    title: "Before vs After — Split screen comparison",
    hook: "\"Before vs After GetU.ai\"",
    description: "Side-by-side showing the \"old way\" (spreadsheets, manual DMs, copy-pasting) vs the \"new way\" (AI agents doing it all). Strong transformation narrative.",
    platform: "TikTok",
    format: "Vertical",
    duration: "0:28",
    caption: "Me before AI agents vs me after 🤯",
    hashtags: ["#BeforeAndAfter", "#StartupFounder", "#AITools", "#MarketingAutomation"],
    tags: ["transformation", "split-screen", "relatable"],
    bestTime: "Wed 2pm",
    gradient: "linear-gradient(135deg, #1a1714 0%, #1a2744 50%, #0A66C2 100%)",
    script: `HOOK (0-3s): "This is me before GetU.ai..." [tired face, spreadsheets everywhere]

BEFORE (3-14s): Split-screen left: scrolling LinkedIn manually, writing DMs one by one, tracking leads in Google Sheets. Text overlay: "12 leads/week. Exhausted."

TRANSITION (14-16s): Screen wipe effect with GetU.ai logo

AFTER (16-25s): Split-screen right: GetU.ai dashboard, agents running, notifications popping. Text overlay: "120 leads/week. While I sleep."

CTA (25-28s): "Link in bio. Replace your entire GTM team."`,
    status: "pending",
    previewType: "video",
  },
  {
    id: "c3",
    title: "\"Your AI marketing team\" — Product walkthrough",
    hook: "Meet your AI marketing team",
    description: "4-slide carousel introducing each AI agent and what it does. Clean, branded visuals with the warm beige + green GetU.ai design language.",
    platform: "Instagram",
    format: "Carousel",
    caption: "Meet your new AI marketing team 👋 Each agent specializes in a different channel. Swipe to see what they do →",
    hashtags: ["#AI", "#MarketingTeam", "#SaaS", "#StartupGrowth"],
    tags: ["carousel", "product-demo", "educational"],
    bestTime: "Thu 10am",
    gradient: "linear-gradient(135deg, #f0fdf4 0%, #86efac 50%, #16a34a 100%)",
    status: "pending",
    previewType: "carousel",
    carouselSlides: ["TM", "RS", "LF", "CS"],
  },
];

// ── Scripted chat flow ───────────────────────────────────────────────────────

function getCSResponse(turn: number): { text: string; contentCards?: ContentPiece[] } {
  if (turn === 0) {
    return {
      text: `Got it. I've analyzed your product and audience. Here's the **content brief** I've put together:

**Product:** GetU.ai — AI GTM execution platform
**Audience:** SaaS founders, Seed–Series B
**Tone:** Direct, relatable, slightly irreverent
**Platforms:** TikTok (primary), Instagram Reels, X

I've identified **3 high-impact content angles** based on competitor analysis of Clay, Instantly, and Lemlist. Check the **Brief** tab for the full details, or review the creative concepts in the workspace →`,
    };
  }

  const confirmWords = ["great", "love", "good", "go", "yes", "produce", "create", "make", "approve", "sure", "do it", "lgtm", "sounds"];
  return {
    text: `All 3 content pieces are ready for your review:

1. ✓ **"Why are you still doing this manually?"** — TikTok vertical video, 32s
2. ✓ **"Before vs After GetU.ai"** — Split-screen comparison, 28s
3. ✓ **"Your AI marketing team"** — Product walkthrough carousel

Each piece includes a full script, caption, hashtags, and an AI-recommended posting time. You can:

- **Approve** to schedule for publishing
- **Edit** to adjust the script, caption, or timing
- **Regenerate** for a completely new take

Check the workspace panel to review each piece →`,
    contentCards: DEMO_CONTENT,
  };
}

// ── Main Component ───────────────────────────────────────────────────────────

interface Props {
  onNavigate: (tab: SidebarTab) => void;
  userName?: string;
}

const LS_KEY = "cs_demo_state";

interface PersistedState {
  messages: ChatMessage[];
  phase: Phase;
  contentPieces: ContentPiece[];
  turn: number;
}

function loadState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch { return null; }
}

function saveState(s: PersistedState) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch { /* quota */ }
}

function clearState() {
  try { localStorage.removeItem(LS_KEY); } catch { /* noop */ }
}

export default function ContentStudioView({ onNavigate, userName }: Props) {
  const saved = useRef(loadState());

  const [messages, setMessages] = useState<ChatMessage[]>(saved.current?.messages ?? []);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [phase, setPhase] = useState<Phase>(saved.current?.phase ?? 1);
  const [wsTab, setWsTab] = useState<WorkspaceTab>("content");
  const [contentPieces, setContentPieces] = useState<ContentPiece[]>(saved.current?.contentPieces ?? []);
  const [editingPiece, setEditingPiece] = useState<ContentPiece | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const turnRef = useRef(saved.current?.turn ?? 0);

  useEffect(() => {
    saveState({ messages, phase, contentPieces, turn: turnRef.current });
  }, [messages, phase, contentPieces]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamingText]);

  function resizeTextarea() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  const submit = useCallback((text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || streaming) return;

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: msg };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const turn = turnRef.current;
    turnRef.current++;

    const response = getCSResponse(turn);

    setStreaming(true);
    setStreamingText("");

    let idx = 0;
    const fullText = response.text;
    const interval = setInterval(() => {
      idx = Math.min(idx + 3, fullText.length);
      setStreamingText(fullText.slice(0, idx));
      if (idx >= fullText.length) {
        clearInterval(interval);
        const assistantMsg: ChatMessage = { id: `a-${Date.now()}`, role: "assistant", content: fullText, contentCards: response.contentCards };
        setMessages(prev => [...prev, assistantMsg]);
        setStreaming(false);
        setStreamingText("");
        if (response.contentCards) {
          setContentPieces(response.contentCards);
          setPhase(3);
        } else if (turn === 0) {
          setPhase(2);
        }
      }
    }, 12);
  }, [input, streaming]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
  }

  function approveCard(id: string) {
    setContentPieces(prev => prev.map(p => p.id === id ? { ...p, status: "approved" as const } : p));
  }

  function approveAll() {
    setContentPieces(prev => prev.map(p => ({ ...p, status: "approved" as const })));
    setPhase(4);
  }

  const isEmpty = messages.length === 0 && !streaming;
  const pendingCount = contentPieces.filter(p => p.status === "pending").length;
  const allApproved = contentPieces.length > 0 && pendingCount === 0;

  function resetSession() {
    clearState();
    setMessages([]);
    setInput("");
    setStreaming(false);
    setStreamingText("");
    setPhase(1);
    setWsTab("content");
    setContentPieces([]);
    setEditingPiece(null);
    turnRef.current = 0;
  }

  // ── Empty State ──────────────────────────────────────────────────────────
  if (isEmpty) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.bg }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", animation: "fadeUp .35s ease" }}>
          <div style={{ width: "100%", maxWidth: 640, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24, justifyContent: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${CS_COLOR}14`, border: `1.5px solid ${CS_COLOR}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 600, color: CS_COLOR }}>CS</span>
              </div>
              <h2 style={{ fontSize: 28, fontWeight: 300, fontFamily: T.serif, color: "#333", letterSpacing: "-0.01em", margin: 0 }}>Content Studio</h2>
            </div>
            <p style={{ textAlign: "center", fontSize: 13, color: T.textMid, marginBottom: 6, lineHeight: 1.6 }}>
              Creates images, copy, and short-form videos for TikTok and social media publishing.
            </p>
            <p style={{ textAlign: "center", fontSize: 13, color: T.text, marginBottom: 24, lineHeight: 1.6, fontWeight: 500 }}>
              Tell me about your product and I'll create content that converts.
            </p>
            <CSInputBox ref={textareaRef} value={input} onChange={e => { setInput(e.target.value); resizeTextarea(); }} onKeyDown={handleKeyDown} onSubmit={() => submit()} streaming={streaming} large placeholder="Describe your product and target audience…" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}>
              {[
                "Create 3 TikTok videos for my B2B SaaS product — we help founders automate GTM",
                "Design a content calendar for launching on TikTok and Instagram",
                "Write pain-point explainer scripts that speak to overwhelmed founders",
                "Generate carousel posts explaining what AI agents can do for marketing",
              ].map((s, i) => (
                <button key={i} onClick={() => { setInput(s); textareaRef.current?.focus(); }} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 12, color: T.textMid, textAlign: "left", lineHeight: 1.5, cursor: "pointer", transition: "border-color .15s, color .15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = CS_COLOR + "50"; e.currentTarget.style.color = T.text; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textMid; }}
                >{s}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Split Panel Layout ───────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.bg }}>
      {/* Phase Stepper */}
      <PhaseStepper phase={phase} onNew={resetSession} />

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left: Chat */}
        <div style={{ width: 400, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
            {messages.map(msg => <CSMessage key={msg.id} message={msg} />)}
            {streaming && <CSStreamingMessage text={streamingText} />}
            <div ref={endRef} />
          </div>
          <div style={{ padding: "10px 14px", borderTop: `1px solid ${T.border}` }}>
            <div style={{ marginBottom: 5, fontSize: 11, color: T.textDim }}>
              Try: "Make the hook punchier" or "Add a CTA at the end"
            </div>
            <CSInputBox ref={textareaRef} value={input} onChange={e => { setInput(e.target.value); resizeTextarea(); }} onKeyDown={handleKeyDown} onSubmit={() => submit()} streaming={streaming} placeholder="Tell Content Studio what to change…" />
          </div>
        </div>

        {/* Right: Workspace */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${T.border}`, padding: "0 24px", background: T.surface, flexShrink: 0 }}>
            {(["content", "brief", "calendar", "analytics"] as WorkspaceTab[]).map(tab => (
              <button key={tab} onClick={() => setWsTab(tab)} style={{
                padding: "10px 16px", fontSize: 12, fontFamily: T.mono, cursor: "pointer",
                color: wsTab === tab ? CS_COLOR : T.textDim, borderBottom: `2px solid ${wsTab === tab ? CS_COLOR : "transparent"}`,
                fontWeight: wsTab === tab ? 500 : 400, background: "transparent", border: "none",
                borderBottomWidth: 2, borderBottomStyle: "solid", borderBottomColor: wsTab === tab ? CS_COLOR : "transparent",
                transition: "all .15s",
              }}>
                {tab === "content" ? `Content (${contentPieces.length})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Workspace Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
            {wsTab === "content" && <ContentTab pieces={contentPieces} onApprove={approveCard} onApproveAll={approveAll} onEdit={setEditingPiece} allApproved={allApproved} pendingCount={pendingCount} onViewCalendar={() => setWsTab("calendar")} />}
            {wsTab === "brief" && <BriefTab />}
            {wsTab === "calendar" && <CalendarTab pieces={contentPieces} />}
            {wsTab === "analytics" && <AnalyticsTab />}
          </div>
        </div>
      </div>

      {/* Edit Overlay */}
      {editingPiece && <EditOverlay piece={editingPiece} onClose={() => setEditingPiece(null)} onSave={(updated) => { setContentPieces(prev => prev.map(p => p.id === updated.id ? updated : p)); setEditingPiece(null); }} />}
    </div>
  );
}

// ── Phase Stepper ────────────────────────────────────────────────────────────

const PHASES = [
  { label: "Brief & Research", tip: "Product understanding, audience, brand voice" },
  { label: "Creative Concepts", tip: "Content angles, scripts, visual direction" },
  { label: "Review & Edit", tip: "Preview, approve, or request changes" },
  { label: "Schedule & Publish", tip: "Set posting times, publish to platforms" },
];

function PhaseStepper({ phase, onNew }: { phase: Phase; onNew: () => void }) {
  return (
    <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, flexShrink: 0, display: "flex", alignItems: "center", padding: "0 16px 0 0", height: 44, gap: 0 }}>
      <div style={{ display: "flex", alignItems: "center", flex: 1, padding: "0 20px", gap: 0 }}>
        {PHASES.map((p, i) => {
          const n = i + 1;
          const isDone = n < phase;
          const isActive = n === phase;
          return (
            <div key={n} style={{ display: "contents" }}>
              {i > 0 && <div style={{ flex: 1, height: 1.5, background: isDone ? `${T.green}50` : T.border, minWidth: 16, maxWidth: 40 }} />}
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 8px", borderRadius: 6, background: isActive ? `${CS_COLOR}08` : "transparent", cursor: "default", whiteSpace: "nowrap" }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: T.mono, fontSize: 9, fontWeight: 600,
                  border: `1.5px solid ${isDone ? T.green : isActive ? CS_COLOR : T.border}`,
                  color: isDone ? T.green : isActive ? CS_COLOR : T.textDim,
                  background: isDone ? `${T.green}0A` : isActive ? `${CS_COLOR}0A` : "transparent",
                }}>
                  {isDone ? "✓" : n}
                </div>
                <span style={{ fontSize: 11, fontWeight: 500, color: isDone ? T.green : isActive ? CS_COLOR : T.textDim }}>{p.label}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontFamily: T.mono, fontWeight: 500, color: T.green, background: `${T.green}14`, borderRadius: 100, padding: "3px 9px", border: `1px solid ${T.greenMid}` }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.green, display: "inline-block", animation: "pulse 2s infinite" }} />
          Working
        </div>
        <button onClick={onNew} style={{
          display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6,
          fontSize: 11, fontFamily: T.mono, fontWeight: 500, background: "transparent",
          border: `1px solid ${T.border}`, color: T.textMid, cursor: "pointer", transition: "all .15s",
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = CS_COLOR + "50"; e.currentTarget.style.color = T.text; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textMid; }}
        >+ New</button>
      </div>
    </div>
  );
}

// ── Chat Messages ────────────────────────────────────────────────────────────

function CSMessage({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div style={{ display: "flex", gap: 8, animation: "slideIn .2s ease", flexDirection: isUser ? "row-reverse" : "row" }}>
      {!isUser && (
        <div style={{ width: 26, height: 26, borderRadius: 7, background: `${CS_COLOR}14`, border: `1.5px solid ${CS_COLOR}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 600, color: CS_COLOR }}>CS</span>
        </div>
      )}
      <div style={{ maxWidth: "85%", display: "flex", flexDirection: "column", gap: 4, alignItems: isUser ? "flex-end" : "flex-start" }}>
        {!isUser && <span style={{ fontSize: 10, color: CS_COLOR, fontFamily: T.mono, letterSpacing: .5 }}>Content Studio</span>}
        <div style={{
          background: isUser ? T.text : T.surface, color: isUser ? "#fff" : T.text,
          border: isUser ? "none" : `1px solid ${T.border}`,
          borderRadius: isUser ? "12px 12px 4px 12px" : "4px 12px 12px 12px",
          padding: "10px 14px", fontSize: 13, lineHeight: 1.65,
        }}>
          {isUser ? <span style={{ whiteSpace: "pre-wrap" }}>{message.content}</span> : renderMD(message.content)}
        </div>
      </div>
    </div>
  );
}

function CSStreamingMessage({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <div style={{ width: 26, height: 26, borderRadius: 7, background: `${CS_COLOR}14`, border: `1.5px solid ${CS_COLOR}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 600, color: CS_COLOR }}>CS</span>
      </div>
      <div style={{ maxWidth: "85%", display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 10, color: CS_COLOR, fontFamily: T.mono, letterSpacing: .5 }}>Content Studio</span>
        <div style={{ background: T.surface, color: T.text, border: `1px solid ${T.border}`, borderRadius: "4px 12px 12px 12px", padding: "10px 14px", fontSize: 13, lineHeight: 1.65 }}>
          {renderMD(text)}
          <span style={{ display: "inline-block", width: 2, height: 14, background: T.textDim, marginLeft: 2, verticalAlign: "middle", animation: "blink 1s infinite" }} />
        </div>
      </div>
    </div>
  );
}

// ── Content Tab ──────────────────────────────────────────────────────────────

function ContentTab({ pieces, onApprove, onApproveAll, onEdit, allApproved, pendingCount, onViewCalendar }: {
  pieces: ContentPiece[]; onApprove: (id: string) => void; onApproveAll: () => void; onEdit: (p: ContentPiece) => void;
  allApproved: boolean; pendingCount: number; onViewCalendar: () => void;
}) {
  if (pieces.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: T.textDim }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: `${CS_COLOR}0A`, border: `1px solid ${CS_COLOR}20`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
          <span style={{ fontFamily: T.mono, fontSize: 16, fontWeight: 600, color: CS_COLOR }}>CS</span>
        </div>
        <p style={{ fontSize: 13, marginBottom: 4 }}>No content yet</p>
        <p style={{ fontSize: 12, color: T.textDim }}>Tell Content Studio about your product to start creating</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>Content Ready for Review</h3>
          <p style={{ fontSize: 12, color: T.textDim, marginTop: 2 }}>Approve, edit, or request changes before publishing</p>
        </div>
        {!allApproved && (
          <button onClick={onApproveAll} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 500, fontFamily: T.mono, background: "transparent", border: `1px solid ${T.border}`, color: T.textMid, cursor: "pointer", transition: "all .15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.borderMid; e.currentTarget.style.color = T.text; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textMid; }}
          >✓ Approve All</button>
        )}
      </div>

      {pieces.map(piece => <ContentCard key={piece.id} piece={piece} onApprove={() => onApprove(piece.id)} onEdit={() => onEdit(piece)} />)}

      {/* Approval Bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", marginTop: 12,
        background: allApproved ? `${T.green}06` : `${CS_COLOR}04`,
        border: `1px solid ${allApproved ? `${T.green}20` : `${CS_COLOR}15`}`,
        borderRadius: 10,
      }}>
        {allApproved ? (
          <>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontFamily: T.mono, fontWeight: 500, color: T.green, background: `${T.green}14`, borderRadius: 100, padding: "3px 10px", border: `1px solid ${T.green}30` }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.green }} /> All Approved
            </span>
            <span style={{ fontSize: 12, color: T.green, fontWeight: 500 }}>{pieces.length} items scheduled for publishing</span>
            <div style={{ flex: 1 }} />
            <button onClick={onViewCalendar} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, fontSize: 11, fontFamily: T.mono, background: "transparent", border: `1px solid ${T.border}`, color: T.textMid, cursor: "pointer" }}>
              View Calendar →
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize: 12, color: CS_COLOR, fontWeight: 500 }}>{pendingCount} item{pendingCount !== 1 ? "s" : ""} pending review</span>
            <div style={{ flex: 1 }} />
            <button style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, fontSize: 11, fontFamily: T.mono, background: "transparent", border: `1px solid ${T.border}`, color: T.textMid, cursor: "pointer" }}>
              Request Changes
            </button>
            <button onClick={onApproveAll} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, fontSize: 11, fontFamily: T.mono, background: T.green, border: "none", color: "#fff", cursor: "pointer" }}>
              ✓ Approve & Schedule All
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Media Preview Helpers ────────────────────────────────────────────────────

function VideoPreview({ piece, width }: { piece: ContentPiece; width: number }) {
  return (
    <>
      {/* Dark bottom gradient for readability */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "55%", background: "linear-gradient(transparent, rgba(0,0,0,0.6))", pointerEvents: "none" }} />

      {/* Center play button */}
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.25)", cursor: "pointer", zIndex: 1 }}>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="white"><path d="M5 2.5v11l9-5.5z" /></svg>
      </div>

      {/* Hook text */}
      <div style={{ fontSize: 11, fontWeight: 600, fontFamily: T.serif, textAlign: "center", lineHeight: 1.35, maxWidth: width - 20, padding: "4px 10px 0", zIndex: 1 }}>{piece.hook}</div>

      {/* Bottom bar: username */}
      <div style={{ position: "absolute", bottom: 6, left: 8, display: "flex", alignItems: "center", gap: 4, zIndex: 1 }}>
        <div style={{ width: 14, height: 14, borderRadius: "50%", background: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.3)" }} />
        <span style={{ fontSize: 8, fontFamily: T.mono, color: "rgba(255,255,255,0.8)" }}>@getu.ai</span>
      </div>

      {/* Right side action icons — mimics TikTok */}
      <div style={{ position: "absolute", bottom: 24, right: 6, display: "flex", flexDirection: "column", gap: 8, alignItems: "center", zIndex: 1 }}>
        {["♡", "💬", "↗"].map((icon, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>{icon}</div>
            <span style={{ fontSize: 7, color: "rgba(255,255,255,0.6)", fontFamily: T.mono }}>–</span>
          </div>
        ))}
      </div>
    </>
  );
}

function CarouselPreview({ piece }: { piece: ContentPiece }) {
  const slides = piece.carouselSlides ?? [];
  return (
    <>
      {/* Show the first slide prominently, hint at remaining */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", position: "relative" }}>
        <div style={{ width: 80, height: 80, borderRadius: 14, background: "rgba(255,255,255,0.25)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.mono, fontSize: 20, fontWeight: 700, color: "#fff", border: "1.5px solid rgba(255,255,255,0.35)", textShadow: "0 1px 4px rgba(0,0,0,0.15)" }}>
          {slides[0] ?? "1"}
        </div>
        {/* Stacked hints behind */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(calc(-50% + 8px), calc(-50% + 8px))", width: 76, height: 76, borderRadius: 13, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)", zIndex: -1 }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(calc(-50% + 15px), calc(-50% + 15px))", width: 72, height: 72, borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", zIndex: -2 }} />
      </div>

      {/* Bottom: slide count + dots */}
      <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 3 }}>
        {slides.map((_, i) => (
          <span key={i} style={{ width: i === 0 ? 12 : 4, height: 3, borderRadius: 2, background: i === 0 ? "white" : "rgba(255,255,255,0.35)", transition: "width .2s" }} />
        ))}
      </div>
      <div style={{ position: "absolute", top: 8, right: 8, fontSize: 8, fontFamily: T.mono, background: "rgba(0,0,0,0.4)", padding: "1px 5px", borderRadius: 3, color: "rgba(255,255,255,0.8)" }}>1/{slides.length}</div>
    </>
  );
}

// ── Content Card ─────────────────────────────────────────────────────────────

function ContentCard({ piece, onApprove, onEdit }: { piece: ContentPiece; onApprove: () => void; onEdit: () => void }) {
  const [hov, setHov] = useState(false);
  const isApproved = piece.status === "approved";
  const isVertical = piece.format === "Vertical";

  const mediaWidth = 160;
  const mediaHeight = 200;

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      background: T.surface, border: `1px solid ${isApproved ? `${T.green}40` : hov ? T.borderMid : T.border}`,
      borderRadius: 12, overflow: "hidden", marginBottom: 14, transition: "border-color .15s",
      display: "flex", flexDirection: "row",
    }}>
      {/* Media Preview — proper aspect ratio */}
      <div style={{
        width: mediaWidth, minHeight: mediaHeight, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
        background: piece.gradient, color: "white", flexDirection: "column",
        borderRadius: "12px 0 0 12px", overflow: "hidden",
      }}>
        {piece.previewType === "video" ? (
          <VideoPreview piece={piece} width={mediaWidth} />
        ) : (
          <CarouselPreview piece={piece} />
        )}
        {piece.duration && <div style={{ position: "absolute", bottom: 6, right: 6, fontSize: 9, fontFamily: T.mono, background: "rgba(0,0,0,0.55)", padding: "1px 5px", borderRadius: 3, letterSpacing: "0.02em" }}>{piece.duration}</div>}
      </div>

      {/* Right side — info + actions */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Body */}
        <div style={{ padding: "14px 16px", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 9, fontFamily: T.mono, fontWeight: 500, color: isVertical ? CS_COLOR : T.green, background: isVertical ? `${CS_COLOR}0C` : `${T.green}0C`, padding: "2px 6px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.04em", border: `1px solid ${isVertical ? CS_COLOR + "20" : T.green + "20"}` }}>
              {piece.platform}
            </span>
            <span style={{ fontSize: 9, fontFamily: T.mono, color: T.textDim }}>{piece.format}{piece.duration ? ` · ${piece.duration}` : ""}</span>
          </div>
          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{piece.title}</h4>
          <p style={{ fontSize: 11, color: T.textMid, lineHeight: 1.55, marginBottom: 8 }}>{piece.description}</p>
          <div style={{ marginBottom: 8 }}>
            {piece.tags.map(t => <span key={t} style={{ display: "inline-block", fontSize: 10, fontFamily: T.mono, padding: "2px 7px", borderRadius: 5, marginRight: 4, marginBottom: 3, background: `${CS_COLOR}0A`, color: CS_COLOR }}>{t}</span>)}
          </div>
          <div style={{ background: T.bg, borderRadius: 7, padding: "8px 10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
              <svg width="10" height="10" viewBox="0 0 16 16" fill={T.textDim}><path d="M2 3h12v1H2zm0 4h8v1H2zm0 4h10v1H2z" /></svg>
              <span style={{ fontSize: 9, fontFamily: T.mono, color: T.textDim, letterSpacing: "0.04em" }}>POST CAPTION</span>
            </div>
            <div style={{ fontSize: 11, color: T.textMid, lineHeight: 1.55 }}>{piece.caption}</div>
            <div style={{ fontSize: 10, color: `${CS_COLOR}90`, marginTop: 3 }}>{piece.hashtags.join(" ")}</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderTop: `1px solid ${T.border}` }}>
          {isApproved ? (
            <>
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontFamily: T.mono, fontWeight: 500, color: T.green, background: `${T.green}14`, borderRadius: 100, padding: "3px 10px", border: `1px solid ${T.green}30` }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.green }} /> Approved — Scheduled
              </span>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 10, fontFamily: T.mono, color: T.textDim }}>Will publish automatically</span>
            </>
          ) : (
            <>
              <button onClick={onApprove} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, fontSize: 11, fontFamily: T.mono, fontWeight: 500, background: T.green, border: "none", color: "#fff", cursor: "pointer" }}>✓ Approve</button>
              <button onClick={onEdit} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, fontSize: 11, fontFamily: T.mono, fontWeight: 500, background: "transparent", border: `1px solid ${T.border}`, color: T.textMid, cursor: "pointer" }}>✎ Edit</button>
              <button style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, fontSize: 11, fontFamily: T.mono, fontWeight: 500, background: "transparent", border: "none", color: T.textMid, cursor: "pointer" }}>↻ Regenerate</button>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 10, fontFamily: T.mono, color: T.textDim }}>Best time: {piece.bestTime}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Edit Overlay ─────────────────────────────────────────────────────────────

function EditOverlay({ piece, onClose, onSave }: { piece: ContentPiece; onClose: () => void; onSave: (p: ContentPiece) => void }) {
  const [hook, setHook] = useState(piece.hook);
  const [script, setScript] = useState(piece.script ?? "");
  const [caption, setCaption] = useState(piece.caption);
  const [hashtags] = useState(piece.hashtags);

  return (
    <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 460, background: T.surface, borderLeft: `1px solid ${T.border}`, boxShadow: "-8px 0 32px rgba(0,0,0,0.08)", zIndex: 200, display: "flex", flexDirection: "column", animation: "slideIn .25s ease" }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>Edit Content</h3>
        <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 18, color: T.textDim, cursor: "pointer", padding: 4 }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <Field label="Title / Hook">
          <textarea value={hook} onChange={e => setHook(e.target.value)} rows={2} style={editorStyle} />
        </Field>
        {script && (
          <Field label="Script">
            <textarea value={script} onChange={e => setScript(e.target.value)} rows={8} style={editorStyle} />
          </Field>
        )}
        <Field label="Caption">
          <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={3} style={editorStyle} />
        </Field>
        <Field label="Hashtags">
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
            {hashtags.map(h => <span key={h} style={{ display: "inline-block", fontSize: 10, fontFamily: T.mono, padding: "3px 8px", borderRadius: 5, background: T.bg, color: T.textMid, border: `1px solid ${T.border}`, cursor: "pointer" }}>{h} ×</span>)}
            <span style={{ display: "inline-block", fontSize: 10, fontFamily: T.mono, padding: "3px 8px", borderRadius: 5, background: "transparent", color: T.textDim, border: `1px dashed ${T.border}`, cursor: "pointer" }}>+ Add</span>
          </div>
        </Field>
        <Field label="Posting Time">
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <input type="date" defaultValue="2026-03-16" style={dateInputStyle} />
            <input type="time" defaultValue="11:00" style={dateInputStyle} />
          </div>
        </Field>
        <div style={{ background: `${CS_COLOR}06`, border: `1px solid ${CS_COLOR}15`, borderRadius: 8, padding: "10px 12px", marginTop: 12 }}>
          <div style={{ fontSize: 10, fontFamily: T.mono, color: CS_COLOR, marginBottom: 4 }}>AI SUGGESTION</div>
          <div style={{ fontSize: 12, color: T.textMid, lineHeight: 1.6 }}>The hook could be more specific. Try: "You're still copy-pasting LinkedIn profiles into a spreadsheet?" — specificity increases watch time by ~40% based on competitor analysis.</div>
        </div>
      </div>
      <div style={{ padding: "14px 20px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "7px 14px", borderRadius: 7, fontSize: 12, fontFamily: T.mono, background: "transparent", border: "none", color: T.textMid, cursor: "pointer" }}>Cancel</button>
        <button style={{ padding: "7px 14px", borderRadius: 7, fontSize: 12, fontFamily: T.mono, background: "transparent", border: `1px solid ${T.border}`, color: T.textMid, cursor: "pointer" }}>Ask CS to refine</button>
        <button onClick={() => onSave({ ...piece, hook, script, caption })} style={{ padding: "7px 14px", borderRadius: 7, fontSize: 12, fontFamily: T.mono, background: CS_COLOR, border: "none", color: "#fff", cursor: "pointer" }}>Save Changes</button>
      </div>
    </div>
  );
}

// ── Brief Tab ────────────────────────────────────────────────────────────────

function BriefTab() {
  return (
    <div>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: `${CS_COLOR}0A`, border: `1px solid ${CS_COLOR}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 600, color: CS_COLOR }}>CS</span>
          </div>
          Content Brief
        </h3>
        <BriefField label="Product" value="GetU.ai — AI-powered GTM execution platform that replaces the need to hire, onboard, and manage a marketing team." />
        <BriefField label="Target Audience" value="SaaS founders (Seed–Series B) who are doing manual outbound, content, and community work. Overwhelmed, under-resourced, need to scale GTM without hiring." />
        <BriefField label="Brand Voice" value="Direct, relatable, slightly irreverent. Speaks founder-to-founder. No corporate jargon. Uses concrete examples and numbers." />
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontFamily: T.mono, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Platforms</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {["TikTok", "Instagram Reels", "Twitter/X"].map(p => <span key={p} style={{ display: "inline-block", fontSize: 10, fontFamily: T.mono, padding: "3px 8px", borderRadius: 5, background: T.bg, color: T.textMid, border: `1px solid ${T.border}` }}>{p}</span>)}
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontFamily: T.mono, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Content Pillars</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {["Pain-point hooks", "Before/After", "Product demos", "Founder stories", "Social proof"].map(p => <span key={p} style={{ display: "inline-block", fontSize: 10, fontFamily: T.mono, padding: "3px 8px", borderRadius: 5, background: `${CS_COLOR}0A`, color: CS_COLOR }}>{p}</span>)}
          </div>
        </div>
        <BriefField label="Competitors Analyzed" value="Clay, Instantly, Lemlist, Apollo — analyzed top-performing content to find differentiation angles" dim />
      </div>
      <button style={{ display: "flex", alignItems: "center", gap: 4, padding: "7px 14px", borderRadius: 7, fontSize: 12, fontFamily: T.mono, background: "transparent", border: `1px solid ${T.border}`, color: T.textMid, cursor: "pointer", marginTop: 12 }}>✎ Edit Brief</button>
    </div>
  );
}

function BriefField({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontFamily: T.mono, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: dim ? T.textDim : T.text, lineHeight: 1.6 }}>{value}</div>
    </div>
  );
}

// ── Calendar Tab ─────────────────────────────────────────────────────────────

function CalendarTab({ pieces }: { pieces: ContentPiece[] }) {
  const days = ["Mon 17", "Tue 18", "Wed 19", "Thu 20", "Fri 21"];
  const slots: Record<string, { time: string; platform: string; color: string }[]> = {
    "Tue 18": [{ time: "11:00 AM", platform: "TikTok", color: CS_COLOR }],
    "Wed 19": [{ time: "2:00 PM", platform: "TikTok", color: "#0A66C2" }],
    "Thu 20": [{ time: "10:00 AM", platform: "IG", color: T.green }],
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600 }}>Publishing Calendar</h3>
        <p style={{ fontSize: 12, color: T.textDim, marginTop: 2 }}>Week of Mar 17 – Mar 21</p>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {days.map(day => (
          <div key={day} style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: 10, minHeight: 80 }}>
            <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>{day}</div>
            {(slots[day] ?? []).map((s, i) => (
              <div key={i} style={{ padding: "4px 8px", borderRadius: 5, fontSize: 10, marginBottom: 4, display: "flex", alignItems: "center", gap: 4, background: `${s.color}0A`, color: s.color, border: `1px solid ${s.color}20` }}>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: s.color }} />
                {s.time} · {s.platform}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Analytics Tab ────────────────────────────────────────────────────────────

function AnalyticsTab() {
  const stats = [
    { label: "VIEWS", value: "12.4k", change: "+34% vs last week", up: true },
    { label: "ENGAGEMENT", value: "8.2%", change: "+12% vs last week", up: true },
    { label: "FOLLOWERS", value: "+89", change: "New this week", up: true },
    { label: "POSTS", value: "5", change: "Published", up: false },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600 }}>Content Performance</h3>
        <p style={{ fontSize: 12, color: T.textDim, marginTop: 2 }}>Analytics from past 7 days</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 10, fontFamily: T.mono, color: T.textDim, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 600, fontFamily: T.mono }}>{s.value}</div>
            <div style={{ fontSize: 10, color: s.up ? T.green : T.textDim, marginTop: 2 }}>{s.change}</div>
          </div>
        ))}
      </div>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 10, fontFamily: T.mono, color: T.textDim, marginBottom: 12, letterSpacing: "0.04em" }}>TOP PERFORMING CONTENT</div>
        {[
          { title: "\"Why are you still doing this manually?\"", platform: "TikTok · 3 days ago", views: "5.2k", gradient: `linear-gradient(135deg, ${CS_COLOR} 0%, #1a1714 100%)` },
          { title: "\"Before vs After GetU.ai\"", platform: "TikTok · 5 days ago", views: "3.8k", gradient: "linear-gradient(135deg, #0A66C2 0%, #1a1714 100%)" },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderTop: i > 0 ? `1px solid ${T.border}` : "none" }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: item.gradient, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{item.title}</div>
              <div style={{ fontSize: 10, color: T.textDim, marginTop: 2 }}>{item.platform}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 600, fontFamily: T.mono }}>{item.views}</div>
              <div style={{ fontSize: 10, color: T.textDim }}>views</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Shared Components ────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, fontFamily: T.mono, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

const editorStyle: React.CSSProperties = {
  width: "100%", border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px",
  fontFamily: T.sans, fontSize: 13, color: T.text, background: T.bg,
  resize: "vertical" as const, outline: "none", lineHeight: 1.6, minHeight: 60,
};

const dateInputStyle: React.CSSProperties = {
  border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 10px",
  fontFamily: T.sans, fontSize: 12, background: T.bg, color: T.text,
};

interface CSInputBoxProps {
  value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void; onSubmit: () => void;
  streaming: boolean; large?: boolean; placeholder?: string;
}

const CSInputBox = forwardRef<HTMLTextAreaElement, CSInputBoxProps>(
  ({ value, onChange, onKeyDown, onSubmit, streaming, large, placeholder = "Message Content Studio…" }, ref) => (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, background: T.surface, border: `1px solid ${T.border}`, borderRadius: large ? 16 : 10, padding: large ? "14px 16px" : "8px 10px", boxShadow: large ? "0 4px 24px rgba(0,0,0,0.07)" : "0 1px 4px rgba(0,0,0,0.03)" }}>
      <textarea ref={ref} value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder} rows={large ? 3 : 1}
        style={{ flex: 1, border: "none", background: "transparent", fontSize: large ? 15 : 13, color: T.text, fontFamily: T.sans, resize: "none", lineHeight: 1.6, outline: "none", minHeight: large ? 72 : undefined }} />
      <button onClick={onSubmit} disabled={streaming || !value.trim()}
        style={{ background: value.trim() && !streaming ? T.text : T.border, color: value.trim() && !streaming ? "#fff" : T.textDim, border: "none", borderRadius: large ? 10 : 7, width: large ? 38 : 28, height: large ? 38 : 28, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background .15s", cursor: value.trim() && !streaming ? "pointer" : "default" }}>
        {streaming ? <span style={{ width: 12, height: 12, border: "2px solid #fff4", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin .6s linear infinite" }} /> : <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M12 7L2 2l2.5 5L2 12l10-5z" fill="currentColor" /></svg>}
      </button>
    </div>
  )
);

// ── Markdown renderer (compact version) ──────────────────────────────────────

function renderMD(text: string): React.ReactNode {
  if (!text) return null;
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.match(/^[-*] /)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) { items.push(<li key={i} style={{ margin: "2px 0", lineHeight: 1.6 }}>{inlineFmt(lines[i].slice(2))}</li>); i++; }
      nodes.push(<ul key={nodes.length} style={{ margin: "4px 0 6px", paddingLeft: 18 }}>{items}</ul>);
      continue;
    }
    if (line.match(/^\d+\. /)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) { items.push(<li key={i} style={{ margin: "2px 0", lineHeight: 1.6 }}>{inlineFmt(lines[i].replace(/^\d+\.\s/, ""))}</li>); i++; }
      nodes.push(<ol key={nodes.length} style={{ margin: "4px 0 6px", paddingLeft: 18 }}>{items}</ol>);
      continue;
    }
    if (line.trim() === "") { if (nodes.length > 0) nodes.push(<div key={nodes.length} style={{ height: 5 }} />); i++; continue; }
    nodes.push(<p key={nodes.length} style={{ margin: 0, lineHeight: 1.7 }}>{inlineFmt(line)}</p>);
    i++;
  }
  return <>{nodes}</>;
}

function inlineFmt(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} style={{ fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i} style={{ fontFamily: T.mono, fontSize: 11, background: "rgba(0,0,0,0.07)", padding: "1px 4px", borderRadius: 3 }}>{part.slice(1, -1)}</code>;
    return part;
  });
}
