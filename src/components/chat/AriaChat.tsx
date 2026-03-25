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

interface TwitterActivity {
  tweetAuthor:  string;
  tweetHandle:  string;
  tweetText:    string;
  tweetUrl?:    string;
  actions: {
    type:       "liked" | "replied" | "reposted" | "followed";
    replyText?: string;
    status:     "success" | "pending";
  }[];
  timestamp:    string;
}

interface ChatMessage {
  id:     string;
  role:   "user" | "assistant";
  content: string;
  planItems?: PlanItem[];
  taskCards?: TaskCard[];
  todoPlans?: TodoPlan[];
  connectAccount?: { platform: string };
  questions?: AgentQuestion[];
  activities?: TwitterActivity[];
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
  icon: string; label: string; desc: string; prompt: string; agent: string; color: string; isNew?: boolean;
}

const QUICK_ACTIONS: QuickAction[] = [
  { icon: "CS", label: "Create TikTok content", desc: "Generate images, copy, and short-form video for TikTok and social media", prompt: "Create content for my TikTok — understand my product and make engaging short-form videos.", agent: "Content Studio", color: "#E11D48", isNew: true },
  { icon: "TM", label: "Run my Twitter/X", desc: "Find signal posts, reply with value, and publish threads automatically", prompt: "I need you to manage my Twitter account. Find relevant signal posts and engage with them, also publish content.", agent: "Twitter Manager", color: "#D97706" },
  { icon: "RS", label: "Hunt Reddit signals", desc: "Find signal communities and posts on Reddit where your ICP discusses pain", prompt: "Find Reddit communities where people discuss problems my product solves and surface the best signal posts.", agent: "Reddit Scout", color: "#FF4500" },
  { icon: "LF", label: "Find ICP leads", desc: "Search LinkedIn, Twitter & Reddit for decision makers matching your ICP", prompt: "Find 50 leads matching my ICP on LinkedIn and Twitter — VP Marketing and Heads of Growth at early-stage startups.", agent: "Lead Finder", color: "#0A66C2" },
  { icon: "CF", label: "Discover communities", desc: "Find Discord servers, Twitter groups, and Reddit spaces where your audience gathers", prompt: "Find Discord servers and communities where my target audience hangs out and ranks them by relevance.", agent: "Community Finder", color: "#059669" },
  { icon: "GO", label: "GEO Optimization", desc: "Make your site visible to AI search engines like ChatGPT, Perplexity & Claude", prompt: "Check the GEO status of my website and tell me how visible it is to AI search engines.", agent: "GEO Optimizer", color: "#0891B2" },
];

// ── Scripted response generators ─────────────────────────────────────────────

