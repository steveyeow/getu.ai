import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { T } from "../../lib/theme.js";
import type { SidebarTab } from "../layout/Sidebar.js";

export interface AgentChatInfo {
  name:    string;
  color:   string;
  tagline: string;
  starter: string;
}

// ── Simulated chat message types ─────────────────────────────────────────────

interface AgentQuestion {
  id:       string;
  prompt:   string;
  options:  { id: string; label: string }[];
  allowMultiple?: boolean;
  allowCustom?: boolean;
}

interface ChatMessage {
  id:     string;
  role:   "user" | "assistant";
  content: string;
  planItems?: PlanItem[];
  taskCards?: TaskCard[];
  todoPlans?: TodoPlan[];
  browserSetup?: { platform: string };
  questions?: AgentQuestion[];
}

interface PlanItem {
  agent:  string;
  color:  string;
  action: string;
}

type OngoingTaskStatus = "running" | "paused" | "stopped";

interface TaskCard {
  agent:  string;
  color:  string;
  title:  string;
  schedule: string;
  status: OngoingTaskStatus;
}

interface TodoPlan {
  id:     number;
  label:  string;
  detail?: string;
}


// ── Quick actions for ARIA landing ───────────────────────────────────────────

interface QuickAction {
  icon: string; label: string; desc: string; prompt: string; agent: string; color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { icon: "TM", label: "Run my Twitter/X", desc: "Find signal posts, reply with value, and publish threads automatically", prompt: "I need you to manage my Twitter account. Find relevant signal posts and engage with them, also publish content.", agent: "Twitter Manager", color: "#D97706" },
  { icon: "RS", label: "Hunt Reddit signals", desc: "Find signal communities and posts on Reddit where your ICP discusses pain", prompt: "Find Reddit communities where people discuss problems my product solves and surface the best signal posts.", agent: "Reddit Scout", color: "#FF4500" },
  { icon: "LF", label: "Find ICP leads", desc: "Search LinkedIn, Twitter & Reddit for decision makers matching your ICP", prompt: "Find 50 leads matching my ICP on LinkedIn and Twitter — VP Marketing and Heads of Growth at early-stage startups.", agent: "Lead Finder", color: "#0A66C2" },
  { icon: "CF", label: "Discover communities", desc: "Find Discord servers, Twitter groups, and Reddit spaces where your audience gathers", prompt: "Find Discord servers and communities where my target audience hangs out and ranks them by relevance.", agent: "Community Finder", color: "#059669" },
  { icon: "CS", label: "Create TikTok content", desc: "Generate images, copy, and short-form video for TikTok and social media", prompt: "Create content for my TikTok — understand my product and make engaging short-form videos.", agent: "Content Studio", color: "#E11D48" },
  { icon: "GO", label: "GEO Optimization", desc: "Make your site visible to AI search engines like ChatGPT, Perplexity & Claude", prompt: "Check the GEO status of my website and tell me how visible it is to AI search engines.", agent: "GEO Optimizer", color: "#0891B2" },
];

// ── Scripted response generators ─────────────────────────────────────────────

function getAriaResponse(userMsg: string, turn: number): { text: string; planItems?: PlanItem[]; taskCards?: TaskCard[]; todoPlans?: TodoPlan[]; browserSetup?: { platform: string }; questions?: AgentQuestion[] } {
  if (turn === 0) {
    return {
      text: `Got it — let me quickly analyze what you've shared.

**Here's my understanding of your product:**
- You're building a B2B SaaS tool that helps teams automate their go-to-market execution
- Your ICP: founders, heads of marketing, and growth leads at early-stage startups (Seed to Series B)
- Key pain point: they're doing outbound, content, and community work manually — it doesn't scale

**Recommended GTM Strategy:**

I suggest we deploy 5 agents simultaneously to cover your highest-impact channels:`,
      planItems: [
        { agent: "Twitter Manager", color: "#D97706", action: "Find signal posts on X about manual GTM pain, reply helpfully, publish 2 threads/week" },
        { agent: "Reddit Scout",    color: "#FF4500", action: "Monitor r/SaaS, r/startups, r/marketing for buying signals and engage authentically" },
        { agent: "Lead Finder",     color: "#0A66C2", action: "Find 50 ICP-matching leads on LinkedIn — VP Marketing & Heads of Growth at Seed-B companies" },
        { agent: "Community Finder", color: "#059669", action: "Discover Discord servers, Slack groups, and Reddit communities where your ICP gathers" },
        { agent: "Content Studio",  color: "#E11D48", action: "Create short-form content for TikTok — product demos and pain-point explainers" },
      ],
    };
  }

  const confirmWords = ["yes", "go", "confirm", "start", "do it", "sounds good", "let's go", "approve", "ok", "sure", "proceed", "lgtm"];
  if (confirmWords.some(w => userMsg.toLowerCase().includes(w))) {
    return {
      text: "Deploying all 5 agents now. These are **ongoing tasks** — they'll keep running on schedule. You can pause, resume, or stop any agent from **Mission Control** or right here in chat.",
      taskCards: [
        { agent: "Twitter Manager",  color: "#D97706", title: "Find & reply to signal posts on X", schedule: "Runs daily, 9am–6pm", status: "running" },
        { agent: "Reddit Scout",     color: "#FF4500", title: "Scan r/SaaS and r/startups for signals", schedule: "Every 6 hours", status: "running" },
        { agent: "Lead Finder",      color: "#0A66C2", title: "Find 50 ICP leads on LinkedIn", schedule: "Weekly, 50 leads/batch", status: "running" },
        { agent: "Community Finder", color: "#059669", title: "Discover ICP communities & Discord servers", schedule: "Runs weekly", status: "running" },
        { agent: "Content Studio",   color: "#E11D48", title: "Create TikTok content for product launch", schedule: "3 posts/week", status: "running" },
      ],
    };
  }

  return {
    text: `Good point. Let me adjust the plan based on your feedback.

I can modify the agent assignments or focus on specific channels. Would you like to:

- **Focus on fewer channels** first (e.g. just Twitter + LinkedIn)
- **Adjust the ICP targeting** criteria
- **Change the content strategy** for any channel
- **Proceed with the full plan** as proposed

Just let me know what you'd prefer and I'll update the strategy.`,
  };
}

