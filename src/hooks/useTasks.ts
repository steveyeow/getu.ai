import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase.js";
import { getTasks, pauseTask, deleteTask, updateTaskPriority } from "../lib/api.js";
import type { Task } from "../../shared/types.js";

// Loads tasks and subscribes to real-time updates via Supabase Realtime.
// Any INSERT or UPDATE on the tasks table for the current user is reflected immediately.
export function useTasks(userId: string) {
  const [tasks, setTasks]     = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getTasks();
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    // Subscribe to realtime updates on the tasks table for this user
    const channel = supabase
      .channel("tasks-realtime")
      .on(
        "postgres_changes",
        {
          event:  "*",
          schema: "public",
          table:  "tasks",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTasks(prev => [payload.new as Task, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setTasks(prev => prev.map(t => t.id === (payload.new as Task).id ? payload.new as Task : t));
          } else if (payload.eventType === "DELETE") {
            setTasks(prev => prev.filter(t => t.id !== (payload.old as Task).id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, load]);

  const pause = useCallback(async (id: string) => {
    await pauseTask(id);
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteTask(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const setPriority = useCallback(async (id: string, priority: number) => {
    await updateTaskPriority(id, priority);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, priority } : t));
  }, []);

  return { tasks, loading, error, refresh: load, pause, remove, setPriority };
}
