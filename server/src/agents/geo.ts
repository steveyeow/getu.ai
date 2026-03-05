// GEO Status Detection Agent
// Audits a website for Generative Engine Optimization (GEO) and AI Engine Optimization (AEO).
// Scores the site on bot access, AI discovery signals, structured data, metadata, and content quality.

import { generateObject } from "ai";
import { deepseek } from "@ai-sdk/deepseek";
import { z } from "zod";
import { BaseAgent, type AgentRunInput, type AgentRunResult } from "./base.js";
import type { GeoCheck, GeoReport } from "../../../shared/types.js";

const FETCH_OPTS = {
  headers: { "User-Agent": "Mozilla/5.0 (compatible; GEOBot/1.0; +https://getu.ai)" },
  signal:  AbortSignal.timeout(10_000),
};

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function safeFetch(url: string): Promise<{ ok: boolean; text: string; status: number }> {
  try {
    const res  = await fetch(url, FETCH_OPTS);
    const text = await res.text();
    return { ok: res.ok, text, status: res.status };
  } catch {
    return { ok: false, text: "", status: 0 };
  }
}

function extractText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ").trim();
}

// ── Individual checks ─────────────────────────────────────────────────────────

const AI_BOTS = [
  "GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended",
  "OAI-SearchBot", "anthropic-ai", "ChatGPT-User", "Bytespider", "CCBot",
];

function checkRobotsTxt(robotsText: string, robotsOk: boolean): GeoCheck {
  if (!robotsOk || !robotsText) {
    return { id: "robots_ai_access", name: "AI bot access (robots.txt)", category: "access", status: "warn", score: 8, maxScore: 12, detail: "robots.txt not found — AI bots have implicit access but explicit allowances recommended.", fix: "Create /robots.txt with explicit Allow: / for all 9 AI bots." };
  }
  const lines = robotsText.toLowerCase().split("\n");
  const blocked: string[] = [];
  let currentAgent = "";
  for (const line of lines) {
    const l = line.trim();
    if (l.startsWith("user-agent:")) currentAgent = l.replace("user-agent:", "").trim();
    if (l.startsWith("disallow:") && l !== "disallow:") {
      const path = l.replace("disallow:", "").trim();
      if (path === "/" || path.startsWith("/")) {
        const matchAll = currentAgent === "*";
        AI_BOTS.forEach(bot => {
          if (matchAll || currentAgent === bot.toLowerCase()) blocked.push(bot);
        });
      }
    }
  }
  // Explicit allows override wildcard disallows
  const allowed = new Set<string>();
  currentAgent = "";
  for (const line of lines) {
    const l = line.trim();
    if (l.startsWith("user-agent:")) currentAgent = l.replace("user-agent:", "").trim();
    if (l.startsWith("allow:")) {
      AI_BOTS.forEach(bot => {
        if (currentAgent === bot.toLowerCase() || currentAgent === "*") allowed.add(bot);
      });
    }
  }
  const finalBlocked = blocked.filter(b => !allowed.has(b));
  if (finalBlocked.length === 0) return { id: "robots_ai_access", name: "AI bot access (robots.txt)", category: "access", status: "pass", score: 12, maxScore: 12, detail: "All 9 AI bots are allowed to crawl." };
  if (finalBlocked.length <= 3) return { id: "robots_ai_access", name: "AI bot access (robots.txt)", category: "access", status: "warn", score: 6, maxScore: 12, detail: `${finalBlocked.length} bots partially blocked: ${finalBlocked.join(", ")}`, fix: `Remove Disallow rules for: ${finalBlocked.join(", ")}` };
  return { id: "robots_ai_access", name: "AI bot access (robots.txt)", category: "access", status: "fail", score: 0, maxScore: 12, detail: `${finalBlocked.length} AI bots blocked: ${finalBlocked.join(", ")}`, fix: "Add explicit Allow: / for all 9 AI bots in robots.txt." };
}

