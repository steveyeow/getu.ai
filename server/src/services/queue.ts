import { Queue, Worker, type Job } from "bullmq";
import { scout } from "../agents/scout.js";
import { geo } from "../agents/geo.js";
import { db, productProfiles } from "../db/index.js";
import { eq } from "drizzle-orm";
import type { AgentName } from "../../../shared/types.js";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
// BullMQ accepts a URL string directly — avoids ioredis version conflicts
const connection = { url: redisUrl };

// Single queue for all agent tasks
export const taskQueue = new Queue("agent-tasks", { connection });

interface TaskJobData {
  taskId:    string;
  userId:    string;
  agentName: AgentName;
  goal:      string;
}

// Worker — processes tasks from the queue
export function startWorker(): Worker {
  const worker = new Worker<TaskJobData>(
    "agent-tasks",
    async (job: Job<TaskJobData>) => {
      const { taskId, userId, agentName, goal } = job.data;
      console.log(`[worker] Starting task ${taskId} (${agentName}) — goal length ${goal?.length ?? 0} chars`);

      // Load product profile for agent context
      const profile = await db.query.productProfiles.findFirst({
        where: eq(productProfiles.userId, userId),
      });

      const productProfile = {
        valueProp:     profile?.valueProp     ?? "",
        icpSummary:    profile?.icpSummary    ?? "",
        icpTitles:     profile?.icpTitles     ?? [],
        icpIndustries: profile?.icpIndustries ?? [],
        painPoints:    profile?.painPoints    ?? [],
      };

      // Route to the correct agent
      let result;
      switch (agentName) {
        case "SCOUT":
          result = await scout.run({ taskId, userId, goal, productProfile });
          break;
        case "GEO":
          result = await geo.run({ taskId, userId, goal, productProfile });
          break;
        default:
          throw new Error(`Agent ${agentName} is not implemented yet`);
      }
      console.log(`[worker] Task ${taskId} (${agentName}) completed`);
      return result;
    },
    {
      connection,
      concurrency: 3, // max 3 agent tasks running in parallel
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`[worker] Task job ${job?.id} failed:`, err.message);
  });

  worker.on("error", (err) => {
    console.error("[worker] Worker error (e.g. Redis connection):", err.message);
  });

  return worker;
}