const AGENT_SUGGESTIONS: Record<string, string[]> = {
  "Twitter Manager": [
    "Run my Twitter — find signal posts about GTM pain and reply helpfully",
    "Write a thread about why manual outbound doesn't scale for startups",
    "Find and engage with SaaS founders who are complaining about lead gen",
    "Monitor X for posts mentioning my competitors and draft responses",
  ],
  "Reddit Scout": [
    "Find subreddits where founders discuss GTM challenges and cold outreach",
    "Surface the top 10 signal posts on Reddit from the past week about my problem space",
    "Monitor r/SaaS and r/startups for buying signals related to marketing automation",
    "Draft authentic replies for Reddit posts where people ask for tool recommendations",
  ],
  "Lead Finder": [
    "Find 50 leads matching my ICP on LinkedIn — VP Marketing at Series A startups",
    "Search Twitter for growth leads who are actively tweeting about outbound",
    "Find decision makers at companies that recently raised funding",
    "Build a lead list of marketing heads at B2B SaaS companies with 10–50 employees",
  ],
  "Community Finder": [
    "Find Discord servers where SaaS founders hang out and discuss growth",
    "Discover the top 10 communities where my ICP gathers across all platforms",
    "Find Slack and Discord groups focused on B2B marketing and sales",
    "Score communities by ICP density and recommend the best ones to join first",
  ],
  "Content Studio": [
    "Create 3 TikTok video scripts showcasing my product's key features",
    "Design a content calendar for my first week of TikTok posting",
    "Write a pain-point explainer video script about why GTM is broken",
    "Generate thumbnail concepts and copy for a product demo video",
  ],
  "GEO Optimizer": [
    "Check the GEO status of my website and score its AI visibility",
    "Audit my robots.txt — are AI bots like GPTBot and ClaudeBot allowed?",
    "Test whether ChatGPT, Perplexity, or Claude can find my product",
    "Generate a full GEO report with actionable fixes for AI search visibility",
  ],
};

const BROWSER_AGENTS = new Set(["Twitter Manager", "Reddit Scout", "Lead Finder", "Community Finder"]);

const AGENT_QUESTIONS: Record<string, AgentQuestion[]> = {
  "Twitter Manager": [
    { id: "product", prompt: "How should I learn about your product?", options: [
      { id: "url", label: "I'll paste my website URL" },
      { id: "describe", label: "I'll describe it in a message" },
      { id: "existing", label: "You already know — use my profile" },
    ]},
    { id: "schedule", prompt: "How often should I run?", options: [
      { id: "continuous", label: "Continuously (every few hours)" },
      { id: "daily", label: "Once a day" },
      { id: "manual", label: "Only when I ask" },
    ]},
    { id: "tone", prompt: "What tone should I use on Twitter?", options: [
      { id: "casual", label: "Casual & conversational" },
      { id: "professional", label: "Professional & authoritative" },
      { id: "witty", label: "Witty & opinionated" },
    ]},
    { id: "approval", prompt: "Should I post automatically or draft for review?", options: [
      { id: "draft", label: "Draft for my approval first" },
      { id: "auto", label: "Auto-post (I trust you)" },
    ]},
  ],
  "Reddit Scout": [
    { id: "product", prompt: "How should I learn about your product?", options: [
      { id: "url", label: "I'll paste my website URL" },
      { id: "describe", label: "I'll describe it in a message" },
      { id: "existing", label: "You already know — use my profile" },
    ]},
    { id: "schedule", prompt: "How often should I scan Reddit?", options: [
      { id: "continuous", label: "Every 6 hours" },
      { id: "daily", label: "Once a day" },
      { id: "manual", label: "Only when I ask" },
    ]},
    { id: "approval", prompt: "Should I auto-reply or draft comments for review?", options: [
      { id: "draft", label: "Draft for my approval" },
      { id: "auto", label: "Auto-reply (I trust you)" },
    ]},
  ],
  "Lead Finder": [
    { id: "product", prompt: "How should I learn about your product?", options: [
      { id: "url", label: "I'll paste my website URL" },
      { id: "describe", label: "I'll describe it in a message" },
      { id: "existing", label: "You already know — use my profile" },
    ]},
    { id: "count", prompt: "How many leads do you need?", options: [
      { id: "20", label: "~20 leads" },
      { id: "50", label: "~50 leads" },
      { id: "100", label: "100+ leads" },
    ]},
    { id: "schedule", prompt: "One-time search or recurring?", options: [
      { id: "once", label: "One-time batch" },
      { id: "weekly", label: "Weekly batches" },
      { id: "biweekly", label: "Every 2 weeks" },
    ]},
  ],
  "Community Finder": [
    { id: "product", prompt: "How should I learn about your product?", options: [
      { id: "url", label: "I'll paste my website URL" },
      { id: "describe", label: "I'll describe it in a message" },
      { id: "existing", label: "You already know — use my profile" },
    ]},
    { id: "platforms", prompt: "Which platforms should I search?", allowMultiple: true, options: [
      { id: "discord", label: "Discord" },
      { id: "reddit", label: "Reddit" },
      { id: "slack", label: "Slack" },
      { id: "all", label: "All platforms" },
    ]},
    { id: "schedule", prompt: "Should I keep monitoring for new communities?", options: [
      { id: "once", label: "One-time scan" },
      { id: "weekly", label: "Monitor weekly" },
      { id: "monthly", label: "Monitor monthly" },
    ]},
  ],
  "Content Studio": [
    { id: "product", prompt: "How should I learn about your product?", options: [
      { id: "url", label: "I'll paste my website URL" },
      { id: "describe", label: "I'll describe it in a message" },
      { id: "existing", label: "You already know — use my profile" },
    ]},
    { id: "frequency", prompt: "How many posts per week?", options: [
      { id: "3", label: "3 posts/week" },
      { id: "5", label: "5 posts/week" },
      { id: "daily", label: "Daily" },
    ]},
    { id: "format", prompt: "What content format?", allowMultiple: true, options: [
      { id: "video", label: "Short-form video" },
      { id: "image", label: "Image + copy" },
      { id: "thread", label: "Twitter thread" },
    ]},
    { id: "approval", prompt: "Should I auto-publish or send drafts?", options: [
      { id: "draft", label: "Send drafts for review" },
      { id: "auto", label: "Auto-publish" },
    ]},
  ],
  "GEO Optimizer": [
    { id: "url", prompt: "What is your website URL?", allowCustom: true, options: [
      { id: "custom", label: "I'll type it below" },
    ]},
    { id: "schedule", prompt: "Should I re-audit periodically?", options: [
      { id: "once", label: "One-time audit" },
      { id: "weekly", label: "Re-audit weekly" },
      { id: "monthly", label: "Re-audit monthly" },
    ]},
  ],
};

interface AgentPlanDef {
  text: string;
  todos: { label: string; detail?: string }[];
}

