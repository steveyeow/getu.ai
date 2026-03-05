import { Hono } from "hono";
import { db, tasks, executions } from "../db/index.js";
import { eq, and } from "drizzle-orm";
import { taskQueue } from "../services/queue.js";
import type { ApiResponse, PaginatedResponse, Task, AgentName } from "../../../shared/types.js";
import type { AppEnv } from "../lib/hono.js";

const tasksRoute = new Hono<AppEnv>();

// GET /api/v1/tasks
tasksRoute.get("/", async (c) => {
  const userId = c.get("userId") as string;
  const status = c.req.query("status");

  const where = status
    ? and(eq(tasks.userId, userId), eq(tasks.status, status))
    : eq(tasks.userId, userId);

  const rows = await db.query.tasks.findMany({
    where,
    orderBy: (t, { desc }) => desc(t.createdAt),
  });

  return c.json<PaginatedResponse<Task>>({
    data:  rows as unknown as Task[],
    total: rows.length,
    error: null,
  });
});

// GET /api/v1/tasks/:id
tasksRoute.get("/:id", async (c) => {
  const userId = c.get("userId") as string;
  const id     = c.req.param("id");

  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, id), eq(tasks.userId, userId)),
  });

  if (!task) {
    return c.json<ApiResponse<null>>({ data: null, error: "task not found" }, 404);
  }

  const steps = await db.query.executions.findMany({
    where: eq(executions.taskId, id),
    orderBy: (e, { asc }) => asc(e.step),
  });

  return c.json<ApiResponse<{ task: typeof task; executions: typeof steps }>>({
    data:  { task, executions: steps },
    error: null,
  });
});

// POST /api/v1/tasks/:id/pause
tasksRoute.post("/:id/pause", async (c) => {
  const userId = c.get("userId") as string;
  const id     = c.req.param("id");

  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, id), eq(tasks.userId, userId)),
  });
  if (!task) return c.json<ApiResponse<null>>({ data: null, error: "task not found" }, 404);
  if (task.status !== "running" && task.status !== "pending") {
    return c.json<ApiResponse<null>>({ data: null, error: "task is not running" }, 400);
  }

  await db.update(tasks).set({ status: "paused" }).where(eq(tasks.id, id));
  return c.json<ApiResponse<{ id: string }>>({ data: { id }, error: null });
});

// POST /api/v1/tasks/:id/resume
tasksRoute.post("/:id/resume", async (c) => {
  const userId = c.get("userId") as string;
  const id     = c.req.param("id");

  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, id), eq(tasks.userId, userId)),
  });
  if (!task) return c.json<ApiResponse<null>>({ data: null, error: "task not found" }, 404);
  if (task.status !== "paused") {
    return c.json<ApiResponse<null>>({ data: null, error: "task is not paused" }, 400);
  }

  await db.update(tasks).set({ status: "pending" }).where(eq(tasks.id, id));

  // Re-enqueue
  await taskQueue.add("run-agent-task", {
    taskId:    task.id,
    userId,
    agentName: task.agentName as AgentName,
    goal:      task.goal,
  }, { priority: task.priority });

  return c.json<ApiResponse<{ id: string }>>({ data: { id }, error: null });
});

// PATCH /api/v1/tasks/:id — update priority (1–5). If task is pending/paused, re-enqueue with new priority.
tasksRoute.patch("/:id", async (c) => {
  const userId = c.get("userId") as string;
  const id     = c.req.param("id");
  const body   = await c.req.json<{ priority?: number }>();
  const priority = body.priority;

  if (priority === undefined || !Number.isInteger(priority) || priority < 1 || priority > 5) {
    return c.json<ApiResponse<null>>({ data: null, error: "priority must be 1–5" }, 400);
  }

  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, id), eq(tasks.userId, userId)),
  });
  if (!task) return c.json<ApiResponse<null>>({ data: null, error: "task not found" }, 404);

  await db.update(tasks).set({ priority }).where(eq(tasks.id, id));
  return c.json<ApiResponse<{ id: string; priority: number }>>({ data: { id, priority }, error: null });
});

// DELETE /api/v1/tasks/:id
tasksRoute.delete("/:id", async (c) => {
  const userId = c.get("userId") as string;
  const id     = c.req.param("id");

  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, id), eq(tasks.userId, userId)),
  });
  if (!task) return c.json<ApiResponse<null>>({ data: null, error: "task not found" }, 404);

  await db.delete(tasks).where(eq(tasks.id, id));
  return c.json<ApiResponse<{ id: string }>>({ data: { id }, error: null });
});

export default tasksRoute;
