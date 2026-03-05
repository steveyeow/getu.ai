import { forwardRef, useEffect, useRef, useState } from "react";
import { T } from "../../lib/theme.js";
import { useAriaChat } from "../../hooks/useAriaChat.js";
import { useAgentChat } from "../../hooks/useAgentChat.js";
import type { SidebarTab } from "../layout/Sidebar.js";

export interface AgentChatInfo {
  name:   string;
  color:  string;
  tagline: string;
  starter: string;
}

const SUGGESTIONS = [
  "I'm building a B2B SaaS, help me find my first users",
  "Set up LinkedIn and Twitter prospecting for my product",
  "Find signal posts about the problem my product solves",
  "Build a GTM strategy for my startup",
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 18) return "Afternoon";
  return "Evening";
}

interface Props {
  onNavigate:               (tab: SidebarTab) => void;
  conversationId?:          string;
  onNewConversation?:      (id: string) => void;
  initialPrompt?:          string;
  onInitialPromptConsumed?: () => void;
  userName?:               string;
  agentName?:              string;
  agentInfo?:              AgentChatInfo;
}

export default function AriaChat({ onNavigate, conversationId: initConvId, onNewConversation, initialPrompt, onInitialPromptConsumed, userName, agentName, agentInfo }: Props) {
  const aria  = useAriaChat(initConvId);
  const agent = useAgentChat(agentName ?? "ARIA", initConvId); // placeholder when not in agent mode (result unused)

  const isAgentMode = !!agentName;
  const messages    = isAgentMode ? agent.messages    : aria.messages;
  const streaming   = isAgentMode ? agent.streaming   : aria.streaming;
  const loading     = isAgentMode ? false             : aria.loading;
  const error       = isAgentMode ? agent.error       : aria.error;
  const sendMessage = isAgentMode ? agent.sendMessage  : aria.sendMessage;
  const conversationId = isAgentMode ? agent.conversationId : aria.conversationId;

  const [input, setInput] = useState(initialPrompt ?? "");
  const endRef            = useRef<HTMLDivElement>(null);
  const textareaRef       = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (conversationId) onNewConversation?.(conversationId);
  }, [conversationId]);

  // When a pre-filled prompt arrives (from Skills page), populate input and focus
  useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt);
      onInitialPromptConsumed?.();
      setTimeout(() => {
        textareaRef.current?.focus();
        resizeTextarea();
      }, 50);
    }
  }, [initialPrompt]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function resizeTextarea() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
  }

  function submit(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg) return;
    sendMessage(msg);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  const isEmpty = messages.length === 0 && !streaming && !loading;
  const lastMsg = messages[messages.length - 1];
  const showThinking = streaming && (!lastMsg || lastMsg.role === "user");

  // Derive first name from email (e.g. "steve.yao@gmail.com" → "Steve")
  const firstName = userName
    ? (userName.split("@")[0].split(/[._-]/)[0] ?? "there")
        .replace(/^./, c => c.toUpperCase())
    : "there";

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", background: T.bg }}>
        <span style={{ width: 18, height: 18, border: `2px solid ${T.border}`, borderTopColor: T.textDim, borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.bg }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", animation: "fadeUp .35s ease" }}>
          <div style={{ width: "100%", maxWidth: 640, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24, justifyContent: "center" }}>
              {isAgentMode && agentInfo
                ? (
                    <div style={{ width: 40, height: 40, borderRadius: 40 * 0.28, background: `${agentInfo.color}18`, border: `1.5px solid ${agentInfo.color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 600, color: agentInfo.color }}>{agentInfo.name[0]}</span>
                    </div>
                  )
                : <PixelBot />}
              <h2 style={{ fontSize: 32, fontWeight: 300, fontFamily: T.serif, color: "#333", letterSpacing: "-0.01em", lineHeight: 1.3, margin: 0 }}>
                {isAgentMode && agentInfo ? `Chat with ${agentInfo.name}` : `${greeting()}, ${firstName}`}
              </h2>
            </div>
            <InputBox ref={textareaRef} value={input} onChange={e => { setInput(e.target.value); resizeTextarea(); }} onKeyDown={handleKeyDown} onSubmit={() => submit()} streaming={streaming} large placeholder={isAgentMode && agentInfo ? `Message ${agentInfo.name}…` : "Message ARIA..."} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}>
              {isAgentMode && agentInfo?.starter
                ? (
                    <button onClick={() => { setInput(agentInfo.starter); textareaRef.current?.focus(); }} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 12, color: T.textMid, textAlign: "left", lineHeight: 1.5, cursor: "pointer", gridColumn: "1 / -1" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = T.borderMid; e.currentTarget.style.color = T.text; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textMid; }}
                    >
                      {agentInfo.starter}…
                    </button>
                  )
                : SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => submit(s)} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 12, color: T.textMid, textAlign: "left", lineHeight: 1.5, cursor: "pointer" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = T.borderMid; e.currentTarget.style.color = T.text; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textMid; }}
                    >{s}</button>
                  ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.bg }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 0" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px", display: "flex", flexDirection: "column", gap: 20 }}>
          {messages.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isStreaming={streaming && i === messages.length - 1 && msg.role === "assistant"}
              onViewMissions={() => onNavigate("missions")}
              agentInfo={agentInfo}
            />
          ))}
          {showThinking && <ThinkingDots agentInfo={agentInfo} />}
          {error && (
            <div style={{ fontSize: 12, color: "#dc2626", fontFamily: T.mono, padding: "8px 12px", background: "#fef2f2", borderRadius: 6 }}>
              {error}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>
      <div style={{ padding: "12px 24px 20px", borderTop: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <InputBox ref={textareaRef} value={input} onChange={e => { setInput(e.target.value); resizeTextarea(); }} onKeyDown={handleKeyDown} onSubmit={() => submit()} streaming={streaming} placeholder={isAgentMode && agentInfo ? `Message ${agentInfo.name}…` : undefined} />
        </div>
      </div>
    </div>
  );
}

// ── Inline Markdown Renderer ──────────────────────────────────────────────────

// Splits text by inline patterns: **bold**, *italic*, `code`
function inlineFormat(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} style={{ fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} style={{ fontFamily: T.mono, fontSize: 12, background: "rgba(0,0,0,0.07)", padding: "1px 4px", borderRadius: 3 }}>{part.slice(1, -1)}</code>;
    return part;
  });
}

function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <pre key={nodes.length} style={{ background: "rgba(0,0,0,0.05)", borderRadius: 6, padding: "10px 12px", fontFamily: T.mono, fontSize: 12, overflowX: "auto", margin: "6px 0", whiteSpace: "pre" }}>
          {codeLines.join("\n")}
        </pre>
      );
      i++;
      continue;
    }

    // Headers
    if (line.startsWith("### ")) {
      nodes.push(<h3 key={nodes.length} style={{ fontSize: 14, fontWeight: 600, color: T.text, margin: "14px 0 4px" }}>{inlineFormat(line.slice(4))}</h3>);
      i++; continue;
    }
    if (line.startsWith("## ")) {
      nodes.push(<h2 key={nodes.length} style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: "16px 0 6px" }}>{inlineFormat(line.slice(3))}</h2>);
      i++; continue;
    }
    if (line.startsWith("# ")) {
      nodes.push(<h1 key={nodes.length} style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: "16px 0 6px" }}>{inlineFormat(line.slice(2))}</h1>);
      i++; continue;
    }

    // Unordered list — collect consecutive list items
    if (line.match(/^[-*] /)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        items.push(<li key={i} style={{ margin: "3px 0", lineHeight: 1.65 }}>{inlineFormat(lines[i].slice(2))}</li>);
        i++;
      }
      nodes.push(<ul key={nodes.length} style={{ margin: "4px 0 8px", paddingLeft: 20 }}>{items}</ul>);
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\. /)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(<li key={i} style={{ margin: "3px 0", lineHeight: 1.65 }}>{inlineFormat(lines[i].replace(/^\d+\.\s/, ""))}</li>);
        i++;
      }
      nodes.push(<ol key={nodes.length} style={{ margin: "4px 0 8px", paddingLeft: 20 }}>{items}</ol>);
      continue;
    }

    // Horizontal rule
    if (line.match(/^[-*]{3,}$/)) {
      nodes.push(<hr key={nodes.length} style={{ border: "none", borderTop: `1px solid ${T.border}`, margin: "10px 0" }} />);
      i++; continue;
    }

    // Blank line — vertical spacing
    if (line.trim() === "") {
      // Only add spacing if there's adjacent content
      if (nodes.length > 0) {
        nodes.push(<div key={nodes.length} style={{ height: 6 }} />);
      }
      i++; continue;
    }

    // Regular paragraph line
    nodes.push(<p key={nodes.length} style={{ margin: 0, lineHeight: 1.75 }}>{inlineFormat(line)}</p>);
    i++;
  }

  return <>{nodes}</>;
}

// ── Input Box ─────────────────────────────────────────────────────────────────

interface InputBoxProps {
  value:       string;
  onChange:    (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown:   (e: React.KeyboardEvent) => void;
  onSubmit:    () => void;
  streaming:   boolean;
  large?:      boolean;
  placeholder?: string;
}

const InputBox = forwardRef<HTMLTextAreaElement, InputBoxProps>(
  ({ value, onChange, onKeyDown, onSubmit, streaming, large, placeholder = "Message ARIA..." }, ref) => (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, background: T.surface, border: `1px solid ${T.border}`, borderRadius: large ? 16 : 12, padding: large ? "14px 16px" : "10px 12px", boxShadow: large ? "0 4px 24px rgba(0,0,0,0.07)" : "0 2px 8px rgba(0,0,0,0.04)" }}>
      <textarea
        ref={ref}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        rows={large ? 3 : 1}
        style={{ flex: 1, border: "none", background: "transparent", fontSize: large ? 15 : 14, color: T.text, fontFamily: T.sans, resize: "none", lineHeight: 1.65, outline: "none", minHeight: large ? 72 : undefined }}
      />
      <button
        onClick={onSubmit}
        disabled={streaming || !value.trim()}
        style={{ background: value.trim() && !streaming ? T.text : T.border, color: value.trim() && !streaming ? "#fff" : T.textDim, border: "none", borderRadius: large ? 10 : 8, width: large ? 38 : 32, height: large ? 38 : 32, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background .15s", cursor: value.trim() && !streaming ? "pointer" : "default" }}
      >
        {streaming ? <Spinner /> : <SendIcon />}
      </button>
    </div>
  )
);

// ── Message Bubble ────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message:        { id: string; role: "user" | "assistant"; content: string; taskCreated?: { taskId: string; agentName: string; title: string } };
  isStreaming:    boolean;
  onViewMissions: () => void;
  agentInfo?:     AgentChatInfo | null;
}

function MessageBubble({ message, isStreaming, onViewMissions, agentInfo }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const nameLabel = agentInfo ? agentInfo.name : "ARIA";
  const avatarEl = !isUser && (agentInfo
    ? (
        <div style={{ width: 28, height: 28, borderRadius: 28 * 0.28, background: `${agentInfo.color}18`, border: `1.5px solid ${agentInfo.color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 600, color: agentInfo.color }}>{agentInfo.name[0]}</span>
        </div>
      )
    : <AriaAvatar size={28} />);
  return (
    <div style={{ display: "flex", gap: 10, animation: "slideIn .2s ease", flexDirection: isUser ? "row-reverse" : "row" }}>
      {!isUser && avatarEl}
      <div style={{ maxWidth: "80%", display: "flex", flexDirection: "column", gap: 6, alignItems: isUser ? "flex-end" : "flex-start" }}>
        {!isUser && <span style={{ fontSize: 10, color: agentInfo ? agentInfo.color : T.green, fontFamily: T.mono, letterSpacing: .5 }}>{nameLabel}</span>}
        <div style={{ background: isUser ? T.text : T.surface, color: isUser ? "#fff" : T.text, border: isUser ? "none" : `1px solid ${T.border}`, borderRadius: isUser ? "12px 12px 4px 12px" : "4px 12px 12px 12px", padding: "10px 14px", fontSize: 14 }}>
          {isUser
            ? <span style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{message.content}</span>
            : (
              <>
                {renderMarkdown(message.content)}
                {isStreaming && <span style={{ display: "inline-block", width: 2, height: 14, background: T.textDim, marginLeft: 2, verticalAlign: "middle", animation: "blink 1s infinite" }} />}
              </>
            )
          }
        </div>
        {message.taskCreated && (
          <div style={{ background: T.greenLight, border: `1px solid ${T.greenMid}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#166534", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: T.mono, fontWeight: 500 }}>{message.taskCreated.agentName}</span>
            <span style={{ color: T.green }}>task created:</span>
            <span>{message.taskCreated.title}</span>
            <button onClick={onViewMissions} style={{ marginLeft: "auto", background: "none", border: "none", color: T.green, fontSize: 11, fontFamily: T.mono, cursor: "pointer", textDecoration: "underline" }}>
              view →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ThinkingDots({ agentInfo }: { agentInfo?: AgentChatInfo | null }) {
  const avatarEl = agentInfo
    ? (
        <div style={{ width: 28, height: 28, borderRadius: 28 * 0.28, background: `${agentInfo.color}18`, border: `1.5px solid ${agentInfo.color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 600, color: agentInfo.color }}>{agentInfo.name[0]}</span>
        </div>
      )
    : <AriaAvatar size={28} />;
  return (
    <div style={{ display: "flex", gap: 10 }}>
      {avatarEl}
      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "10px 14px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: "4px 12px 12px 12px" }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: T.textDim, display: "inline-block", animation: `pulse 1.2s ${i * .2}s infinite` }} />
        ))}
      </div>
    </div>
  );
}

// ── Pixel Bot Icon ────────────────────────────────────────────────────────────
// 10×10 pixel grid drawn as an SVG, 1 unit = 4px → 40px total
// Each rect is one "pixel". Palette: body=#1a1714, eyes=#16a34a, antenna=#1a1714
function PixelBot() {
  const S = 4; // pixel size in px
  const c = T.textDim; // body colour
  const g = T.green;   // eye / accent colour
  const _ = null;      // transparent

  // 10-row × 10-col grid, row 0 = top
  const grid: (string | null)[][] = [
    [_,_,_,_,c,c,_,_,_,_],  // 0 antenna base
    [_,_,_,_,c,_,_,_,_,_],  // 1 antenna
    [_,c,c,c,c,c,c,c,c,_],  // 2 head top
    [_,c,_,_,_,_,_,_,c,_],  // 3 head inner top
    [_,c,_,g,g,g,g,_,c,_],  // 4 visor top
    [_,c,_,g,_,_,g,_,c,_],  // 5 eyes row
    [_,c,_,g,g,g,g,_,c,_],  // 6 visor bottom
    [_,c,_,_,_,_,_,_,c,_],  // 7 head inner bottom
    [_,c,c,c,c,c,c,c,c,_],  // 8 head bottom / neck
    [_,_,c,c,_,_,c,c,_,_],  // 9 feet
  ];

  return (
    <svg width={10 * S} height={10 * S} viewBox={`0 0 ${10 * S} ${10 * S}`} style={{ imageRendering: "pixelated", flexShrink: 0 }}>
      {grid.map((row, r) =>
        row.map((fill, col) =>
          fill ? <rect key={`${r}-${col}`} x={col * S} y={r * S} width={S} height={S} fill={fill} /> : null
        )
      )}
    </svg>
  );
}

function AriaAvatar({ size }: { size: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.3, background: T.text, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ color: T.green, fontFamily: T.mono, fontSize: size * 0.4, fontWeight: 500 }}>A</span>
    </div>
  );
}

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M12 7L2 2l2.5 5L2 12l10-5z" fill="currentColor" />
    </svg>
  );
}

function Spinner() {
  return <span style={{ width: 14, height: 14, border: "2px solid #fff4", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin .6s linear infinite" }} />;
}