const AGENT_PLANS: Record<string, AgentPlanDef> = {
  "Twitter Manager": {
    text: "Got it. I've analyzed your product and target audience. Here's my plan:",
    todos: [
      { label: "Scan X for signal posts", detail: "Search for posts about manual outbound pain, lead research, and GTM automation needs" },
      { label: "Draft replies to top signal posts", detail: "Write 4 helpful, non-promotional replies to the highest-engagement posts" },
      { label: "Write a thread", detail: "'3 signs your GTM process needs automation' — educational content that positions your product" },
      { label: "Engage with ICP accounts", detail: "Like, reply, and follow 10 accounts matching your ICP on trending SaaS growth topics" },
    ],
  },
  "Reddit Scout": {
    text: "Got it. I'll map out the Reddit landscape for your product. Here's my plan:",
    todos: [
      { label: "Scan subreddits for signal posts", detail: "r/SaaS, r/startups, r/Entrepreneur, r/marketing — looking for GTM pain signals" },
      { label: "Rank posts by relevance", detail: "Score each post by ICP match, engagement, and recency" },
      { label: "Draft authentic comments", detail: "Write value-adding replies for the top 5 posts — you approve before posting" },
      { label: "Set up signal monitoring", detail: "Configure alerts for new high-signal posts across 6 subreddits" },
    ],
  },
  "Lead Finder": {
    text: "Got it. I'll start finding decision makers matching your ICP. Here's my plan:",
    todos: [
      { label: "Search LinkedIn for leads", detail: "VP Marketing / Head of Growth at Seed–Series B SaaS companies" },
      { label: "Cross-reference with Twitter", detail: "Find leads who are active on X and engaged in relevant conversations" },
      { label: "Score leads by ICP quality", detail: "Rank by title, company size, industry, and social activity" },
      { label: "Draft personalized outreach", detail: "Write custom messages for the top 10 leads based on their recent activity" },
    ],
  },
  "Community Finder": {
    text: "Got it. I'll find where your audience hangs out. Here's my plan:",
    todos: [
      { label: "Search for Discord servers", detail: "SaaS founders, marketing, and growth-focused communities" },
      { label: "Find Twitter communities", detail: "Active Communities and Spaces in the B2B SaaS niche" },
      { label: "Score each community", detail: "Rank by ICP density, activity level, and ease of joining" },
      { label: "Draft intro messages", detail: "Write tailored introductions for top 5 communities" },
    ],
  },
  "Content Studio": {
    text: "Got it. I'll create content that showcases your product. Here's my plan:",
    todos: [
      { label: "Identify best content angles", detail: "Analyze your product for 3 high-impact short-form video concepts" },
      { label: "Script 3 TikTok videos", detail: "Product demo, pain-point explainer, and before/after transformation" },
      { label: "Generate visual concepts", detail: "Thumbnail designs and visual style guide for each video" },
      { label: "Write captions & schedule", detail: "Optimized hashtags, captions, and posting times for TikTok" },
    ],
  },
  "GEO Optimizer": {
    text: "Got it. I'll audit your site's visibility to AI search engines. Here's my plan:",
    todos: [
      { label: "Check robots.txt & AI bot access", detail: "Verify Googlebot, GPTBot, ClaudeBot, PerplexityBot are allowed to crawl your site" },
      { label: "Audit llms.txt & structured data", detail: "Check for llms.txt, schema.org markup, and machine-readable metadata" },
      { label: "Test AI search visibility", detail: "Query ChatGPT, Perplexity, and Claude to see if they reference your site" },
      { label: "Generate GEO score & recommendations", detail: "Score your site 0–100 and provide actionable fixes to improve AI visibility" },
    ],
  },
};


function getAgentResponse(agentName: string, _agentColor: string, userMsg: string, turn: number): { text: string; planItems?: PlanItem[]; taskCards?: TaskCard[]; todoPlans?: TodoPlan[]; browserSetup?: { platform: string }; questions?: AgentQuestion[] } {
  if (turn === 0) {
    const needsBrowser = BROWSER_AGENTS.has(agentName);
    const platformLabel = agentName === "Twitter Manager" ? "Twitter/X" : agentName === "Reddit Scout" ? "Reddit" : agentName === "Lead Finder" ? "LinkedIn & Twitter" : "Discord & Reddit";
    const questions = AGENT_QUESTIONS[agentName];

    return {
      text: "Before I start, I need a few things from you to be effective. Answer the questions below and I'll build a tailored plan.",
      questions,
      browserSetup: needsBrowser ? { platform: platformLabel } : undefined,
    };
  }

  if (turn === 1) {
    const plan = AGENT_PLANS[agentName];
    if (plan) {
      return {
        text: "Thanks — I now have a clear picture of your product and audience. Here's my plan:",
        todoPlans: plan.todos.map((t, i) => ({ id: i + 1, label: t.label, detail: t.detail })),
      };
    }
    return {
      text: "Thanks — I now have a clear picture. Here's my plan:",
      todoPlans: [
        { id: 1, label: "Analyze your product and target audience" },
        { id: 2, label: "Execute the primary task" },
        { id: 3, label: "Report back with results" },
      ],
    };
  }

  const schedules: Record<string, string> = {
    "Twitter Manager": "Runs daily, 9am–6pm",
    "Reddit Scout": "Every 6 hours",
    "Lead Finder": "Weekly, 50 leads/batch",
    "Community Finder": "Runs weekly",
    "Content Studio": "3 posts/week",
  };
  const confirmWords = ["yes", "go", "confirm", "start", "do it", "sounds good", "let's go", "approve", "ok", "sure", "proceed", "lgtm"];
  if (confirmWords.some(w => userMsg.toLowerCase().includes(w))) {
    const plan = AGENT_PLANS[agentName];
    const tasks = plan ? plan.todos.map(t => t.label) : ["Executing task"];
    return {
      text: `On it. I've started an **ongoing task** — I'll keep working on this on schedule. You can pause, resume, or stop me anytime from here or from **Mission Control**.\n\n**What I'm doing:**\n${tasks.map((t, i) => `${i + 1}. ${t}`).join("\n")}`,
      taskCards: [
        { agent: agentName, color: _agentColor, title: plan?.todos[0]?.label ?? "Running task", schedule: schedules[agentName] ?? "Continuous", status: "running" },
      ],
    };
  }

  return { text: "Got it — I'll adjust the plan. What would you like to change?" };
}

// ── Main component ───────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 18) return "Afternoon";
  return "Evening";
}

