import { streamText, tool, type CoreMessage } from "ai";
import { deepseek } from "@ai-sdk/deepseek";
import { z } from "zod";
import { db, productProfiles, tasks, conversations, messages } from "../db/index.js";
import { eq, and, inArray } from "drizzle-orm";
import { taskQueue } from "../services/queue.js";
import { skillsPromptBlock } from "../skills/index.js";
import type { AgentName } from "../../../shared/types.js";

function buildSystemPrompt(): string {
  return `You are ARIA, the GTM orchestrator for GetU.ai.

## Role
- Learn the user's product: what it does, who it's for, what pain it solves
- Align on GTM strategy and propose concrete agent tasks
- Create tasks only after explicit user confirmation
- Surface results and insights from agents back to the user. Use **read_task_results** when the user asks "what did my agents do?", "any results?", "morning report", or to summarize recent completed/failed tasks. Then summarize the returned digests in a short report (bullet points or 1–2 sentences per task).

## Personality
Direct, strategic, sharp. Think senior marketing operator — not a chatbot.
No filler. Every sentence must add signal.

## Formatting rules (MANDATORY)
- ALWAYS use markdown in every response
- Use **bold** for key terms, names, numbers
- Use bullet lists (- item) for 3+ related items
- Use numbered lists for sequential steps
- Use ## headers to separate sections in longer responses
- Add a blank line between paragraphs and sections
- Maximum 2–3 sentences per paragraph
- Never write a wall of text — break up content with structure

## When a user shares a URL
The URL content will be provided in the context below. Read it and use it — do NOT ask the user to describe their product if you already have the URL content.

## Task creation flow
1. Propose specific tasks with expected outputs
2. Ask "Want me to proceed?" — one clear question
3. Only call create_task after user says yes / go ahead / do it
4. When creating a GEO task: the goal MUST contain the full website URL the user gave (e.g. "Audit https://getu.ai for GEO: AI bot access, llms.txt, structured data, metadata, content quality"). Copy the URL exactly from the user's message.

${skillsPromptBlock()}`;
}

// Extract and fetch URLs mentioned in a user message
async function prefetchUrls(text: string): Promise<string> {
  const matches = text.match(/https?:\/\/[^\s\)\"\']+/g) ?? [];
  if (matches.length === 0) return "";

  const results = await Promise.allSettled(
    matches.map(async (url) => {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ARIA/1.0)" },
        signal:  AbortSignal.timeout(8_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const title   = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
      const desc    = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{0,400})["']/i)?.[1]
                   ?? html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{0,400})["']/i)?.[1]
                   ?? "";
      const body    = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/\s+/g, " ").trim().slice(0, 3000);
      return { url, title: title.slice(0, 150), description: desc, content: body };
    })
  );

  const lines: string[] = ["## Content fetched from URLs shared by user:"];
  for (const r of results) {
    if (r.status === "fulfilled") {
      const { url, title, description, content } = r.value;
      lines.push(`\n### ${url}\n**Title:** ${title}\n**Description:** ${description}\n**Page content:** ${content}`);
    }
  }
  return lines.length > 1 ? lines.join("\n") : "";
}

