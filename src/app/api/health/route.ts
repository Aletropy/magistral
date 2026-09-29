import { formatVersion, getReleaseInfo } from "@/lib/config/release";
import { getDb } from "@/lib/db/client";
import { logEvent } from "@/lib/log";
import { definePublicRoute } from "@/lib/http/route";
import { isTaskWorkerRunning } from "@/lib/tasks/getTaskWorker";

const HTTP_SERVICE_UNAVAILABLE = 503;

/** For Docker and uptime checks: whether the database answers and the worker runs. No user data. */
export const GET = definePublicRoute({}, () => {
  const version = formatVersion(getReleaseInfo());
  try {
    getDb().prepare("SELECT 1").get();
  } catch (error) {
    logEvent("error", "health.database_failed", {}, error);
    return Response.json({ status: "error", version }, { status: HTTP_SERVICE_UNAVAILABLE });
  }
  return Response.json({ status: "ok", version, worker: isTaskWorkerRunning() ? "running" : "stopped" });
});