function checkNoAiMeta(html: string): GeoCheck {
  const lower = html.toLowerCase();
  const hasNoAi   = lower.includes("noai");
  const hasNoSnip = lower.includes("nosnippet");
  if (!hasNoAi && !hasNoSnip) return { id: "no_ai_meta", name: "No AI-blocking meta tags", category: "access", status: "pass", score: 4, maxScore: 4, detail: "No noai or nosnippet meta tags found." };
  const found = [hasNoAi && "noai", hasNoSnip && "nosnippet"].filter(Boolean).join(", ");
  return { id: "no_ai_meta", name: "No AI-blocking meta tags", category: "access", status: "fail", score: 0, maxScore: 4, detail: `Blocking tags found: ${found}`, fix: `Remove ${found} from <meta name="robots"> and X-Robots-Tag headers on public pages.` };
}

function checkNoIndex(html: string): GeoCheck {
  const lower = html.toLowerCase();
  const noindex = lower.includes('content="noindex"') || lower.includes("content='noindex'") || lower.includes("noindex,");
  if (!noindex) return { id: "noindex", name: "Page is indexable", category: "access", status: "pass", score: 4, maxScore: 4, detail: "No noindex directive found." };
  return { id: "noindex", name: "Page is indexable", category: "access", status: "fail", score: 0, maxScore: 4, detail: "Page is marked noindex — AI crawlers will skip it.", fix: "Remove noindex from <meta name=\"robots\"> on this page." };
}

function checkLlmsTxt(llmsText: string, llmsOk: boolean): GeoCheck {
  if (!llmsOk || !llmsText.trim()) return { id: "llms_txt", name: "llms.txt", category: "discovery", status: "fail", score: 0, maxScore: 8, detail: "/.well-known/llms.txt not found.", fix: "Create /.well-known/llms.txt with a # heading, brief description, and links to key pages." };
  const hasHeading = llmsText.includes("#");
  const hasLinks   = llmsText.includes("http");
  const long       = llmsText.length >= 100;
  if (hasHeading && hasLinks && long) return { id: "llms_txt", name: "llms.txt", category: "discovery", status: "pass", score: 8, maxScore: 8, detail: `llms.txt found (${llmsText.length} chars) with heading and links.` };
  const issues: string[] = [];
  if (!hasHeading) issues.push("missing # heading");
  if (!hasLinks)   issues.push("no links to key pages");
  if (!long)       issues.push("too short (<100 chars)");
  return { id: "llms_txt", name: "llms.txt", category: "discovery", status: "warn", score: 4, maxScore: 8, detail: `llms.txt exists but incomplete: ${issues.join(", ")}`, fix: `Add ${issues.join(" and ")} to /.well-known/llms.txt` };
}

function checkSitemap(sitemapText: string, sitemapOk: boolean): GeoCheck {
  if (!sitemapOk || !sitemapText) return { id: "sitemap", name: "Sitemap with lastmod", category: "discovery", status: "fail", score: 0, maxScore: 6, detail: "sitemap.xml not found at /sitemap.xml.", fix: "Generate a sitemap.xml and reference it from robots.txt." };
  const hasLastmod = sitemapText.includes("<lastmod>");
  const urlCount   = (sitemapText.match(/<url>/g) ?? []).length;
  if (hasLastmod) return { id: "sitemap", name: "Sitemap with lastmod", category: "discovery", status: "pass", score: 6, maxScore: 6, detail: `sitemap.xml found with ${urlCount} URLs and <lastmod> dates.` };
  return { id: "sitemap", name: "Sitemap with lastmod", category: "discovery", status: "warn", score: 3, maxScore: 6, detail: `sitemap.xml found (${urlCount} URLs) but no <lastmod> dates.`, fix: "Add <lastmod> to every <url> entry in sitemap.xml so AI engines know how fresh your content is." };
}

