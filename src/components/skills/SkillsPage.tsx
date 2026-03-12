import { useState } from "react";
import { T } from "../../lib/theme.js";

const AGENT_COLOR: Record<string, string> = {
  "Twitter Manager":  "#D97706",
  "Reddit Scout":     "#FF4500",
  "Lead Finder":      "#0A66C2",
  "Community Finder": "#059669",
  "Content Studio":   "#E11D48",
  "Email Agent":      "#8B5CF6",
  "GEO Optimizer":    "#0891B2",
  "SEO Writer":       "#7C3AED",
  "Ad Manager":       "#DC2626",
  "ARIA":             "#1a1714",
};


interface Skill {
  id:          string;
  name:        string;
  agent:       string;
  phase:       1 | 2;
  description: string;
  inputs:      string[];
  outputs:     string[];
  example:     string;
}

const SKILLS: Skill[] = [
  // ── Twitter Manager ──────────────────────────────────────────────────────────
  {
    id:          "twitter_signal_engage",
    name:        "Find & reply to signal posts on X",
    agent:       "Twitter Manager",
    phase:       1,
    description: "Finds tweets where people express the pain your product solves, and drafts helpful, non-spammy replies. Human approval required before posting.",
    inputs:      ["Product description / pain points", "Target audience", "Brand voice"],
    outputs:     ["Signal posts with relevance scores", "Draft replies ready for approval", "Published replies"],
    example:     "Find tweets from founders struggling with manual lead research and reply with a helpful take.",
  },
  {
    id:          "twitter_publish",
    name:        "Publish tweets & threads on X",
    agent:       "Twitter Manager",
    phase:       1,
    description: "Creates and publishes tweets or threads aligned with your ICP's interests. Can schedule or post immediately.",
    inputs:      ["Topic or angle", "Format (tweet / thread)", "Tone", "Schedule (optional)"],
    outputs:     ["Published tweet/thread with link", "Engagement metrics"],
    example:     "Write and publish a thread about the 3 biggest mistakes founders make with outbound.",
  },

  // ── Reddit Scout ────────────────────────────────────────────────────────────
  {
    id:          "reddit_signal_posts",
    name:        "Find signal posts on Reddit",
    agent:       "Reddit Scout",
    phase:       1,
    description: "Scans subreddits for posts where people describe the exact problem your product solves. Great for finding warm prospects and market intelligence.",
    inputs:      ["Pain point keywords", "Target subreddits (optional)", "Product category"],
    outputs:     ["Signal posts with relevance score, author info, engagement metrics"],
    example:     "Find posts on r/SaaS and r/startups from people frustrated with GTM execution.",
  },
  {
    id:          "reddit_community_engage",
    name:        "Engage in Reddit communities",
    agent:       "Reddit Scout",
    phase:       1,
    description: "Joins relevant Reddit conversations with authentic, value-adding comments. Builds credibility in your target communities over time.",
    inputs:      ["Target subreddits", "Expertise topics", "Brand voice guidelines"],
    outputs:     ["Draft comments for approval", "Published comments", "Karma tracking"],
    example:     "Engage authentically in r/startups discussions about marketing automation challenges.",
  },

  // ── Lead Finder ─────────────────────────────────────────────────────────────
  {
    id:          "find_icp_leads",
    name:        "Find ICP leads on LinkedIn & Twitter",
    agent:       "Lead Finder",
    phase:       1,
    description: "Searches LinkedIn, Twitter, and Reddit for people matching your ideal customer profile by title, industry, company size, and behavior signals.",
    inputs:      ["Job titles", "Industries", "Company size", "Geography (optional)", "Number of leads"],
    outputs:     ["Lead profiles with name, title, company, platform link, match score"],
    example:     "Find 50 VP of Sales at B2B SaaS companies with 50–500 employees in the US.",
  },
  {
    id:          "draft_outreach",
    name:        "Draft personalized outreach",
    agent:       "Lead Finder",
    phase:       1,
    description: "Generates personalized outreach messages referencing each lead's specific context — their posts, company, role. Human review before sending.",
    inputs:      ["Lead profiles", "Outreach angle", "Tone (warm / direct / formal)"],
    outputs:     ["Personalized message drafts ready for review"],
    example:     "Draft LinkedIn messages for 10 VP Sales leads referencing their outbound hiring signals.",
  },

  // ── Community Finder ────────────────────────────────────────────────────────
  {
    id:          "find_communities",
    name:        "Discover ICP communities & groups",
    agent:       "Community Finder",
    phase:       1,
    description: "Finds Discord servers, Twitter communities, Reddit spaces, and Telegram groups where your target audience gathers. Scores each by ICP density.",
    inputs:      ["Target audience description", "Industry / niche", "Platforms to search"],
    outputs:     ["Community list with relevance score, member count, activity level", "Intro message drafts"],
    example:     "Find Discord servers and Reddit communities where B2B SaaS founders discuss growth.",
  },

  // ── Content Studio ──────────────────────────────────────────────────────────
  {
    id:          "create_social_content",
    name:        "Create content for TikTok & social",
    agent:       "Content Studio",
    phase:       1,
    description: "Generates images, short-form video scripts, and captions for TikTok and social media publishing. Understands your product to create on-brand content.",
    inputs:      ["Product description", "Content type (video / image / carousel)", "Platform", "Style"],
    outputs:     ["Generated media assets", "Captions and hashtags", "Published posts"],
    example:     "Create 3 short-form TikTok videos explaining why my product beats manual prospecting.",
  },

  // ── Email Agent ─────────────────────────────────────────────────────────────
  {
    id:          "cold_email_campaign",
    name:        "Run cold email campaign",
    agent:       "Email Agent",
    phase:       2,
    description: "Automates cold email outreach with personalized sequences, follow-ups, and A/B testing. Integrates with your email provider.",
    inputs:      ["Lead list", "Email angle", "Number of follow-ups", "Sending schedule"],
    outputs:     ["Email drafts", "Sending reports with open/click rates"],
    example:     "Send a 3-email sequence to 100 qualified leads about our new feature.",
  },

  // ── GEO Optimizer ───────────────────────────────────────────────────────────
  {
    id:          "check_geo_status",
    name:        "Audit GEO status",
    agent:       "GEO Optimizer",
    phase:       1,
    description: "Audits any website for Generative Engine Optimization — checks AI bot access, llms.txt, structured data, and content quality. Returns a scored report.",
    inputs:      ["Website URL"],
    outputs:     ["Score (0–100) + grade", "Per-check results", "Top priority fixes", "AI test prompts"],
    example:     "Check the GEO status of https://acme.com — are we visible to ChatGPT and Perplexity?",
  },

  // ── SEO Writer ──────────────────────────────────────────────────────────────
  {
    id:          "write_seo_content",
    name:        "Write SEO-optimized content",
    agent:       "SEO Writer",
    phase:       2,
    description: "Researches keywords, writes SEO-optimized blog posts, and maintains a content calendar to build organic traffic over time.",
    inputs:      ["Target keyword", "Article angle", "Word count", "Target audience"],
    outputs:     ["Full article with title, meta description, and slug"],
    example:     "Write 1,500 words targeting 'B2B lead generation for SaaS startups'.",
  },

  // ── Ad Manager ─────────────────────────────────────────────────────────────
  {
    id:          "plan_ad_campaign",
    name:        "Plan & launch ad campaign",
    agent:       "Ad Manager",
    phase:       2,
    description: "Plans ad campaigns across Google, Meta, and LinkedIn — from targeting to creative to budget allocation. Monitors performance and suggests optimizations.",
    inputs:      ["Campaign objective", "Budget", "Target audience", "Platforms"],
    outputs:     ["Campaign plan", "Ad creatives", "Performance dashboard"],
    example:     "Plan a $5k LinkedIn Ads campaign targeting VP Marketing at SaaS companies.",
  },

  // ── ARIA (Chief of Staff) ────────────────────────────────────────────────────
  {
    id:          "gtm_strategy",
    name:        "GTM strategy session",
    agent:       "ARIA",
    phase:       1,
    description: "Your Chief of Staff for all things GTM. Discuss strategy, get recommendations on which channels to prioritize, review agent performance, and plan campaigns.",
    inputs:      ["Your product / market context", "Current challenges", "Goals"],
    outputs:     ["Strategy recommendations", "Channel prioritization", "Agent task assignments"],
    example:     "Let's review our GTM strategy — which channels should we double down on?",
  },
];