interface Props {
  onNavigate:               (tab: SidebarTab) => void;
  conversationId?:          string;
  onNewConversation?:       (id: string) => void;
  initialPrompt?:           string;
  onInitialPromptConsumed?: () => void;
  userName?:                string;
  agentName?:               string;
  agentInfo?:               AgentChatInfo;
  onChatWithAgent?:         (agent: { name: string; color: string; tagline: string; starter: string }) => void;
}

export default function AriaChat({ onNavigate, initialPrompt, onInitialPromptConsumed, userName, agentName, agentInfo, onChatWithAgent }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(initialPrompt ?? "");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingExtras, setStreamingExtras] = useState<{ planItems?: PlanItem[]; taskCards?: TaskCard[]; todoPlans?: TodoPlan[]; browserSetup?: { platform: string }; questions?: AgentQuestion[] }>({});
  const [selectedModel, setSelectedModel] = useState("deepseek-v3");
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const turnRef = useRef(0);

  const isAgentMode = !!agentName;

  useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt);
      onInitialPromptConsumed?.();
      setTimeout(() => { textareaRef.current?.focus(); resizeTextarea(); }, 50);
    }
  }, [initialPrompt]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamingText]);

  function resizeTextarea() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
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

    const response = isAgentMode && agentInfo
      ? getAgentResponse(agentInfo.name, agentInfo.color, msg, turn)
      : getAriaResponse(msg, turn);

    setStreaming(true);
    setStreamingText("");
    setStreamingExtras({ planItems: response.planItems, taskCards: response.taskCards, todoPlans: response.todoPlans, browserSetup: response.browserSetup, questions: response.questions });

    let idx = 0;
    const fullText = response.text;
    const interval = setInterval(() => {
      idx = Math.min(idx + 3, fullText.length);
      setStreamingText(fullText.slice(0, idx));
      if (idx >= fullText.length) {
        clearInterval(interval);
        const assistantMsg: ChatMessage = {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: fullText,
          planItems: response.planItems,
          taskCards: response.taskCards,
          todoPlans: response.todoPlans,
          browserSetup: response.browserSetup,
          questions: response.questions,
        };
        setMessages(prev => [...prev, assistantMsg]);
        setStreaming(false);
        setStreamingText("");
        setStreamingExtras({});
      }
    }, 12);
  }, [input, streaming, isAgentMode, agentInfo]);

  const handleQuestionAnswers = useCallback((answers: Record<string, string[]>) => {
    const agentQs = agentName ? AGENT_QUESTIONS[agentName] : undefined;
    if (!agentQs) return;
    const lines = agentQs.map(q => {
      const sel = answers[q.id] ?? [];
      const labels = sel.map(s => q.options.find(o => o.id === s)?.label ?? s).join(", ");
      return `${q.prompt} ${labels}`;
    });
    const summary = lines.join("\n");
    setTimeout(() => submit(summary), 300);
  }, [agentName, submit]);

  const firstName = userName
    ? (userName.split("@")[0].split(/[._-]/)[0] ?? "there").replace(/^./, c => c.toUpperCase())
    : "there";

  const isEmpty = messages.length === 0 && !streaming;

  if (isEmpty) {
    if (isAgentMode && agentInfo) {
      const initials = agentInfo.name.split(" ").map(w => w[0]).join("").slice(0, 2);
      return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.bg }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", animation: "fadeUp .35s ease" }}>
            <div style={{ width: "100%", maxWidth: 640, margin: "0 auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24, justifyContent: "center" }}>
                <div style={{ width: 40, height: 40, borderRadius: 40 * 0.28, background: `${agentInfo.color}18`, border: `1.5px solid ${agentInfo.color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 600, color: agentInfo.color }}>{initials}</span>
                </div>
                <h2 style={{ fontSize: 28, fontWeight: 300, fontFamily: T.serif, color: "#333", letterSpacing: "-0.01em", lineHeight: 1.3, margin: 0 }}>
                  {agentInfo.name}
                </h2>
              </div>
              <p style={{ textAlign: "center", fontSize: 13, color: T.textMid, marginBottom: 6, lineHeight: 1.6 }}>
                {agentInfo.tagline}
              </p>
              <p style={{ textAlign: "center", fontSize: 13, color: T.text, marginBottom: 20, lineHeight: 1.6, fontWeight: 500 }}>
                Tell me about your product and target audience to get started.
              </p>
              <InputBox ref={textareaRef} value={input} onChange={e => { setInput(e.target.value); resizeTextarea(); }} onKeyDown={handleKeyDown} onSubmit={() => submit()} streaming={streaming} large placeholder={`Tell ${agentInfo.name} what you need…`} />
              {(() => {
                const suggestions = AGENT_SUGGESTIONS[agentInfo.name];
                if (!suggestions || suggestions.length === 0) return null;
                return (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}>
                    {suggestions.map((s, i) => (
                      <button key={i} onClick={() => { setInput(s); textareaRef.current?.focus(); resizeTextarea(); }} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 12, color: T.textMid, textAlign: "left", lineHeight: 1.5, cursor: "pointer", transition: "border-color .15s, color .15s" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = agentInfo.color + "50"; e.currentTarget.style.color = T.text; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textMid; }}
                      >{s}</button>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.bg }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", animation: "fadeUp .35s ease" }}>
          <div style={{ width: "100%", maxWidth: 640, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 12 }}>
                <PixelBot />
                <h2 style={{ fontSize: 28, fontWeight: 300, fontFamily: T.serif, color: "#333", letterSpacing: "-0.01em", lineHeight: 1.3, margin: 0 }}>
                  {greeting()}, {firstName}
                </h2>
              </div>
              <p style={{ fontSize: 13, color: T.textMid, lineHeight: 1.6, margin: 0 }}>
                Tell me your product — I'll craft a GTM strategy and deploy the right agents.
              </p>
            </div>
            <InputBox ref={textareaRef} value={input} onChange={e => { setInput(e.target.value); resizeTextarea(); }} onKeyDown={handleKeyDown} onSubmit={() => submit()} streaming={streaming} large placeholder="Paste your URL or describe your product…" />
            <div style={{ marginTop: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 10, fontFamily: T.mono, color: T.textDim, letterSpacing: 0.5, textTransform: "uppercase" }}>or pick an agent to start</span>
                <div style={{ flex: 1, height: 1, background: T.border }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
                {QUICK_ACTIONS.map(action => <QuickActionCard key={action.label} action={action} onRun={() => {
                  if (onChatWithAgent) {
                    onChatWithAgent({ name: action.agent, color: action.color, tagline: action.desc, starter: action.prompt });
                  }
                }} />)}
              </div>
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
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} agentInfo={agentInfo} onViewMissions={() => onNavigate("missions")} onSubmitAnswers={handleQuestionAnswers} />
          ))}
          {streaming && (
            <StreamingBubble text={streamingText} extras={streamingExtras} agentInfo={agentInfo} />
          )}
          <div ref={endRef} />
        </div>
      </div>
      <div style={{ padding: "12px 24px 20px", borderTop: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ marginBottom: 8 }}>
            <ModelSelector selected={selectedModel} onChange={setSelectedModel} />
          </div>
          <InputBox ref={textareaRef} value={input} onChange={e => { setInput(e.target.value); resizeTextarea(); }} onKeyDown={handleKeyDown} onSubmit={() => submit()} streaming={streaming} placeholder={isAgentMode && agentInfo ? `Message ${agentInfo.name}…` : undefined} />
        </div>
      </div>
    </div>
  );
}

// ── Message Bubble ────────────────────────────────────────────────────────────

function MessageBubble({ message, agentInfo, onViewMissions, onSubmitAnswers }: { message: ChatMessage; agentInfo?: AgentChatInfo; onViewMissions: () => void; onSubmitAnswers?: (answers: Record<string, string[]>) => void }) {
  const isUser = message.role === "user";
  const nameLabel = agentInfo ? agentInfo.name : "ARIA";
  const initials = agentInfo ? agentInfo.name.split(" ").map(w => w[0]).join("").slice(0, 2) : "A";
  const avatarEl = !isUser && (agentInfo
    ? <div style={{ width: 28, height: 28, borderRadius: 28 * 0.28, background: `${agentInfo.color}18`, border: `1.5px solid ${agentInfo.color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 600, color: agentInfo.color }}>{initials}</span></div>
    : <AriaAvatar size={28} />);

  return (
    <div style={{ display: "flex", gap: 10, animation: "slideIn .2s ease", flexDirection: isUser ? "row-reverse" : "row" }}>
      {!isUser && avatarEl}
      <div style={{ maxWidth: "80%", display: "flex", flexDirection: "column", gap: 6, alignItems: isUser ? "flex-end" : "flex-start" }}>
        {!isUser && <span style={{ fontSize: 10, color: agentInfo ? agentInfo.color : T.green, fontFamily: T.mono, letterSpacing: .5 }}>{nameLabel}</span>}
        <div style={{ background: isUser ? T.text : T.surface, color: isUser ? "#fff" : T.text, border: isUser ? "none" : `1px solid ${T.border}`, borderRadius: isUser ? "12px 12px 4px 12px" : "4px 12px 12px 12px", padding: "10px 14px", fontSize: 14 }}>
          {isUser ? <span style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{message.content}</span> : renderMarkdown(message.content)}
        </div>
        {message.questions && onSubmitAnswers && <QuestionCard questions={message.questions} agentColor={agentInfo?.color} onSubmitAnswers={onSubmitAnswers} />}
        {message.planItems && <PlanCard items={message.planItems} />}
        {message.todoPlans && <TodoPlanCard items={message.todoPlans} agentColor={agentInfo?.color} />}
        {message.browserSetup && <BrowserSetupCard platform={message.browserSetup.platform} />}
        {message.taskCards?.map((tc, i) => <TaskCreatedCard key={i} task={tc} onViewMissions={onViewMissions} />)}
      </div>
    </div>
  );
}

function StreamingBubble({ text, extras, agentInfo }: { text: string; extras: { planItems?: PlanItem[]; taskCards?: TaskCard[]; todoPlans?: TodoPlan[]; browserSetup?: { platform: string }; questions?: AgentQuestion[] }; agentInfo?: AgentChatInfo }) {
  const nameLabel = agentInfo ? agentInfo.name : "ARIA";
  const initials = agentInfo ? agentInfo.name.split(" ").map(w => w[0]).join("").slice(0, 2) : "A";
  const avatarEl = agentInfo
    ? <div style={{ width: 28, height: 28, borderRadius: 28 * 0.28, background: `${agentInfo.color}18`, border: `1.5px solid ${agentInfo.color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 600, color: agentInfo.color }}>{initials}</span></div>
    : <AriaAvatar size={28} />;

  return (
    <div style={{ display: "flex", gap: 10 }}>
      {avatarEl}
      <div style={{ maxWidth: "80%", display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 10, color: agentInfo ? agentInfo.color : T.green, fontFamily: T.mono, letterSpacing: .5 }}>{nameLabel}</span>
        <div style={{ background: T.surface, color: T.text, border: `1px solid ${T.border}`, borderRadius: "4px 12px 12px 12px", padding: "10px 14px", fontSize: 14 }}>
          {renderMarkdown(text)}
          <span style={{ display: "inline-block", width: 2, height: 14, background: T.textDim, marginLeft: 2, verticalAlign: "middle", animation: "blink 1s infinite" }} />
        </div>
        {extras.todoPlans && <TodoPlanCard items={extras.todoPlans} agentColor={agentInfo?.color} />}
        {extras.browserSetup && <BrowserSetupCard platform={extras.browserSetup.platform} />}
      </div>
    </div>
  );
}

// ── Plan card (action items before confirmation) ─────────────────────────────

function PlanCard({ items }: { items: PlanItem[] }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px", width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 10, fontFamily: T.mono, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Action Plan</div>
      {items.map((item, i) => {
        const initials = item.agent.split(" ").map(w => w[0]).join("").slice(0, 2);
        return (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 10px", background: `${item.color}06`, border: `1px solid ${item.color}15`, borderRadius: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: `${item.color}18`, border: `1px solid ${item.color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
              <span style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 600, color: item.color }}>{initials}</span>
            </div>
            <div>
              <span style={{ fontSize: 11, fontFamily: T.mono, fontWeight: 600, color: item.color }}>{item.agent}</span>
              <div style={{ fontSize: 12, color: T.textMid, lineHeight: 1.5, marginTop: 2 }}>{item.action}</div>
            </div>
          </div>
        );
      })}
      <p style={{ fontSize: 11, color: T.textMid, margin: "4px 0 0", fontStyle: "italic" }}>
        Reply "go" to confirm and start execution, or tell me what to adjust.
      </p>
    </div>
  );
}