function getAriaResponse(userMsg: string, turn: number): { text: string; planItems?: PlanItem[]; taskCards?: TaskCard[]; todoPlans?: TodoPlan[]; connectAccount?: { platform: string }; questions?: AgentQuestion[] } {
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
    { id: "region", prompt: "Which region should I focus on?", options: [
      { id: "global", label: "Global" },
      { id: "na", label: "North America" },
      { id: "europe", label: "Europe" },
      { id: "apac", label: "Asia Pacific" },
    ]},
    { id: "schedule", prompt: "When should I be active?", options: [
      { id: "247", label: "24/7" },
      { id: "business", label: "Business hours (9am–6pm)" },
      { id: "manual", label: "Only when I ask" },
    ]},
    { id: "approval", prompt: "Should I post automatically or draft for review?", options: [
      { id: "draft", label: "Draft for my approval first" },
      { id: "auto", label: "Auto-post (I trust you)" },
    ]},
  ],
  "Reddit Scout": [
    { id: "region", prompt: "Which region should I focus on?", options: [
      { id: "global", label: "Global" },
      { id: "na", label: "North America" },
      { id: "europe", label: "Europe" },
      { id: "apac", label: "Asia Pacific" },
    ]},
    { id: "schedule", prompt: "How often should I scan?", options: [
      { id: "continuous", label: "Every 6 hours" },
      { id: "daily", label: "Once a day" },
      { id: "manual", label: "Only when I ask" },
    ]},
    { id: "approval", prompt: "Should I auto-reply or draft for review?", options: [
      { id: "draft", label: "Draft for my approval" },
      { id: "auto", label: "Auto-reply (I trust you)" },
    ]},
  ],
  "Lead Finder": [
    { id: "region", prompt: "Which region should I focus on?", options: [
      { id: "global", label: "Global" },
      { id: "na", label: "North America" },
      { id: "europe", label: "Europe" },
      { id: "apac", label: "Asia Pacific" },
    ]},
    { id: "count", prompt: "How many leads per batch?", options: [
      { id: "20", label: "~20 leads" },
      { id: "50", label: "~50 leads" },
      { id: "100", label: "100+ leads" },
    ]},
    { id: "schedule", prompt: "One-time or recurring?", options: [
      { id: "once", label: "One-time batch" },
      { id: "weekly", label: "Weekly" },
      { id: "biweekly", label: "Every 2 weeks" },
    ]},
  ],
  "Community Finder": [
    { id: "platforms", prompt: "Which platforms should I search?", allowMultiple: true, options: [
      { id: "discord", label: "Discord" },
      { id: "reddit", label: "Reddit" },
      { id: "slack", label: "Slack" },
      { id: "all", label: "All platforms" },
    ]},
    { id: "region", prompt: "Which region?", options: [
      { id: "global", label: "Global" },
      { id: "na", label: "North America" },
      { id: "europe", label: "Europe" },
      { id: "apac", label: "Asia Pacific" },
    ]},
    { id: "schedule", prompt: "One-time or keep monitoring?", options: [
      { id: "once", label: "One-time scan" },
      { id: "weekly", label: "Monitor weekly" },
      { id: "monthly", label: "Monitor monthly" },
    ]},
  ],
  "Content Studio": [
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
    { id: "depth", prompt: "How deep should I audit?", options: [
      { id: "quick", label: "Quick scan (top-level)" },
      { id: "full", label: "Full audit (recommended)" },
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


function getAgentGreeting(agentName: string): { text: string; connectAccount?: { platform: string } } {
  const greetings: Record<string, { text: string; platform?: string }> = {
    "Twitter Manager": {
      text: `Hey! I'm **Twitter Manager**. Here's what I can do for you on X:\n\n- **Find signal posts** — discover posts where people express the exact pain your product solves\n- **Engage authentically** — like, reply, and build relationships with your ICP\n- **Publish content** — write and post threads that position you as a thought leader\n\n**To get started, paste your product's website URL** and I'll analyze your product and audience.`,
      platform: "Twitter/X",
    },
    "Reddit Scout": {
      text: `Hey! I'm **Reddit Scout**. Here's what I can do:\n\n- **Find signal subreddits** — discover communities where your ICP discusses pain points\n- **Surface buying signals** — find posts where people are actively looking for solutions\n- **Draft authentic replies** — write value-adding comments for your review\n\n**Paste your product's website URL** to get started.`,
      platform: "Reddit",
    },
    "Lead Finder": {
      text: `Hey! I'm **Lead Finder**. I find decision makers matching your ICP across:\n\n- **LinkedIn** — search by job title, company size, industry, and recent activity\n- **Twitter/X** — find leads who are active and engaged in relevant conversations\n- **Cross-referencing** — score and rank leads by ICP match quality\n\n**Paste your product's website URL** and I'll start finding your ideal leads.`,
      platform: "LinkedIn & Twitter",
    },
    "Community Finder": {
      text: `Hey! I'm **Community Finder**. I discover where your audience hangs out:\n\n- **Discord servers** — find active communities in your niche\n- **Reddit communities** — surface subreddits with high ICP density\n- **Slack groups** — identify professional communities where your buyers gather\n\n**Paste your product's website URL** to get started.`,
      platform: "Discord & Reddit",
    },
    "Content Studio": {
      text: `Hey! I'm **Content Studio**. I create engaging content for your brand:\n\n- **Short-form video** — TikTok scripts, product demos, and pain-point explainers\n- **Visual content** — images, thumbnails, and graphics for social media\n- **Copy** — captions, threads, and content calendars\n\n**Paste your product's website URL** and I'll create content that resonates with your audience.`,
    },
    "GEO Optimizer": {
      text: `Hey! I'm **GEO Optimizer**. I help you become visible to AI search engines:\n\n- **AI bot access** — check if GPTBot, ClaudeBot, and PerplexityBot can crawl your site\n- **Structured data** — audit your schema.org markup and metadata\n- **AI search visibility** — test whether ChatGPT, Perplexity, and Claude know about you\n\n**Paste your website URL** and I'll run a full GEO audit.`,
    },
  };

  const config = greetings[agentName] ?? { text: `Hey! I'm **${agentName}**. Paste your product's website URL and I'll get started.` };
  return {
    text: config.text,
    connectAccount: config.platform ? { platform: config.platform } : undefined,
  };
}

function getAgentResponse(agentName: string, _agentColor: string, userMsg: string, turn: number): { text: string; planItems?: PlanItem[]; taskCards?: TaskCard[]; todoPlans?: TodoPlan[]; connectAccount?: { platform: string }; questions?: AgentQuestion[] } {
  if (turn === 0) {
    const questions = AGENT_QUESTIONS[agentName];
    return {
      text: `Great, let me analyze that.\n\n**Here's what I understand about your product:**\n- You're building a tool that helps teams automate their go-to-market execution\n- **Value prop:** Replaces manual outbound, content creation, and community engagement with AI agents\n- **Target audience:** Founders, marketing leads, and growth teams at early-stage startups (Seed–Series B)\n\nUse the options below to set your preferences, or type your own.`,
      questions,
    };
  }

  if (turn === 1) {
    const plan = AGENT_PLANS[agentName];
    if (plan) {
      return {
        text: "Perfect, I have everything I need. Here's my execution plan:",
        todoPlans: plan.todos.map((t, i) => ({ id: i + 1, label: t.label, detail: t.detail })),
      };
    }
    return {
      text: "Perfect. Here's my execution plan:",
      todoPlans: [
        { id: 1, label: "Analyze your product and target audience" },
        { id: 2, label: "Execute the primary task" },
        { id: 3, label: "Report back with results" },
      ],
    };
  }

  const schedules: Record<string, string> = {
    "Twitter Manager": "Daily, 9am–6pm your timezone",
    "Reddit Scout": "Every 6 hours",
    "Lead Finder": "Weekly, 50 leads/batch",
    "Community Finder": "Runs weekly",
    "Content Studio": "3 posts/week",
  };
  const confirmWords = ["yes", "go", "confirm", "start", "do it", "sounds good", "let's go", "approve", "ok", "sure", "proceed", "lgtm"];
  if (confirmWords.some(w => userMsg.toLowerCase().includes(w))) {
    const plan = AGENT_PLANS[agentName];
    return {
      text: "Mission launched. I'll keep running on schedule and report important activity right here in chat.\n\nYou can pause, resume, or stop me anytime from here or from **Mission Control**.",
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
  const [streamingExtras, setStreamingExtras] = useState<{ planItems?: PlanItem[]; taskCards?: TaskCard[]; todoPlans?: TodoPlan[]; connectAccount?: { platform: string }; questions?: AgentQuestion[] }>({});
  const [selectedModel, setSelectedModel] = useState("deepseek-v3");
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const turnRef = useRef(0);

  const isAgentMode = !!agentName;
  const greetingAdded = useRef(false);

  useEffect(() => {
    if (isAgentMode && agentInfo && !greetingAdded.current && messages.length === 0) {
      greetingAdded.current = true;
      const greeting = getAgentGreeting(agentInfo.name);
      setMessages([{
        id: "a-greeting",
        role: "assistant",
        content: greeting.text,
        connectAccount: greeting.connectAccount,
      }]);
    }
  }, [isAgentMode, agentInfo]);

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
    setStreamingExtras({ planItems: response.planItems, taskCards: response.taskCards, todoPlans: response.todoPlans, connectAccount: response.connectAccount, questions: response.questions });

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
          connectAccount: response.connectAccount,
          questions: response.questions,
        };
        setMessages(prev => [...prev, assistantMsg]);
        setStreaming(false);
        setStreamingText("");
        setStreamingExtras({});

        if (response.taskCards && response.taskCards.length > 0 && isAgentMode) {
          addMockActivities();
        }
      }
    }, 12);
  }, [input, streaming, isAgentMode, agentInfo]);

  const addMockActivities = useCallback(() => {
    const mockActivities: { delay: number; msg: ChatMessage }[] = [
      {
        delay: 2000,
        msg: {
          id: `act-${Date.now()}-1`, role: "assistant",
          content: "",
          activities: [
            {
              tweetAuthor: "Sarah Chen", tweetHandle: "@sarahchen_dev",
              tweetText: "Manual outbound is killing our team's productivity. We spend more time researching leads than actually talking to them. There has to be a better way.",
              tweetUrl: "https://x.com/sarahchen_dev/status/1234567890",
              actions: [
                { type: "liked", status: "success" },
                { type: "replied", replyText: "We felt this exact pain — spent 3 months building agents that do the research and draft personalized replies for you. Happy to show you a 5-min demo if interested.", status: "success" },
              ],
              timestamp: "just now",
            },
          ],
        },
      },
      {
        delay: 4500,
        msg: {
          id: `act-${Date.now()}-2`, role: "assistant", content: "",
          activities: [
            {
              tweetAuthor: "Mike Rodriguez", tweetHandle: "@mikerodriguez_gtm",
              tweetText: "Hot take: if you're still doing cold outreach manually in 2025, you're leaving money on the table. The founders who are winning are automating their top-of-funnel.",
              tweetUrl: "https://x.com/mikerodriguez_gtm/status/1234567891",
              actions: [
                { type: "liked", status: "success" },
                { type: "replied", replyText: "Agreed. We're seeing founders save 15+ hours/week by having AI agents handle signal detection and initial outreach. The human touch still matters — but for the right conversations, not all of them.", status: "success" },
              ],
              timestamp: "just now",
            },
          ],
        },
      },
      {
        delay: 7000,
        msg: {
          id: `act-${Date.now()}-3`, role: "assistant", content: "",
          activities: [
            {
              tweetAuthor: "Jen Park", tweetHandle: "@jenpark_saas",
              tweetText: "Just spent 6 hours prospecting on LinkedIn. Found 3 good leads. This is not scalable. Anyone using AI tools for lead gen? What's actually working?",
              tweetUrl: "https://x.com/jenpark_saas/status/1234567892",
              actions: [
                { type: "liked", status: "success" },
                { type: "replied", replyText: "The ratio you're describing (6hrs → 3 leads) is exactly why we built GetU. Our agents scan X, Reddit, and LinkedIn simultaneously — typical result is 50+ qualified leads/week with zero manual work.", status: "success" },
              ],
              timestamp: "just now",
            },
          ],
        },
      },
    ];

    mockActivities.forEach(({ delay, msg }) => {
      setTimeout(() => {
        setMessages(prev => [...prev, msg]);
      }, delay);
    });
  }, []);

  const handleQuestionAnswers = useCallback((answers: Record<string, string[]>) => {
    const agentQs = agentName ? AGENT_QUESTIONS[agentName] : undefined;
    if (!agentQs) return;
    const labels = agentQs.map(q => {
      const sel = answers[q.id] ?? [];
      return sel.map(s => q.options.find(o => o.id === s)?.label ?? s).join(", ");
    }).filter(Boolean);
    setTimeout(() => submit(labels.join(" · ")), 300);
  }, [agentName, submit]);

  const firstName = userName
    ? (userName.includes("@")
        ? (userName.split("@")[0].split(/[._-]/)[0] ?? "there")
        : userName.split(/\s+/)[0]
      ).replace(/^./, c => c.toUpperCase())
    : "there";

  const isEmpty = messages.length === 0 && !streaming;

  if (isEmpty) {
    if (isAgentMode && agentInfo) {
      return <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.bg }} />;
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.bg }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", animation: "fadeUp .35s ease" }}>
          <div style={{ width: "100%", maxWidth: 640, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 12 }}>
                <PixelBot />
                <h2 style={{ fontSize: 32, fontWeight: 400, fontFamily: T.serifDisplay, color: T.text, letterSpacing: "-0.015em", lineHeight: 1.25, margin: 0 }}>
                  {greeting()}, {firstName}
                </h2>
              </div>
            </div>
            <InputBox ref={textareaRef} value={input} onChange={e => { setInput(e.target.value); resizeTextarea(); }} onKeyDown={handleKeyDown} onSubmit={() => submit()} streaming={streaming} large placeholder="Tell me your product — I'll craft a GTM strategy and deploy the right agents." />

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
            <MessageBubble key={msg.id} message={msg} agentInfo={agentInfo} onViewMissions={() => onNavigate("missions")} onSubmitAnswers={handleQuestionAnswers} onApprove={() => submit("Approved")} />
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