async function checkFeed(baseUrl: string, html: string): Promise<GeoCheck> {
  const discoverableLink = html.includes('type="application/rss+xml"') || html.includes("application/atom+xml");
  const feedPaths = ["/feed.xml", "/feed", "/rss.xml", "/atom.xml", "/index.xml"];
  for (const path of feedPaths) {
    const r = await safeFetch(`${baseUrl}${path}`);
    if (r.ok && (r.text.includes("<rss") || r.text.includes("<feed") || r.text.includes("<channel"))) {
      if (discoverableLink) return { id: "rss_feed", name: "RSS/Atom feed", category: "discovery", status: "pass", score: 6, maxScore: 6, detail: `Feed found at ${path} and discoverable via <link> tag.` };
      return { id: "rss_feed", name: "RSS/Atom feed", category: "discovery", status: "warn", score: 3, maxScore: 6, detail: `Feed found at ${path} but no <link rel="alternate"> in <head>.`, fix: 'Add <link rel="alternate" type="application/rss+xml" href="' + path + '"> to your HTML <head>.' };
    }
  }
  return { id: "rss_feed", name: "RSS/Atom feed", category: "discovery", status: "fail", score: 0, maxScore: 6, detail: "No RSS or Atom feed found.", fix: "Publish a feed at /feed.xml and add a <link rel=\"alternate\"> discovery tag in your HTML <head>." };
}

function checkJsonLd(html: string): GeoCheck {
  const RECOGNIZED = ["Article", "Product", "FAQPage", "Organization", "WebSite", "WebPage", "Person", "HowTo", "SoftwareApplication", "LocalBusiness", "BlogPosting", "BreadcrumbList", "Event", "VideoObject", "Recipe"];
  const blocks = [...html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
  if (blocks.length === 0) return { id: "json_ld", name: "Structured data (JSON-LD)", category: "metadata", status: "fail", score: 0, maxScore: 8, detail: "No JSON-LD found. AI engines can't understand your page structure.", fix: "Add at least one <script type=\"application/ld+json\"> block. Start with Organization + WebSite on your homepage." };
  const types: string[] = [];
  for (const b of blocks) {
    try {
      const obj = JSON.parse(b.trim());
      const t   = obj["@type"];
      if (t) types.push(...(Array.isArray(t) ? t : [t]));
    } catch { /* malformed */ }
  }
  const recognized = types.filter(t => RECOGNIZED.includes(t));
  if (recognized.length > 0) return { id: "json_ld", name: "Structured data (JSON-LD)", category: "metadata", status: "pass", score: 8, maxScore: 8, detail: `Found ${blocks.length} JSON-LD block(s) with recognized types: ${recognized.join(", ")}` };
  return { id: "json_ld", name: "Structured data (JSON-LD)", category: "metadata", status: "warn", score: 4, maxScore: 8, detail: `JSON-LD found but @type "${types.join(", ")}" is not a recognized schema.org type.`, fix: `Change @type to one of: ${RECOGNIZED.slice(0, 5).join(", ")}` };
}

function checkTitleTag(html: string): GeoCheck {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return { id: "title", name: "Title tag", category: "metadata", status: "fail", score: 0, maxScore: 3, detail: "No <title> tag found.", fix: "Add a unique <title> tag of 10–70 characters." };
  const title = match[1].trim().replace(/\s+/g, " ");
  if (title.length >= 10 && title.length <= 70) return { id: "title", name: "Title tag", category: "metadata", status: "pass", score: 3, maxScore: 3, detail: `Title (${title.length} chars): "${title}"` };
  return { id: "title", name: "Title tag", category: "metadata", status: "warn", score: 1, maxScore: 3, detail: `Title length (${title.length} chars) is outside ideal 10–70 range: "${title}"`, fix: title.length < 10 ? "Expand your title to be more descriptive (10+ chars)." : "Trim your title to under 70 characters." };
}

function checkMetaDescription(html: string): GeoCheck {
  const match = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)
             ?? html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i);
  if (!match) return { id: "meta_desc", name: "Meta description", category: "metadata", status: "fail", score: 0, maxScore: 3, detail: "No meta description found.", fix: "Add <meta name=\"description\" content=\"...\"> with 50–160 characters." };
  const desc = match[1].trim();
  if (desc.length >= 50 && desc.length <= 160) return { id: "meta_desc", name: "Meta description", category: "metadata", status: "pass", score: 3, maxScore: 3, detail: `Description (${desc.length} chars): "${desc.slice(0, 80)}${desc.length > 80 ? "…" : ""}"` };
  return { id: "meta_desc", name: "Meta description", category: "metadata", status: "warn", score: 1, maxScore: 3, detail: `Description length (${desc.length} chars) is outside ideal 50–160 range.`, fix: `Adjust description to 50–160 characters. Current: ${desc.length} chars.` };
}

