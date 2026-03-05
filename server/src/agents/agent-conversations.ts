// Conversational system prompts for each agent when chatting directly with users.
// Unlike task execution (BaseAgent.run), these are interactive — the agent asks
// questions, aligns on scope, then creates a task after user confirmation.

import { streamText, tool, type CoreMessage } from "ai";
import { deepseek } from "@ai-sdk/deepseek";
import { z } from "zod";
import { db, productProfiles, tasks, conversations, messages } from "../db/index.js";
import { eq, and } from "drizzle-orm";
import { taskQueue } from "../services/queue.js";
import type { AgentName } from "../../../shared/types.js";

// ── Per-agent conversational configs ─────────────────────────────────────────

const AGENT_PROMPTS: Record<string, string> = {
  SCOUT: `You are SCOUT, GetU.ai's specialist for signal finding and ICP prospecting.
You talk directly with users to understand what they need, ask focused questions, then create tasks.

## Your skills
- **Find signal posts** on Twitter/X and Reddit — posts where people publicly express the pain your product solves
- **Find ICP-matching people** on Twitter and LinkedIn (by job title, industry, company size)
- **Generate personalized outreach drafts** for the top prospects (human reviews before sending)

## How to work
1. Check if a product profile exists. If not, ask for: product name, what it does, and who it's for (one question).
2. Ask what the user wants: signal posts, ICP people, or outreach drafts?
3. Get specific details — keywords, platforms, target job titles. One question at a time.
4. Propose a clear task: what you'll search for, where, and what you'll return.
5. Ask "Shall I run this?" — only call create_task after explicit confirmation.
6. After creating the task, tell them results will appear in Missions (usually 1–3 minutes).

## Style
Direct and specific. Short messages. One question per turn. No bullet-list filler.
Use **bold** for key terms. Never say "certainly" or "of course".`,

  GEO: `You are GEO, GetU.ai's specialist for AI Engine Optimization (GEO) auditing.
You help users understand how visible their website is to AI systems like ChatGPT, Perplexity, and Claude — and exactly what to fix.

## Your skill
Audit any website URL and produce a 0–100 GEO score covering:
- **AI bot access** (robots.txt allows GPTBot, ClaudeBot, PerplexityBot, etc.)
- **llms.txt** (/.well-known/llms.txt for AI self-description)
- **Structured data** (JSON-LD schema)
- **Metadata** (title, description, canonical, Open Graph)
- **Content intelligence** (answer-first structure, citations, authoritative quotations, freshness)

## How to work
1. Ask for the website URL to audit (if not already in the message).
2. Briefly confirm what you'll check — one sentence.
3. Ask "Ready to run the audit?" — create the task after they confirm.
4. When you call create_task, the **goal** parameter MUST include the full URL to audit, exactly as the user gave it. Example: "Audit https://getu.ai for GEO status: AI bot access, llms.txt, structured data, metadata, content quality." Without the URL in the goal, the audit cannot run.
5. After task creation, tell them results appear in Missions in ~30 seconds.
6. Offer to explain any findings or prioritize fixes once they've seen the report.

## Style
Precise and confident. Short messages. One question per turn.
Use **bold** for technical terms. No fluff.`,
};

// Agents not yet available in conversational mode
const COMING_SOON = new Set(["PULSE", "FORGE", "HERALD", "LENS", "COMMUNITY"]);

// ── Streaming agent chat ──────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function streamAgentResponse(
  agentName: string,
  userId: string,
  conversationId: string,
  userMessage: string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  if (COMING_SOON.has(agentName)) {
    throw new Error(`${agentName} is not yet available for direct chat.`);
  }
  const systemPrompt = AGENT_PROMPTS[agentName];
  if (!systemPrompt) throw new Error(`Unknown agent: ${agentName}`);

  // Load conversation history + product profile
  const [history, profile] = await Promise.all([
    db.query.messages.findMany({
      where:   eq(messages.conversationId, conversationId),
      orderBy: (m, { asc }) => asc(m.createdAt),
    }),
    db.query.productProfiles.findFirst({ where: eq(productProfiles.userId, userId) }),
  ]);

  const coreMessages: CoreMessage[] = history.map(m => ({
    role:    m.role as "user" | "assistant",
    content: m.content,
  }));
  coreMessages.push({ role: "user", content: userMessage });

  const productContext = profile
    ? `\n\n## User's product profile\n${JSON.stringify({ name: profile.name, valueProp: profile.valueProp, icpSummary: profile.icpSummary, icpTitles: profile.icpTitles, painPoints: profile.painPoints }, null, 2)}`
    : "\n\nNo product profile saved yet — ask the user about their product if relevant.";

  const result = streamText({
    model:    deepseek("deepseek-chat"),
    system:   systemPrompt + productContext,
    messages: coreMessages,
    tools: {
      create_task: tool({
        description: `Create and queue a ${agentName} task. Only call AFTER the user explicitly confirms. For GEO: goal MUST include the full URL to audit (e.g. "Audit https://example.com for GEO: ...").`,
        parameters: z.object({
          title:   z.string().describe("Short human-readable task title"),
          goal:    z.string().describe("For GEO: must include the full URL (https://...). For SCOUT: keywords, platforms, target output."),
          skillId: z.string().describe("Skill id, e.g. 'check_geo_status', 'find_signal_posts'"),
          priority: z.number().int().min(1).max(5).default(3),
        }),
        execute: async ({ title, goal, priority }) => {
          const [task] = await db.insert(tasks).values({
            userId,
            agentName,
            title,
            goal,
            priority,
            status: "pending",
          }).returning();

          try {
            await taskQueue.add("run-agent-task", {
              taskId:    task.id,
              userId,
              agentName: agentName as AgentName,
              goal,
            }, {
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
    },
    maxSteps: 5,
    onFinish: async ({ text }) => {
      if (text) {
        await db.insert(messages).values({ conversationId, role: "assistant", content: text });
      }
    },
  });

  // Persist user message
  await db.insert(messages).values({ conversationId, role: "user", content: userMessage });

  return result;
}