function MessageBubble({ message, agentInfo, onViewMissions, onSubmitAnswers, onApprove }: { message: ChatMessage; agentInfo?: AgentChatInfo; onViewMissions: () => void; onSubmitAnswers?: (answers: Record<string, string[]>) => void; onApprove?: () => void }) {
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
        {(isUser || message.content) && (
          <div style={{ background: isUser ? T.text : T.surface, color: isUser ? T.bg : T.text, border: isUser ? "none" : `1px solid ${T.border}`, borderRadius: isUser ? "12px 12px 4px 12px" : "4px 12px 12px 12px", padding: "10px 14px", fontSize: 14 }}>
            {isUser ? <span style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{message.content}</span> : renderMarkdown(message.content)}
          </div>
        )}
        {message.questions && onSubmitAnswers && <QuestionCard questions={message.questions} agentColor={agentInfo?.color} onSubmitAnswers={onSubmitAnswers} />}
        {message.planItems && <PlanCard items={message.planItems} />}
        {message.todoPlans && <TodoPlanCard items={message.todoPlans} agentColor={agentInfo?.color} onApprove={onApprove} />}
        {message.connectAccount && <ConnectAccountCard platform={message.connectAccount.platform} />}
        {message.taskCards?.map((tc, i) => <TaskCreatedCard key={i} task={tc} onViewMissions={onViewMissions} />)}
        {message.activities?.map((act, i) => <TwitterActivityCard key={i} activity={act} agentColor={agentInfo?.color} />)}
      </div>
    </div>
  );
}