function checkCanonical(html: string): GeoCheck {
  const match = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
             ?? html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  if (!match) return { id: "canonical", name: "Canonical URL", category: "metadata", status: "fail", score: 0, maxScore: 3, detail: "No canonical URL found.", fix: 'Add <link rel="canonical" href="https://yourdomain.com/page"> to every page.' };
  const url = match[1];
  if (url.startsWith("https://") || url.startsWith("http://")) return { id: "canonical", name: "Canonical URL", category: "metadata", status: "pass", score: 3, maxScore: 3, detail: `Canonical: ${url}` };
  return { id: "canonical", name: "Canonical URL", category: "metadata", status: "warn", score: 1, maxScore: 3, detail: `Canonical URL is relative: "${url}"`, fix: "Use an absolute URL (https://...) in the canonical tag." };
}

function checkOpenGraph(html: string): GeoCheck {
  const hasOgTitle = html.includes('property="og:title"') || html.includes("property='og:title'");
  const hasOgDesc  = html.includes('property="og:description"') || html.includes("property='og:description'");
  if (hasOgTitle && hasOgDesc) return { id: "open_graph", name: "Open Graph tags", category: "metadata", status: "pass", score: 3, maxScore: 3, detail: "og:title and og:description both present." };
  if (hasOgTitle || hasOgDesc) return { id: "open_graph", name: "Open Graph tags", category: "metadata", status: "warn", score: 1, maxScore: 3, detail: `Only ${hasOgTitle ? "og:title" : "og:description"} found. Both required.`, fix: `Add the missing ${hasOgTitle ? "og:description" : "og:title"} meta tag.` };
  return { id: "open_graph", name: "Open Graph tags", category: "metadata", status: "fail", score: 0, maxScore: 3, detail: "Neither og:title nor og:description found.", fix: 'Add <meta property="og:title"> and <meta property="og:description"> to every page.' };
}

// ── LLM-evaluated intelligence score ─────────────────────────────────────────

const IntelligenceSchema = z.object({
  answerFirst: z.object({
    score:    z.number().int().min(0).max(10),
    rationale: z.string(),
    fix:      z.string().optional(),
  }),
  citationsAndStats: z.object({
    score:    z.number().int().min(0).max(10),
    rationale: z.string(),
    fix:      z.string().optional(),
  }),
  authoritativeQuotations: z.object({
    score:    z.number().int().min(0).max(10),
    rationale: z.string(),
    fix:      z.string().optional(),
  }),
  freshnessAndStructure: z.object({
    score:    z.number().int().min(0).max(10),
    rationale: z.string(),
    fix:      z.string().optional(),
  }),
});