export async function streamAriaResponse(
  userId: string,
  conversationId: string,
  userMessage: string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  // Load conversation history and product profile in parallel
  const [history, profile] = await Promise.all([
    db.query.messages.findMany({
      where:     eq(messages.conversationId, conversationId),
      orderBy:   (m, { asc }) => asc(m.createdAt),
    }),
    db.query.productProfiles.findFirst({ where: eq(productProfiles.userId, userId) }),
  ]);

  // Pre-fetch any URLs in the user's message before calling the LLM
  const urlContext = await prefetchUrls(userMessage);

  const coreMessages: CoreMessage[] = history.map((m) => ({
    role:    m.role as "user" | "assistant",
    content: m.content,
  }));
  coreMessages.push({ role: "user", content: userMessage });

  const productContext = profile
    ? `\n\n## Saved product profile\n${JSON.stringify({ name: profile.name, valueProp: profile.valueProp, icpSummary: profile.icpSummary, icpTitles: profile.icpTitles, icpIndustries: profile.icpIndustries, painPoints: profile.painPoints }, null, 2)}`
    : "\n\nNo product profile saved yet.";

  const systemSuffix = productContext + (urlContext ? `\n\n${urlContext}` : "");

  const result = streamText({
    model:    deepseek("deepseek-chat"),
    system:   buildSystemPrompt() + systemSuffix,
    messages: coreMessages,
    tools: {

      update_product_profile: tool({
        description: "Save or update the user's product profile",
        parameters: z.object({
          name:           z.string(),
          description:    z.string(),
          valueProp:      z.string().describe("One-sentence value proposition"),
          icpSummary:     z.string().describe("Paragraph describing the ideal customer"),
          icpTitles:      z.array(z.string()),
          icpIndustries:  z.array(z.string()),
          icpCompanySize: z.string(),
          painPoints:     z.array(z.string()).describe("Top 3-5 pain points"),
          targetChannels: z.array(z.string()),
        }),
        execute: async (data) => {
          await db.insert(productProfiles).values({ userId, ...data }).onConflictDoUpdate({
            target: productProfiles.userId,
            set:    { ...data, updatedAt: new Date() },
          });
          return { success: true };
        },
      }),

      create_task: tool({
        description: "Create and queue a task for a specialist agent. Only call AFTER user confirms. For GEO: goal MUST include the full URL to audit (e.g. 'Audit https://example.com for GEO: AI bot access, llms.txt, metadata, content').",
        parameters: z.object({
          agentName: z.enum(["SCOUT", "GEO", "PULSE", "FORGE", "HERALD", "LENS", "COMMUNITY"]),
          skillId:   z.string().describe("Skill id from the catalog, e.g. 'find_signal_posts', 'check_geo_status'"),
          title:     z.string().describe("Short human-readable task title"),
          goal:      z.string().describe("Full context: for GEO include the exact URL (https://...); for SCOUT include keywords, platforms, expected output"),
          priority:  z.number().int().min(1).max(5).default(3),
        }),
        execute: async ({ agentName, title, goal, priority }) => {
          const [task] = await db.insert(tasks).values({ userId, agentName, title, goal, priority, status: "pending" }).returning();
          try {
            await taskQueue.add("run-agent-task", { taskId: task.id, userId, agentName: agentName as AgentName, goal }, {
              priority,
              attempts: 3,
              backoff: { type: "exponential", delay: 5_000 },
            });
            console.log(`[queue] Task ${task.id} (${agentName}) queued for execution`);
          } catch (err) {
            console.error("[queue] Failed to add task to queue:", err);
            throw err;
          }
          return { taskId: task.id, agentName, title, status: "pending" };
        },
      }),

      list_tasks: tool({
        description: "Get current task status for this user",
        parameters: z.object({ status: z.enum(["all", "pending", "running", "completed", "failed"]).default("all") }),
        execute: async ({ status }) => {
          const where = status === "all" ? eq(tasks.userId, userId) : and(eq(tasks.userId, userId), eq(tasks.status, status));
          const rows = await db.query.tasks.findMany({ where });
          return { tasks: rows.map(t => ({ id: t.id, agentName: t.agentName, title: t.title, status: t.status })) };
        },
      }),

      read_task_results: tool({
        description: "Get recent task results (summary and digest) for completed or failed tasks. Use when the user asks for a report, what agents did, or morning summary.",
        parameters: z.object({
          limit: z.number().int().min(1).max(20).default(10),
          status: z.enum(["completed", "failed", "both"]).default("both"),
        }),
        execute: async ({ limit, status }) => {
          const whereClause = status === "both"
            ? and(eq(tasks.userId, userId), inArray(tasks.status, ["completed", "failed"]))
            : and(eq(tasks.userId, userId), eq(tasks.status, status));
          const rows = await db.query.tasks.findMany({
            where:   whereClause,
            orderBy: (t, { desc }) => desc(t.completedAt),
            limit,
          });
          const results = rows.map(t => {
            let digest = t.resultSummary ?? "";
            const data = t.resultData as { type?: string; report?: { overallScore?: number; grade?: string; topFixes?: string[] }; posts?: unknown[]; profiles?: unknown[] } | null;
            if (data?.type === "geo_report" && data.report) {
              digest = `GEO score ${data.report.overallScore ?? "?"}/100 (${data.report.grade ?? "?"}). Top fixes: ${(data.report.topFixes ?? []).slice(0, 3).join("; ") || "none"}`;
            } else if (data?.type === "signal_posts" && data.posts) {
              digest = `${data.posts.length} signal posts. ${t.resultSummary ?? ""}`;
            } else if (data?.type === "icp_profiles" && data.profiles) {
              digest = `${data.profiles.length} ICP profiles. ${t.resultSummary ?? ""}`;
            }
            return { id: t.id, agentName: t.agentName, title: t.title, status: t.status, resultSummary: t.resultSummary, error: t.error, digest };
          });
          return { tasks: results };
        },
      }),
    },
    maxSteps: 8,
    onFinish: async ({ text }) => {
      if (text) await db.insert(messages).values({ conversationId, role: "assistant", content: text });
    },
  });

  // Persist user message
  await db.insert(messages).values({ conversationId, role: "user", content: userMessage });

  return result;
}