function StreamingBubble({ text, extras, agentInfo }: { text: string; extras: { planItems?: PlanItem[]; taskCards?: TaskCard[]; todoPlans?: TodoPlan[]; connectAccount?: { platform: string }; questions?: AgentQuestion[] }; agentInfo?: AgentChatInfo }) {
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
        {extras.connectAccount && <ConnectAccountCard platform={extras.connectAccount.platform} />}
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

function TodoPlanCard({ items, agentColor, onApprove }: { items: TodoPlan[]; agentColor?: string; onApprove?: () => void }) {
  const color = agentColor ?? T.green;
  const [approved, setApproved] = useState(false);
  const [approveHov, setApproveHov] = useState(false);

  function handleApprove() {
    if (approved) return;
    setApproved(true);
    onApprove?.();
  }

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
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
        {onApprove && !approved && (
          <button
            onClick={handleApprove}
            onMouseEnter={() => setApproveHov(true)}
            onMouseLeave={() => setApproveHov(false)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "6px 16px", borderRadius: 7,
              background: approveHov ? T.text : T.text,
              opacity: approveHov ? 1 : 0.9,
              color: T.bg, border: "none", fontSize: 12, fontWeight: 600,
              cursor: "pointer", transition: "opacity .15s",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5l3.5 3.5 6.5-7" /></svg>
            Approve
          </button>
        )}
        {approved && (
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontFamily: T.mono, color: T.green }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke={T.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5l3.5 3.5 6.5-7" /></svg>
            Approved
          </span>
        )}
        {!approved && <span style={{ fontSize: 11, color: T.textDim, fontStyle: "italic" }}>or tell me what to change</span>}
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
    ? { label: "Paused", color: "#D97706", bg: "rgba(217,119,6,0.12)", border: "rgba(217,119,6,0.25)", pulse: false }
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
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i} style={{ fontFamily: T.mono, fontSize: 12, background: T.codeBg, padding: "1px 4px", borderRadius: 3 }}>{part.slice(1, -1)}</code>;
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
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, background: T.surface, border: `1px solid ${T.border}`, borderRadius: large ? 16 : 12, padding: large ? "14px 16px" : "10px 12px", boxShadow: large ? "0 4px 24px var(--t-shadow, rgba(0,0,0,0.07))" : "0 2px 8px var(--t-shadow, rgba(0,0,0,0.04))" }}>
      <textarea ref={ref} value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder} rows={large ? 3 : 1}
        style={{ flex: 1, border: "none", background: "transparent", fontSize: large ? 15 : 14, color: T.text, fontFamily: T.sans, resize: "none", lineHeight: 1.65, outline: "none", minHeight: large ? 72 : undefined }} />
      <button onClick={onSubmit} disabled={streaming || !value.trim()}
        style={{ background: value.trim() && !streaming ? T.text : T.border, color: value.trim() && !streaming ? T.bg : T.textDim, border: "none", borderRadius: large ? 10 : 8, width: large ? 38 : 32, height: large ? 38 : 32, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background .15s", cursor: value.trim() && !streaming ? "pointer" : "default" }}>
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
          boxShadow: "0 8px 32px var(--t-shadow, rgba(0,0,0,0.12))", padding: "6px",
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
        {action.isNew && <span style={{ fontSize: 8, fontFamily: T.mono, fontWeight: 600, color: action.color, background: `${action.color}0C`, padding: "1px 5px", borderRadius: 3, border: `1px solid ${action.color}18`, lineHeight: 1.4 }}>NEW</span>}
      </div>
      <p style={{ fontSize: 11, color: T.textMid, lineHeight: 1.5, margin: 0, flex: 1 }}><span style={{ color: T.text, fontWeight: 500 }}>{action.label}.</span> {action.desc}</p>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <span style={{ fontSize: 10, fontFamily: T.mono, color: hov ? action.color : T.textDim, transition: "color .15s" }}>hire →</span>
      </div>
    </button>
  );
}