async function evaluateContentIntelligence(pageText: string, url: string): Promise<GeoCheck[]> {
  // Trim to keep within reasonable token budget
  const sample = pageText.slice(0, 6000);
  try {
    const { object } = await generateObject({
      model:  deepseek("deepseek-chat"),
      schema: IntelligenceSchema,
      prompt: `You are a GEO (Generative Engine Optimization) content auditor. Analyze the following page content from ${url} and score it on 4 dimensions (0–10 each) for how well it will perform in AI engine citations.

Scoring criteria:
1. answerFirst (0–10): Does content lead with direct, standalone answers? 10=every section opens with a clear direct answer; 0=all context/preamble before any answer.
2. citationsAndStats (0–10): Are specific numbers, percentages, and named sources cited inline? 10=data point every 150 words with source; 0=purely qualitative prose.
3. authoritativeQuotations (0–10): Are direct quotes from named experts or institutions included? 10=multiple verbatim quotes with clear attribution; 0=no quotes from named sources.
4. freshnessAndStructure (0–10): Are visible dates present? Proper H1→H2→H3 hierarchy? FAQ section? Word count 1500+? 10=all present; 0=none.

For each dimension, provide a 1–2 sentence rationale and a specific fix if score < 7.

PAGE CONTENT:
${sample}`,
    });

    return [
      { id: "answer_first", name: "Answer-first structure", category: "content", status: object.answerFirst.score >= 7 ? "pass" : object.answerFirst.score >= 4 ? "warn" : "fail", score: object.answerFirst.score, maxScore: 10, detail: object.answerFirst.rationale, fix: object.answerFirst.fix },
      { id: "citations_stats", name: "Citations & statistics", category: "content", status: object.citationsAndStats.score >= 7 ? "pass" : object.citationsAndStats.score >= 4 ? "warn" : "fail", score: object.citationsAndStats.score, maxScore: 10, detail: object.citationsAndStats.rationale, fix: object.citationsAndStats.fix },
      { id: "quotations", name: "Authoritative quotations", category: "content", status: object.authoritativeQuotations.score >= 7 ? "pass" : object.authoritativeQuotations.score >= 4 ? "warn" : "fail", score: object.authoritativeQuotations.score, maxScore: 10, detail: object.authoritativeQuotations.rationale, fix: object.authoritativeQuotations.fix },
      { id: "freshness_structure", name: "Freshness & structure", category: "content", status: object.freshnessAndStructure.score >= 7 ? "pass" : object.freshnessAndStructure.score >= 4 ? "warn" : "fail", score: object.freshnessAndStructure.score, maxScore: 10, detail: object.freshnessAndStructure.rationale, fix: object.freshnessAndStructure.fix },
    ];
  } catch {
    // Fallback: conservative scores if LLM call fails
    const fallback = (id: string, name: string): GeoCheck => ({ id, name, category: "content", status: "warn", score: 5, maxScore: 10, detail: "Could not evaluate — manual review required." });
    return [
      fallback("answer_first", "Answer-first structure"),
      fallback("citations_stats", "Citations & statistics"),
      fallback("quotations", "Authoritative quotations"),
      fallback("freshness_structure", "Freshness & structure"),
    ];
  }
}

// ── Scoring ───────────────────────────────────────────────────────────────────

function scoreGrade(total: number): string {
  if (total >= 95) return "A+";
  if (total >= 90) return "A";
  if (total >= 80) return "B+";
  if (total >= 70) return "B";
  if (total >= 55) return "C";
  if (total >= 40) return "D";
  return "F";
}

// ── Main agent ────────────────────────────────────────────────────────────────

export class GeoAgent extends BaseAgent {
  name = "GEO" as const;

  systemPrompt = `You are the GEO (Generative Engine Optimization) detection specialist for GetU.ai.
Your job is to audit websites for AI engine visibility and produce actionable status reports.
Be precise, specific, and direct. Prioritize fixes by their impact on AI citation likelihood.`;

  tools = {}; // GEO agent uses direct HTTP checks, not an agentic tool loop