export default function SkillsPage({ onChat }: { onChat: (prompt?: string) => void }) {
  const phase1 = SKILLS.filter(s => s.phase === 1);
  const phase2 = SKILLS.filter(s => s.phase === 2);
  const [expanded, setExpanded] = useState<string | null>(phase1[0]?.id ?? null);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 6 }}>Skills</h1>
          <p style={{ fontSize: 13, color: T.textMid, lineHeight: 1.6 }}>
            Each skill is a capability your agents can execute. Tell ARIA what you need — it picks the right agent and skill automatically.
          </p>
        </div>

        <SectionLabel label="Available now" dot={T.green} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {phase1.map(skill => (
            <SkillCard key={skill.id} skill={skill} expanded={expanded === skill.id} onToggle={() => setExpanded(expanded === skill.id ? null : skill.id)} onChat={() => onChat(skill.example)} />
          ))}
        </div>

        <SectionLabel label="Coming soon" dot={T.textDim} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, opacity: 0.6 }}>
          {phase2.map(skill => (
            <SkillCard key={skill.id} skill={skill} expanded={expanded === skill.id} onToggle={() => setExpanded(expanded === skill.id ? null : skill.id)} onChat={onChat} soon />
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ label, dot }: { label: string; dot: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot, display: "inline-block" }} />
      <span style={{ fontSize: 11, fontFamily: T.mono, color: T.textDim, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}

function SkillCard({ skill, expanded, onToggle, onChat, soon }: { skill: Skill; expanded: boolean; onToggle: () => void; onChat: () => void; soon?: boolean }) {
  const color = AGENT_COLOR[skill.agent] ?? T.textMid;

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
      <div onClick={soon ? undefined : onToggle} style={{ padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start", cursor: soon ? "default" : "pointer" }}>
        <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 9, background: `${color}12`, border: `1px solid ${color}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 600, color }}>{skill.agent.split(" ").map(w => w[0]).join("").slice(0, 2)}</span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{skill.name}</span>
            <span style={{ fontSize: 10, fontFamily: T.mono, color, background: `${color}10`, borderRadius: 100, padding: "1px 7px" }}>{skill.agent}</span>
          </div>
          <p style={{ fontSize: 12, color: T.textMid, lineHeight: 1.55, margin: 0 }}>{skill.description}</p>
        </div>

        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
          {soon && <span style={{ fontSize: 10, fontFamily: T.mono, color: T.textDim, border: `1px solid ${T.border}`, borderRadius: 100, padding: "2px 8px" }}>soon</span>}
          {!soon && <ChevronIcon rotated={expanded} />}
        </div>
      </div>

      {expanded && !soon && (
        <div style={{ borderTop: `1px solid ${T.border}`, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontFamily: T.mono, color: T.textDim, marginBottom: 5, letterSpacing: 0.4 }}>INPUTS</div>
              <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 3 }}>
                {skill.inputs.map((inp, i) => <li key={i} style={{ fontSize: 12, color: T.textMid, lineHeight: 1.5 }}>{inp}</li>)}
              </ul>
            </div>
            <div>
              <div style={{ fontSize: 10, fontFamily: T.mono, color: T.textDim, marginBottom: 5, letterSpacing: 0.4 }}>OUTPUTS</div>
              <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 3 }}>
                {skill.outputs.map((out, i) => <li key={i} style={{ fontSize: 12, color: T.textMid, lineHeight: 1.5 }}>{out}</li>)}
              </ul>
            </div>
          </div>

          <div style={{ background: T.bg, borderRadius: 7, padding: "9px 12px" }}>
            <div style={{ fontSize: 10, fontFamily: T.mono, color: T.textDim, marginBottom: 4, letterSpacing: 0.4 }}>EXAMPLE</div>
            <p style={{ fontSize: 12, color: T.textMid, lineHeight: 1.55, margin: 0, fontStyle: "italic" }}>"{skill.example}"</p>
          </div>

          <button
            onClick={onChat}
            style={{ alignSelf: "flex-start", background: T.text, color: "#fff", border: "none", borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
          >
            Ask ARIA to run this →
          </button>
        </div>
      )}
    </div>
  );
}


function ChevronIcon({ rotated }: { rotated: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, transform: rotated ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
      <path d="M3 5l4 4 4-4" stroke={T.textDim} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