function PixelBot() {
  const S = 4; const c = "c"; const g = "g"; const _ = null;
  const grid: (string | null)[][] = [
    [_,_,_,_,c,c,_,_,_,_],[_,_,_,_,c,_,_,_,_,_],[_,c,c,c,c,c,c,c,c,_],[_,c,_,_,_,_,_,_,c,_],
    [_,c,_,g,g,g,g,_,c,_],[_,c,_,g,_,_,g,_,c,_],[_,c,_,g,g,g,g,_,c,_],[_,c,_,_,_,_,_,_,c,_],
    [_,c,c,c,c,c,c,c,c,_],[_,_,c,c,_,_,c,c,_,_],
  ];
  return (
    <svg width={10*S} height={10*S} viewBox={`0 0 ${10*S} ${10*S}`} style={{ imageRendering: "pixelated", flexShrink: 0, color: T.textDim }}>
      <style>{`.pb-c { fill: currentColor } .pb-g { fill: var(--t-green) }`}</style>
      {grid.map((row, r) => row.map((cell, col) => cell ? <rect key={`${r}-${col}`} x={col*S} y={r*S} width={S} height={S} className={cell === "c" ? "pb-c" : "pb-g"} /> : null))}
    </svg>
  );
}

function QuestionCard({ questions, agentColor, onSubmitAnswers }: { questions: AgentQuestion[]; agentColor?: string; onSubmitAnswers: (answers: Record<string, string[]>) => void }) {
  const color = agentColor ?? T.green;
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [customTexts, setCustomTexts] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const q = questions[page];
  const total = questions.length;
  const selected = answers[q.id] ?? [];
  const customText = customTexts[q.id] ?? "";
  const CUSTOM_ID = "__custom__";
  const isCustomSelected = selected.includes(CUSTOM_ID);
  const hasAnswer = selected.length > 0 && (!isCustomSelected || customText.trim().length > 0);

  function toggleOption(optId: string) {
    if (submitted) return;
    if (optId === CUSTOM_ID) {
      setAnswers(prev => {
        const cur = prev[q.id] ?? [];
        if (cur.includes(CUSTOM_ID)) return { ...prev, [q.id]: cur.filter(x => x !== CUSTOM_ID) };
        if (q.allowMultiple) return { ...prev, [q.id]: [...cur, CUSTOM_ID] };
        return { ...prev, [q.id]: [CUSTOM_ID] };
      });
      return;
    }
    setAnswers(prev => {
      const cur = prev[q.id] ?? [];
      if (q.allowMultiple) {
        return { ...prev, [q.id]: cur.includes(optId) ? cur.filter(x => x !== optId) : [...cur.filter(x => x !== CUSTOM_ID), optId] };
      }
      return { ...prev, [q.id]: [optId] };
    });
    setCustomTexts(prev => ({ ...prev, [q.id]: "" }));
  }

  function handleCustomFocus() {
    if (submitted) return;
    if (!isCustomSelected) {
      setAnswers(prev => {
        if (q.allowMultiple) {
          const cur = prev[q.id] ?? [];
          return { ...prev, [q.id]: [...cur.filter(x => x !== CUSTOM_ID), CUSTOM_ID] };
        }
        return { ...prev, [q.id]: [CUSTOM_ID] };
      });
    }
  }

  function handleContinue() {
    if (!hasAnswer) return;
    if (page < total - 1) {
      setPage(p => p + 1);
    } else {
      setSubmitted(true);
      const finalAnswers: Record<string, string[]> = {};
      for (const qq of questions) {
        const sel = answers[qq.id] ?? [];
        finalAnswers[qq.id] = sel.map(s => s === CUSTOM_ID ? (customTexts[qq.id] ?? "").trim() : s).filter(Boolean);
      }
      onSubmitAnswers(finalAnswers);
    }
  }

  if (submitted) {
    const summary = questions.map(qq => {
      const sel = answers[qq.id] ?? [];
      const labels = sel.map(s => {
        if (s === CUSTOM_ID) return (customTexts[qq.id] ?? "").trim();
        return qq.options.find(o => o.id === s)?.label ?? s;
      }).filter(Boolean).join(", ");
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

  const optionCount = q.options.length;

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
          <button onClick={() => page < total - 1 && hasAnswer && setPage(p => p + 1)} disabled={page >= total - 1 || !hasAnswer}
            style={{ background: "none", border: "none", cursor: (page < total - 1 && hasAnswer) ? "pointer" : "default", padding: 2, color: (page < total - 1 && hasAnswer) ? T.textMid : T.border, display: "flex" }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 3l3 3-3 3" /></svg>
          </button>
        </div>
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 10, lineHeight: 1.5 }}>
        {page + 1}. {q.prompt}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {q.options.map((opt, idx) => {
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
              <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 600, color: isSelected ? color : T.textDim, width: 14 }}>{String.fromCharCode(65 + idx)}</span>
              <span style={{ flex: 1 }}>{opt.label}</span>
            </button>
          );
        })}

        {/* Custom input option — always shown as the last option */}
        <div
          onClick={handleCustomFocus}
          style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "9px 12px", borderRadius: 8,
            background: isCustomSelected ? `${color}0A` : "transparent",
            border: `1.5px solid ${isCustomSelected ? color : T.border}`,
            cursor: "pointer", transition: "all .12s",
          }}
          onMouseEnter={e => { if (!isCustomSelected) e.currentTarget.style.borderColor = T.borderMid; }}
          onMouseLeave={e => { if (!isCustomSelected) e.currentTarget.style.borderColor = T.border; }}
        >
          <span style={{
            width: 20, height: 20, borderRadius: q.allowMultiple ? 4 : 10,
            border: `1.5px solid ${isCustomSelected ? color : T.border}`,
            background: isCustomSelected ? color : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            transition: "all .12s", marginTop: 1,
          }}>
            {isCustomSelected && <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6l2.5 2.5 4.5-5" /></svg>}
          </span>
          <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 600, color: isCustomSelected ? color : T.textDim, width: 14, marginTop: 2 }}>{String.fromCharCode(65 + optionCount)}</span>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, color: isCustomSelected ? T.text : T.textMid }}>Type my own answer</span>
            <input
              type="text"
              value={customText}
              onFocus={handleCustomFocus}
              onClick={e => e.stopPropagation()}
              onChange={e => {
                setCustomTexts(prev => ({ ...prev, [q.id]: e.target.value }));
                if (!isCustomSelected) handleCustomFocus();
              }}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleContinue(); } }}
              placeholder="Type here…"
              style={{
                width: "100%", border: `1px solid ${isCustomSelected ? color + "40" : T.border}`,
                borderRadius: 6, padding: "6px 8px", fontSize: 12, color: T.text,
                background: isCustomSelected ? T.surface : T.bg, outline: "none",
                fontFamily: T.sans, transition: "border-color .12s",
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 14, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
        <span style={{ fontSize: 11, color: T.textDim, fontFamily: T.mono }}>Skip <span style={{ fontSize: 10, color: T.border }}>Esc</span></span>
        <button onClick={handleContinue} disabled={!hasAnswer}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "7px 18px", borderRadius: 7,
            background: hasAnswer ? color : T.border,
            color: "#fff", border: "none", fontSize: 12, fontWeight: 600,
            cursor: hasAnswer ? "pointer" : "default",
            transition: "background .15s", opacity: hasAnswer ? 1 : 0.5,
          }}
        >
          Continue
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"><path d="M3.5 2l4 3-4 3" /></svg>
        </button>
      </div>
    </div>
  );
}