  protected async execute(input: AgentRunInput): Promise<AgentRunResult> {
    // Extract URL from goal — the LLM must include the full URL when creating the task
    const urlMatch = input.goal.match(/https?:\/\/[^\s\)\"\'\]<>]+/);
    if (!urlMatch) {
      throw new Error(
        "No URL found in task goal. The goal must include the full website URL to audit (e.g. 'Audit https://getu.ai for GEO: ...'). " +
        "Current goal: " + (input.goal.slice(0, 120) + (input.goal.length > 120 ? "…" : ""))
      );
    }
    const rawUrl  = urlMatch[0].replace(/[.,;:)\]\'"]+$/, "").replace(/\/$/, "");
    const baseUrl = new URL(rawUrl).origin;

    // Fetch all resources in parallel
    const [robotsRes, llmsRes, sitemapRes, pageRes] = await Promise.all([
      safeFetch(`${baseUrl}/robots.txt`),
      safeFetch(`${baseUrl}/.well-known/llms.txt`),
      safeFetch(`${baseUrl}/sitemap.xml`),
      safeFetch(rawUrl),
    ]);

    const pageHtml = pageRes.text;
    const pageText = extractText(pageHtml);

    // Run all checks in parallel where possible
    const [feedCheck, intelligenceChecks] = await Promise.all([
      checkFeed(baseUrl, pageHtml),
      evaluateContentIntelligence(pageText, rawUrl),
    ]);

    const checks: GeoCheck[] = [
      // Access
      checkRobotsTxt(robotsRes.text, robotsRes.ok),
      checkNoAiMeta(pageHtml),
      checkNoIndex(pageHtml),
      // Discovery
      checkLlmsTxt(llmsRes.text, llmsRes.ok),
      checkSitemap(sitemapRes.text, sitemapRes.ok),
      feedCheck,
      // Metadata
      checkJsonLd(pageHtml),
      checkTitleTag(pageHtml),
      checkMetaDescription(pageHtml),
      checkCanonical(pageHtml),
      checkOpenGraph(pageHtml),
      // Content intelligence (LLM-evaluated)
      ...intelligenceChecks,
    ];

    const foundationalScore = checks
      .filter(c => c.category !== "content")
      .reduce((sum, c) => sum + c.score, 0); // max 60

    const intelligenceScore = checks
      .filter(c => c.category === "content")
      .reduce((sum, c) => sum + c.score, 0); // max 40

    const overallScore = Math.round(foundationalScore + intelligenceScore);
    const grade        = scoreGrade(overallScore);

    // Build top 5 priority fixes from failing/warning checks
    const failing = checks
      .filter(c => c.status !== "pass" && c.fix)
      .sort((a, b) => (b.maxScore - b.score) - (a.maxScore - a.score))
      .slice(0, 5);

    const topFixes = failing.map(c => `**${c.name}** (+${c.maxScore - c.score} pts): ${c.fix}`);

    const hostname = new URL(rawUrl).hostname;
    const aiTestPrompts = [
      `What is ${hostname.replace("www.", "")}?`,
      `Best tools for ${input.productProfile?.valueProp?.slice(0, 40) ?? "this category"}?`,
      `How do I solve ${input.productProfile?.painPoints?.[0] ?? "the main problem this product addresses"}?`,
      `${hostname} vs competitors — what's the difference?`,
      `What does ${hostname} say about their product?`,
    ];

    const report: GeoReport = {
      url: rawUrl,
      checkedAt: new Date().toISOString(),
      foundationalScore,
      intelligenceScore,
      overallScore,
      grade,
      checks,
      topFixes,
      aiTestPrompts,
    };

    const failCount = checks.filter(c => c.status === "fail").length;
    const warnCount = checks.filter(c => c.status === "warn").length;
    const summary   = `GEO audit for ${rawUrl}: ${overallScore}/100 (${grade}). ${failCount} failing, ${warnCount} warnings. Top issue: ${failing[0]?.name ?? "none"}.`;

    return {
      summary,
      data: { type: "geo_report", report },
    };
  }
}

export const geo = new GeoAgent();