// ── Todo Plan Card (Cursor/Claude style checklist) ───────────────────────────

function TodoPlanCard({ items, agentColor }: { items: TodoPlan[]; agentColor?: string }) {
  const color = agentColor ?? T.green;
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px", width: "100%", display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8h12M2 4h12M2 12h8" /></svg>
        <span style={{ fontSize: 10, fontFamily: T.mono, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.05em" }}>Plan</span>
      </div>
      {items.map(item => (
        <div key={item.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderTop: `1px solid ${T.border}` }}>
          <div style={{ width: 20, height: 20, borderRadius: 5, border: `1.5px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
            <span style={{ fontSize: 10, fontFamily: T.mono, fontWeight: 600, color: T.textDim }}>{item.id}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: T.text, lineHeight: 1.5 }}>{item.label}</div>
            {item.detail && <div style={{ fontSize: 11, color: T.textDim, lineHeight: 1.5, marginTop: 2 }}>{item.detail}</div>}
          </div>
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke={T.textDim} strokeWidth="1.5" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
        <span style={{ fontSize: 11, color: T.textMid, fontStyle: "italic" }}>Reply "go" to start, or tell me what to change.</span>
      </div>
    </div>
  );
}

// ── Ongoing task card (with pause/resume/stop controls) ──────────────────────

function TaskCreatedCard({ task, onViewMissions }: { task: TaskCard; onViewMissions: () => void }) {
  const [status, setStatus] = useState<OngoingTaskStatus>(task.status);
  const initials = task.agent.split(" ").map(w => w[0]).join("").slice(0, 2);
  const isRunning = status === "running";
  const isPaused = status === "paused";
  const isStopped = status === "stopped";

  const badge = isRunning
    ? { label: "Running", color: T.green, bg: `${T.green}14`, border: `${T.green}30`, pulse: true }
    : isPaused
    ? { label: "Paused", color: "#D97706", bg: "#FEF3C7", border: "#FDE68A", pulse: false }
    : { label: "Stopped", color: T.textDim, bg: T.bg, border: T.border, pulse: false };

  if (isStopped) {
    return (
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px", width: "100%", opacity: 0.6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `${T.textDim}14`, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 600, color: T.textDim }}>{initials}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 10, fontFamily: T.mono, fontWeight: 600, color: T.textDim }}>{task.agent}</span>
              <span style={{ fontSize: 10, fontFamily: T.mono, color: T.textDim, background: T.bg, borderRadius: 4, padding: "1px 6px", border: `1px solid ${T.border}` }}>Stopped</span>
            </div>
            <span style={{ fontSize: 12, color: T.textDim, fontWeight: 500, textDecoration: "line-through" }}>{task.title}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px", width: "100%", transition: "opacity .2s", opacity: isPaused ? 0.85 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${task.color}14`, border: `1px solid ${task.color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 600, color: task.color }}>{initials}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 10, fontFamily: T.mono, fontWeight: 600, color: task.color }}>{task.agent}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontFamily: T.mono, color: badge.color, background: badge.bg, borderRadius: 100, padding: "2px 8px", border: `1px solid ${badge.border}` }}>
              {badge.pulse && <span style={{ width: 4, height: 4, borderRadius: "50%", background: badge.color, display: "inline-block", animation: "pulse 2s infinite" }} />}
              {badge.label}
            </span>
          </div>
          <span style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>{task.title}</span>
        </div>
      </div>

      {/* Schedule */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 10, fontFamily: T.mono, color: T.textDim }}>
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ flexShrink: 0 }}><circle cx="8" cy="8" r="6.5" /><path d="M8 4.5V8l2.5 1.5" /></svg>
        {task.schedule}
        <span style={{ color: T.textDim }}>·</span>
        <span>Ongoing</span>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
        <ChatControlBtn
          onClick={() => setStatus(isRunning ? "paused" : "running")}
          icon={isRunning ? <ChatPauseIcon /> : <ChatPlayIcon />}
          label={isRunning ? "Pause" : "Resume"}
          color={isRunning ? T.textMid : T.green}
          hoverColor={isRunning ? "#D97706" : T.green}
        />
        <ChatControlBtn
          onClick={() => setStatus("stopped")}
          icon={<ChatStopIcon />}
          label="Stop"
          color={T.textDim}
          hoverColor="#DC2626"
        />
        <div style={{ flex: 1 }} />
        <button onClick={onViewMissions} style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: "none", cursor: "pointer", fontSize: 10, fontFamily: T.mono, color: T.textDim, padding: "4px 0" }}
          onMouseEnter={e => { e.currentTarget.style.color = task.color; }}
          onMouseLeave={e => { e.currentTarget.style.color = T.textDim; }}
        >Mission Control →</button>
      </div>
    </div>
  );
}

// ── Markdown renderer ────────────────────────────────────────────────────────

function inlineFormat(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} style={{ fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i} style={{ fontFamily: T.mono, fontSize: 12, background: "rgba(0,0,0,0.07)", padding: "1px 4px", borderRadius: 3 }}>{part.slice(1, -1)}</code>;
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
    if (line.startsWith("### ")) { nodes.push(<h3 key={nodes.length} style={{ fontSize: 14, fontWeight: 600, color: T.text, margin: "14px 0 4px" }}>{inlineFormat(line.slice(4))}</h3>); i++; continue; }
    if (line.startsWith("## ")) { nodes.push(<h2 key={nodes.length} style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: "16px 0 6px" }}>{inlineFormat(line.slice(3))}</h2>); i++; continue; }
    if (line.match(/^[-*] /)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) { items.push(<li key={i} style={{ margin: "3px 0", lineHeight: 1.65 }}>{inlineFormat(lines[i].slice(2))}</li>); i++; }
      nodes.push(<ul key={nodes.length} style={{ margin: "4px 0 8px", paddingLeft: 20 }}>{items}</ul>);
      continue;
    }
    if (line.match(/^\d+\. /)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) { items.push(<li key={i} style={{ margin: "3px 0", lineHeight: 1.65 }}>{inlineFormat(lines[i].replace(/^\d+\.\s/, ""))}</li>); i++; }
      nodes.push(<ol key={nodes.length} style={{ margin: "4px 0 8px", paddingLeft: 20 }}>{items}</ol>);
      continue;
    }
    if (line.trim() === "") { if (nodes.length > 0) nodes.push(<div key={nodes.length} style={{ height: 6 }} />); i++; continue; }
    nodes.push(<p key={nodes.length} style={{ margin: 0, lineHeight: 1.75 }}>{inlineFormat(line)}</p>);
    i++;
  }
  return <>{nodes}</>;
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface InputBoxProps {
  value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void; onSubmit: () => void;
  streaming: boolean; large?: boolean; placeholder?: string;
}

const InputBox = forwardRef<HTMLTextAreaElement, InputBoxProps>(
  ({ value, onChange, onKeyDown, onSubmit, streaming, large, placeholder = "Message ARIA..." }, ref) => (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, background: T.surface, border: `1px solid ${T.border}`, borderRadius: large ? 16 : 12, padding: large ? "14px 16px" : "10px 12px", boxShadow: large ? "0 4px 24px rgba(0,0,0,0.07)" : "0 2px 8px rgba(0,0,0,0.04)" }}>
      <textarea ref={ref} value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder} rows={large ? 3 : 1}
        style={{ flex: 1, border: "none", background: "transparent", fontSize: large ? 15 : 14, color: T.text, fontFamily: T.sans, resize: "none", lineHeight: 1.65, outline: "none", minHeight: large ? 72 : undefined }} />
      <button onClick={onSubmit} disabled={streaming || !value.trim()}
        style={{ background: value.trim() && !streaming ? T.text : T.border, color: value.trim() && !streaming ? "#fff" : T.textDim, border: "none", borderRadius: large ? 10 : 8, width: large ? 38 : 32, height: large ? 38 : 32, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background .15s", cursor: value.trim() && !streaming ? "pointer" : "default" }}>
        {streaming ? <Spinner /> : <SendIcon />}
      </button>
    </div>
  )
);

// ── Model Selector ────────────────────────────────────────────────────────────

interface ModelOption {
  id: string;
  label: string;
  desc: string;
  pro: boolean;
}

const MODELS: ModelOption[] = [
  { id: "deepseek-v3",   label: "DeepSeek V3",     desc: "Fast & capable",         pro: false },
  { id: "deepseek-r1",   label: "DeepSeek R1",     desc: "Advanced reasoning",     pro: true },
  { id: "claude-opus",   label: "Claude 4 Opus",   desc: "Best for complex tasks",  pro: true },
  { id: "gpt-4o",        label: "GPT-4o",          desc: "OpenAI flagship",         pro: true },
  { id: "gemini-pro",    label: "Gemini 2.5 Pro",  desc: "Google multimodal",       pro: true },
];

function ModelSelector({ selected, onChange }: { selected: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = MODELS.find(m => m.id === selected) ?? MODELS[0];

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "transparent", border: "none", cursor: "pointer",
          padding: "4px 0", fontSize: 12, fontFamily: T.mono, color: T.textMid,
        }}
      >
        <ModelIcon />
        <span style={{ fontWeight: 500, color: T.text }}>{current.label}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
          <path d="M2 3.5l3 3 3-3" stroke={T.textDim} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: 0,
          background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)", padding: "6px",
          minWidth: 260, zIndex: 100, animation: "fadeUp .15s ease",
        }}>
          {MODELS.map(model => {
            const isSelected = model.id === selected;
            return (
              <button
                key={model.id}
                onClick={() => { if (!model.pro) { onChange(model.id); setOpen(false); } }}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "9px 10px", borderRadius: 7, border: "none",
                  background: isSelected ? T.bg : "transparent",
                  cursor: model.pro ? "default" : "pointer",
                  opacity: model.pro ? 0.55 : 1,
                  transition: "background .1s",
                }}
                onMouseEnter={e => { if (!model.pro && !isSelected) e.currentTarget.style.background = T.bg; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: model.pro ? T.textDim : T.text }}>{model.label}</span>
                    {model.pro && (
                      <span style={{
                        fontSize: 9, fontFamily: T.mono, fontWeight: 600,
                        color: "#8B5CF6", background: "#8B5CF614",
                        borderRadius: 4, padding: "1px 5px",
                        border: "1px solid #8B5CF625",
                        letterSpacing: "0.04em",
                      }}>PRO</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: T.textDim, marginTop: 2 }}>{model.desc}</div>
                </div>
                {isSelected && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7l3 3 5-5.5" stroke={T.green} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ModelIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={T.textDim} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M5.5 8l2 2 3-3.5" />
    </svg>
  );
}

// ── Quick Action Card ─────────────────────────────────────────────────────────

function QuickActionCard({ action, onRun }: { action: QuickAction; onRun: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onRun} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: T.surface, border: `1px solid ${hov ? action.color + "50" : T.border}`, borderRadius: 10, padding: "14px 14px 12px", textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: 8, transition: "border-color .15s, box-shadow .15s", boxShadow: hov ? `0 2px 12px ${action.color}12` : "none", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: `${action.color}14`, border: `1px solid ${action.color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 600, color: action.color }}>{action.icon}</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: action.color, lineHeight: 1.3 }}>{action.agent}</span>
      </div>
      <p style={{ fontSize: 11, color: T.textMid, lineHeight: 1.5, margin: 0, flex: 1 }}>{action.label}. {action.desc}</p>
    </button>
  );
}

function PixelBot() {
  const S = 4; const c = T.textDim; const g = T.green; const _ = null;
  const grid: (string | null)[][] = [
    [_,_,_,_,c,c,_,_,_,_],[_,_,_,_,c,_,_,_,_,_],[_,c,c,c,c,c,c,c,c,_],[_,c,_,_,_,_,_,_,c,_],
    [_,c,_,g,g,g,g,_,c,_],[_,c,_,g,_,_,g,_,c,_],[_,c,_,g,g,g,g,_,c,_],[_,c,_,_,_,_,_,_,c,_],
    [_,c,c,c,c,c,c,c,c,_],[_,_,c,c,_,_,c,c,_,_],
  ];
  return (
    <svg width={10*S} height={10*S} viewBox={`0 0 ${10*S} ${10*S}`} style={{ imageRendering: "pixelated", flexShrink: 0 }}>
      {grid.map((row, r) => row.map((fill, col) => fill ? <rect key={`${r}-${col}`} x={col*S} y={r*S} width={S} height={S} fill={fill} /> : null))}
    </svg>
  );
}

function QuestionCard({ questions, agentColor, onSubmitAnswers }: { questions: AgentQuestion[]; agentColor?: string; onSubmitAnswers: (answers: Record<string, string[]>) => void }) {
  const color = agentColor ?? T.green;
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const q = questions[page];
  const total = questions.length;
  const selected = answers[q.id] ?? [];

  function toggleOption(optId: string) {
    if (submitted) return;
    setAnswers(prev => {
      const cur = prev[q.id] ?? [];
      if (q.allowMultiple) {
        return { ...prev, [q.id]: cur.includes(optId) ? cur.filter(x => x !== optId) : [...cur, optId] };
      }
      return { ...prev, [q.id]: [optId] };
    });
  }

  function handleContinue() {
    if (selected.length === 0) return;
    if (page < total - 1) {
      setPage(p => p + 1);
    } else {
      setSubmitted(true);
      onSubmitAnswers(answers);
    }
  }

  if (submitted) {
    const summary = questions.map(qq => {
      const sel = answers[qq.id] ?? [];
      const labels = sel.map(s => qq.options.find(o => o.id === s)?.label ?? s).join(", ");
      return `${qq.prompt} → ${labels}`;
    });
    return (
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px", width: "100%", opacity: 0.7 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke={T.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5l3.5 3.5 6.5-7" /></svg>
          <span style={{ fontSize: 10, fontFamily: T.mono, color: T.green, textTransform: "uppercase", letterSpacing: "0.05em" }}>Preferences confirmed</span>
        </div>
        {summary.map((s, i) => (
          <div key={i} style={{ fontSize: 11, color: T.textDim, lineHeight: 1.5, padding: "2px 0" }}>{s}</div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px", width: "100%", display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="7" />
            <path d="M5.5 6.5a2.5 2.5 0 014.6 1.3c0 1.7-2.6 1.7-2.6 1.7" />
            <circle cx="8" cy="12.5" r="0.5" fill={color} />
          </svg>
          <span style={{ fontSize: 10, fontFamily: T.mono, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.05em" }}>Questions</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => page > 0 && setPage(p => p - 1)} disabled={page === 0}
            style={{ background: "none", border: "none", cursor: page > 0 ? "pointer" : "default", padding: 2, color: page > 0 ? T.textMid : T.border, display: "flex" }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M7 3L4 6l3 3" /></svg>
          </button>
          <span style={{ fontSize: 10, fontFamily: T.mono, color: T.textDim }}>{page + 1} of {total}</span>
          <button onClick={() => page < total - 1 && selected.length > 0 && setPage(p => p + 1)} disabled={page >= total - 1 || selected.length === 0}
            style={{ background: "none", border: "none", cursor: (page < total - 1 && selected.length > 0) ? "pointer" : "default", padding: 2, color: (page < total - 1 && selected.length > 0) ? T.textMid : T.border, display: "flex" }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 3l3 3-3 3" /></svg>
          </button>
        </div>
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 10, lineHeight: 1.5 }}>
        {page + 1}. {q.prompt}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {q.options.map(opt => {
          const isSelected = selected.includes(opt.id);
          return (
            <button key={opt.id} onClick={() => toggleOption(opt.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 8, textAlign: "left",
                background: isSelected ? `${color}0A` : "transparent",
                border: `1.5px solid ${isSelected ? color : T.border}`,
                cursor: "pointer", transition: "all .12s", fontSize: 12, color: T.text,
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = T.borderMid; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = T.border; }}
            >
              <span style={{
                width: 20, height: 20, borderRadius: q.allowMultiple ? 4 : 10,
                border: `1.5px solid ${isSelected ? color : T.border}`,
                background: isSelected ? color : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                transition: "all .12s",
              }}>
                {isSelected && <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6l2.5 2.5 4.5-5" /></svg>}
              </span>
              <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 600, color: isSelected ? color : T.textDim, width: 14 }}>{String.fromCharCode(65 + q.options.indexOf(opt))}</span>
              <span style={{ flex: 1 }}>{opt.label}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 14, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
        <span style={{ fontSize: 11, color: T.textDim, fontFamily: T.mono }}>Skip <span style={{ fontSize: 10, color: T.border }}>Esc</span></span>
        <button onClick={handleContinue} disabled={selected.length === 0}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "7px 18px", borderRadius: 7,
            background: selected.length > 0 ? color : T.border,
            color: "#fff", border: "none", fontSize: 12, fontWeight: 600,
            cursor: selected.length > 0 ? "pointer" : "default",
            transition: "background .15s", opacity: selected.length > 0 ? 1 : 0.5,
          }}
        >
          Continue
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"><path d="M3.5 2l4 3-4 3" /></svg>
        </button>
      </div>
    </div>
  );
}

function BrowserSetupCard({ platform }: { platform: string }) {
  const [installHov, setInstallHov] = useState(false);
  return (
    <div style={{ background: "#FFFBEB", border: "1px solid #F59E0B25", borderRadius: 10, padding: "12px 14px", width: "100%", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: "#FEF3C7", border: "1px solid #F59E0B30", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="2" width="14" height="11" rx="2" stroke="#D97706" strokeWidth="1.3" />
          <path d="M1 5h14" stroke="#D97706" strokeWidth="1.3" />
          <circle cx="3.5" cy="3.5" r="0.6" fill="#D97706" />
          <circle cx="5.5" cy="3.5" r="0.6" fill="#D97706" />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#92400E" }}>Browser extension needed for {platform}</div>
        <div style={{ fontSize: 11, color: "#A16207", marginTop: 2 }}>Install it to let me interact with the platform on your behalf.</div>
      </div>
      <button
        onClick={() => {/* TODO: open extension install page */}}
        onMouseEnter={() => setInstallHov(true)}
        onMouseLeave={() => setInstallHov(false)}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "6px 14px", borderRadius: 7, flexShrink: 0,
          background: installHov ? "#B45309" : "#D97706",
          color: "#fff", border: "none", fontSize: 11, fontWeight: 600,
          cursor: "pointer", transition: "background .15s", whiteSpace: "nowrap",
        }}
      >
        Install
      </button>
    </div>
  );
}

function AriaAvatar({ size }: { size: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.3, background: T.text, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ color: T.green, fontFamily: T.mono, fontSize: size * 0.4, fontWeight: 500 }}>A</span>
    </div>
  );
}

function SendIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M12 7L2 2l2.5 5L2 12l10-5z" fill="currentColor" /></svg>; }
function Spinner() { return <span style={{ width: 14, height: 14, border: "2px solid #fff4", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin .6s linear infinite" }} />; }

// ── Chat inline control button + icons ───────────────────────────────────────

function ChatControlBtn({ onClick, icon, label, color, hoverColor }: { onClick: () => void; icon: React.ReactNode; label: string; color: string; hoverColor: string }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 4,
        padding: "5px 10px", borderRadius: 6,
        border: `1px solid ${hov ? hoverColor + "40" : T.border}`,
        background: hov ? `${hoverColor}08` : "transparent",
        color: hov ? hoverColor : color,
        fontSize: 10, fontFamily: T.mono, fontWeight: 500,
        cursor: "pointer", transition: "all .15s",
      }}
    >
      {icon}{label}
    </button>
  );
}

function ChatPauseIcon() { return <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="4" height="12" rx="1" /><rect x="9" y="2" width="4" height="12" rx="1" /></svg>; }
function ChatPlayIcon() { return <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5v11l9-5.5z" /></svg>; }
function ChatStopIcon() { return <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="3" width="10" height="10" rx="1.5" /></svg>; }