function TwitterActivityCard({ activity, agentColor }: { activity: TwitterActivity; agentColor?: string }) {
  const color = agentColor ?? "#D97706";
  const ACTION_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    liked:    { icon: <span style={{ fontSize: 12 }}>❤️</span>, label: "LIKED",    color: "#E11D48" },
    replied:  { icon: <span style={{ fontSize: 11 }}>↩️</span>, label: "REPLIED",  color: "#0891B2" },
    reposted: { icon: <span style={{ fontSize: 11 }}>🔁</span>, label: "REPOSTED", color: "#16A34A" },
    followed: { icon: <span style={{ fontSize: 11 }}>➕</span>, label: "FOLLOWED", color: "#7C3AED" },
  };

  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10,
      padding: "14px 16px", width: "100%", display: "flex", flexDirection: "column", gap: 10,
      animation: "fadeUp .3s ease",
    }}>
      {/* Original tweet */}
      <div style={{ fontSize: 13, color: T.text, lineHeight: 1.65 }}>
        {activity.tweetText}
      </div>
      {activity.tweetUrl && (
        <a href={activity.tweetUrl} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 11, color, textDecoration: "none", display: "flex", alignItems: "center", gap: 4, marginTop: -4 }}
          onMouseEnter={e => { e.currentTarget.style.textDecoration = "underline"; }}
          onMouseLeave={e => { e.currentTarget.style.textDecoration = "none"; }}
        >
          View original post ↗
        </a>
      )}

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 6, borderTop: `1px solid ${T.border}` }}>
        {activity.actions.map((action, i) => {
          const cfg = ACTION_CONFIG[action.type] ?? ACTION_CONFIG.liked;
          const statusColor = action.status === "success" ? "#16A34A" : "#D97706";
          const statusLabel = action.status === "success" ? "success" : "pending";

          return (
            <div key={i}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {cfg.icon}
                  <span style={{ fontSize: 11, fontFamily: T.mono, fontWeight: 600, color: cfg.color, letterSpacing: "0.03em" }}>{cfg.label}</span>
                </span>
                <span style={{
                  fontSize: 9, fontFamily: T.mono, fontWeight: 600,
                  color: statusColor, background: `${statusColor}12`,
                  padding: "1px 6px", borderRadius: 4, border: `1px solid ${statusColor}25`,
                  letterSpacing: "0.03em",
                }}>{statusLabel}</span>
              </div>
              {action.type === "replied" && action.replyText && (
                <div style={{
                  marginTop: 6, marginLeft: 24,
                  padding: "8px 12px", borderLeft: `2.5px solid ${color}40`,
                  background: `${color}06`, borderRadius: "0 6px 6px 0",
                  fontSize: 12, color: T.textMid, lineHeight: 1.6, fontStyle: "italic",
                }}>
                  {action.replyText}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer: author + timestamp */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
        <span style={{ fontSize: 11, color: T.textDim }}>
          <span style={{ fontWeight: 500, color: T.textMid }}>{activity.tweetAuthor}</span>{" "}
          <span style={{ fontFamily: T.mono }}>{activity.tweetHandle}</span>
        </span>
        <span style={{ fontSize: 10, fontFamily: T.mono, color: T.textDim }}>{activity.timestamp}</span>
      </div>
    </div>
  );
}

function ConnectAccountCard({ platform }: { platform: string }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{ background: "rgba(29,155,240,0.06)", border: "1px solid rgba(29,155,240,0.15)", borderRadius: 10, padding: "12px 14px", width: "100%", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(29,155,240,0.10)", border: "1px solid rgba(29,155,240,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM7 11V7.5a1 1 0 012 0V11a1 1 0 01-2 0zm1-6.25a.75.75 0 110-1.5.75.75 0 010 1.5z" fill="#1D9BF0" />
          <path d="M5 6.5l1.5 1.5L10 5" stroke="#1D9BF0" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#1D9BF0" }}>Connect your {platform} account</div>
        <div style={{ fontSize: 11, color: T.textMid, marginTop: 2 }}>Link your account so I can interact with {platform} on your behalf.</div>
      </div>
      <button
        onClick={() => {/* TODO: open connect account flow */}}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "6px 14px", borderRadius: 7, flexShrink: 0,
          background: hov ? "#1A8CD8" : "#1D9BF0",
          color: "#fff", border: "none", fontSize: 11, fontWeight: 600,
          cursor: "pointer", transition: "background .15s", whiteSpace: "nowrap",
        }}
      >
        Connect
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
