import type { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { insertTestUser } from "@/lib/auth/testHelpers";
import { IN_MEMORY_DATABASE, openDatabase } from "@/lib/db/openDatabase";
import { createNotificationRepository, type NotificationRepository } from "@/lib/notifications/repository";
import { retryDelayMs } from "@/lib/queue/retryPolicy";
import { createSlotPool } from "@/lib/queue/slotPool";
import { TaskCanceledError, TaskInputError } from "./errors";
import type { AnyTaskHandler, TaskHandler } from "./handler";
import { INTERRUPTED_TASK_MESSAGE, createTaskRepository, type TaskRepository } from "./repository";
import type { TaskKind, TaskLane } from "./types";
import { createTaskWorker, TASK_MAX_ATTEMPTS } from "./worker";

/** Just after "now": new tasks become due at their creation time. */
const START = new Date(Date.now() + 1000);

class TransientError extends Error {}

/** The user who queues the tasks of the current test; set whenever a test opens a database. */
let owner: string;

function openTestDatabase(): DatabaseSync {
  const db = openDatabase(IN_MEMORY_DATABASE);
  owner = insertTestUser(db);
  return db;
}

/** Queued and running tasks in every lane. */
function activeCount(tasks: TaskRepository): number {
  return tasks.countActive(owner, "llm") + tasks.countActive(owner, "library");
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => (resolve = done));
  return { promise, resolve };
}

type Run = TaskHandler<{ name: string }, { greeting: string }>["run"];

function handler(kind: TaskKind, lane: TaskLane, run: Run, hooks: Partial<AnyTaskHandler> = {}): AnyTaskHandler {
  return {
    kind,
    lane,
    payloadSchema: z.object({ name: z.string() }),
    resultSchema: z.object({ greeting: z.string() }),
    run,
    describeSuccess: (result: { greeting: string }) => ({ level: "success", title: result.greeting, body: "", href: "/ok" }),
    describeFailure: (message: string) => ({ level: "error", title: "falhou", body: message, href: null }),
    ...hooks,
  };
}

function setup(handlers: AnyTaskHandler[], now = () => START) {
  const db = openTestDatabase();
  const tasks = createTaskRepository(db);
  const notifications = createNotificationRepository(db);
  const worker = createTaskWorker({
    tasks,
    handlers,
    isRetryable: (error) => error instanceof TransientError,
    describeError: (error) => (error instanceof Error ? error.message : "erro"),
    notify: (notification) => notifications.create(notification),
    now,
  });
  return { db, tasks, notifications, worker };
}

function enqueue(tasks: TaskRepository, name: string, kind: TaskKind = "minuta.draft", lane: TaskLane = "llm") {
  return tasks.create({ ownerId: owner, kind, lane, title: `Tarefa ${name}`, payload: { name } });
}

describe("task repository", () => {
  let db: DatabaseSync;
  let tasks: TaskRepository;

  beforeEach(() => {
    db = openTestDatabase();
    tasks = createTaskRepository(db);
  });

  it("claims due tasks of one lane atomically, oldest first", () => {
    const first = enqueue(tasks, "a");
    enqueue(tasks, "b");
    enqueue(tasks, "c", "library.sync", "library");

    expect(tasks.claim("llm", 1, START).map((task) => task.id)).toEqual([first]);
    expect(tasks.claim("llm", 5, START).map((task) => task.payload)).toEqual([{ name: "b" }]);
    expect(tasks.claim("llm", 5, START)).toEqual([]);
    expect(tasks.claim("library", 5, START)).toHaveLength(1);
    expect(tasks.get(first, owner)).toMatchObject({ status: "running", attempts: 1 });
  });

  it("keeps files until the task succeeds and records per-file outcomes", () => {
    const id = tasks.create({ ownerId: owner,
      kind: "library.upload",
      lane: "library",
      title: "Envio",
      payload: {},
      files: [{ name: "a.pdf", bytes: new Uint8Array([1, 2]) }, { name: "b.pdf", bytes: new Uint8Array([3]) }],
    });
    tasks.setFileOutcome(id, 1, "added");
    expect(tasks.files(id).map((file) => [file.name, file.outcome, [...file.bytes]])).toEqual([
      ["a.pdf", "added", [1, 2]],
      ["b.pdf", null, [3]],
    ]);

    tasks.claim("library", 1, START);
    tasks.complete(id, START, () => ({ ok: true }));
    expect(tasks.files(id)).toEqual([]);
    expect(tasks.get(id, owner)).toMatchObject({ status: "succeeded", result: { ok: true } });
  });

  it("refuses to complete a cancelled task and rolls back its side effect", () => {
    db.exec("CREATE TABLE side_effects (id INTEGER)");
    const id = enqueue(tasks, "a");
    tasks.claim("llm", 1, START);
    expect(tasks.cancel(id, START)).toBe(true);

    expect(() => tasks.complete(id, START, () => db.exec("INSERT INTO side_effects VALUES (1)"))).toThrow(
      TaskCanceledError,
    );
    expect(db.prepare("SELECT COUNT(*) AS n FROM side_effects").get()).toEqual({ n: 0 });
    expect(tasks.fail(id, "tarde demais", START)).toBe(false);
    expect(tasks.get(id, owner)!.status).toBe("canceled");
  });

  it("requeues interrupted tasks on restart, failing those with no attempts left", () => {
    const fresh = enqueue(tasks, "a");
    const exhausted = enqueue(tasks, "b");
    tasks.claim("llm", 2, START);
    db.prepare("UPDATE tasks SET attempts = 5 WHERE id = ?").run(exhausted);

    expect(tasks.resetRunning(5, START)).toBe(2);
    expect(tasks.get(fresh, owner)!.status).toBe("pending");
    expect(tasks.get(exhausted, owner)).toMatchObject({ status: "failed", error: INTERRUPTED_TASK_MESSAGE });
  });

  it("requeues failed tasks with fresh attempts, lists active ones and purges old finished ones", () => {
    const id = enqueue(tasks, "a");
    enqueue(tasks, "b");
    tasks.claim("llm", 1, START);
    tasks.fail(id, "erro", START);

    expect(tasks.list({ ownerId: owner, activeOnly: true, limit: 10 })).toHaveLength(1);
    expect(activeCount(tasks)).toBe(1);
    expect(tasks.requeue(id, START)).toBe(true);
    expect(tasks.get(id, owner)).toMatchObject({ status: "pending", attempts: 0, error: null });

    tasks.claim("llm", 2, START);
    tasks.complete(id, START, () => null);
    expect(tasks.purgeFinishedBefore(new Date(START.getTime() + 1))).toBe(1);
    expect(tasks.get(id, owner)).toBeNull();
    expect(tasks.list({ ownerId: owner, limit: 10 })).toHaveLength(1);
  });
});

describe("createTaskWorker", () => {
  it("runs a task, stores its result and links the notification to it", async () => {
    const { tasks, notifications, worker } = setup([
      handler("minuta.draft", "llm", async ({ payload, reportProgress }) => {
        reportProgress(1, 2, "Redigindo");
        return { greeting: `Olá, ${payload.name}` };
      }),
    ]);
    const id = enqueue(tasks, "Ana");

    expect(await worker.tick()).toBe(1);
    expect(tasks.get(id, owner)).toMatchObject({ status: "succeeded", result: { greeting: "Olá, Ana" }, progress: null, href: "/ok" });
    expect(notifications.listRecent(owner, 5)).toMatchObject([{ level: "success", title: "Olá, Ana", taskId: id }]);
  });

  it("refills a lane as soon as a slot frees, without waiting for the rest of the wave", async () => {
    const slow = deferred();
    const started: string[] = [];
    const { tasks, worker } = setup([
      handler("minuta.draft", "llm", async ({ payload }) => {
        started.push(payload.name);
        if (payload.name === "lenta") await slow.promise;
        return { greeting: payload.name };
      }),
    ]);
    ["lenta", "rápida", "terceira"].forEach((name) => enqueue(tasks, name));

    expect(worker.fill()).toBe(2);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(worker.fill()).toBe(1);
    expect(started).toEqual(["lenta", "rápida", "terceira"]);

    slow.resolve();
    await worker.drain();
    expect(activeCount(tasks)).toBe(0);
  });

  it("keeps the llm lane moving while a long library task runs", async () => {
    const reindex = deferred();
    const { tasks, worker } = setup([
      handler("library.reindex", "library", async () => {
        await reindex.promise;
        return { greeting: "ok" };
      }),
      handler("minuta.draft", "llm", async () => ({ greeting: "ok" })),
    ]);
    enqueue(tasks, "índice", "library.reindex", "library");
    enqueue(tasks, "outro índice", "library.reindex", "library");
    const draft = enqueue(tasks, "minuta");

    expect(worker.fill()).toBe(2);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(tasks.get(draft, owner)!.status).toBe("succeeded");
    expect(activeCount(tasks)).toBe(2);

    reindex.resolve();
    await worker.drain();
    await worker.tick();
    expect(activeCount(tasks)).toBe(0);
  });

  it("retries transient failures after the backoff and fails permanent ones with a notification", async () => {
    let clock = START;
    let calls = 0;
    const { tasks, notifications, worker } = setup(
      [
        handler("minuta.draft", "llm", async ({ payload }) => {
          calls++;
          if (payload.name === "instável" && calls === 1) throw new TransientError("Muitas solicitações");
          if (payload.name === "inválida") throw new TaskInputError("Dados inválidos.");
          return { greeting: "ok" };
        }),
      ],
      () => clock,
    );
    const flaky = enqueue(tasks, "instável");
    await worker.tick();
    expect(tasks.get(flaky, owner)).toMatchObject({ status: "pending", error: "Muitas solicitações", attempts: 1 });
    expect(await worker.tick()).toBe(0);

    clock = new Date(START.getTime() + retryDelayMs(1));
    await worker.tick();
    expect(tasks.get(flaky, owner)!.status).toBe("succeeded");

    const invalid = enqueue(tasks, "inválida");
    await worker.tick();
    expect(tasks.get(invalid, owner)).toMatchObject({ status: "failed", error: "Dados inválidos.", attempts: 1 });
    expect(notifications.listRecent(owner, 1)).toMatchObject([{ level: "error", body: "Dados inválidos.", taskId: invalid }]);
  });

  it("gives up after the maximum number of attempts", async () => {
    let clock = START;
    const { tasks, worker } = setup(
      [handler("minuta.draft", "llm", async () => Promise.reject(new TransientError("Serviço indisponível")))],
      () => clock,
    );
    const id = enqueue(tasks, "a");
    for (let attempt = 1; attempt <= TASK_MAX_ATTEMPTS; attempt++) {
      await worker.tick();
      clock = new Date(clock.getTime() + retryDelayMs(attempt));
    }
    expect(tasks.get(id, owner)).toMatchObject({ status: "failed", attempts: TASK_MAX_ATTEMPTS });
  });

  it("aborts a running task on cancel, discarding its result and running the cleanup hook", async () => {
    const canceled: string[] = [];
    const { tasks, notifications, worker } = setup([
      handler(
        "minuta.draft",
        "llm",
        ({ payload, signal, commit }) =>
          new Promise((resolve, reject) => {
            signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
            setTimeout(() => resolve(commit(() => ({ greeting: payload.name }))), 50);
          }),
        { onCanceled: (payload: { name: string }) => canceled.push(payload.name) },
      ),
    ]);
    const id = enqueue(tasks, "Ana");

    worker.fill();
    expect(worker.cancel(id)).toBe(true);
    await worker.drain();
    expect(tasks.get(id, owner)).toMatchObject({ status: "canceled", result: null });
    expect(canceled).toEqual(["Ana"]);
    expect(notifications.listRecent(owner, 5)).toEqual([]);
    expect(worker.cancel(id)).toBe(false);
  });

  it("runs the cleanup hook when a task is cancelled before it starts", () => {
    const canceled: string[] = [];
    const { tasks, worker } = setup([
      handler("minuta.draft", "llm", async () => ({ greeting: "ok" }), {
        onCanceled: (payload: { name: string }) => canceled.push(payload.name),
      }),
    ]);
    const id = enqueue(tasks, "Bruno");
    expect(worker.cancel(id)).toBe(true);
    expect(canceled).toEqual(["Bruno"]);
    expect(worker.fill()).toBe(0);
  });

  it("fails tasks with an unknown kind or an invalid payload instead of crashing", async () => {
    const { tasks, worker } = setup([handler("minuta.draft", "llm", async () => ({ greeting: "ok" }))]);
    const unknown = enqueue(tasks, "x", "style.capture");
    const invalid = tasks.create({ ownerId: owner, kind: "minuta.draft", lane: "llm", title: "Inválida", payload: { nome: 1 } });

    await worker.tick();
    expect(tasks.get(unknown, owner)!.status).toBe("failed");
    expect(tasks.get(invalid, owner)!.status).toBe("failed");
  });
});

describe("notification repository", () => {
  let notifications: NotificationRepository;
  let other: string;

  beforeEach(() => {
    const db = openTestDatabase();
    other = insertTestUser(db, "bruno");
    notifications = createNotificationRepository(db);
  });

  it("lists notifications after a cursor, counts unread ones and marks them read", () => {
    expect(notifications.latestId(owner)).toBe(0);
    const first = notifications.create({ ownerId: owner, level: "success", title: "A", body: "", href: null, taskId: null });
    const second = notifications.create({ ownerId: owner, level: "error", title: "B", body: "falhou", href: "/x", taskId: null });

    expect(notifications.listSince(owner, first.id, 10).map((item) => item.title)).toEqual(["B"]);
    expect(notifications.listRecent(owner, 10).map((item) => item.title)).toEqual(["B", "A"]);
    expect(notifications.latestId(owner)).toBe(second.id);
    expect(notifications.unreadCount(owner)).toBe(2);
    expect(notifications.markRead(owner, [first.id], START)).toBe(1);
    expect(notifications.unreadCount(owner)).toBe(1);
    expect(notifications.markAllRead(owner, START)).toBe(1);
    expect(notifications.unreadCount(owner)).toBe(0);
  });

  it("shows each user only their own notifications", () => {
    const mine = notifications.create({ ownerId: owner, level: "success", title: "A", body: "", href: null, taskId: null });

    expect(notifications.listRecent(other, 10)).toEqual([]);
    expect(notifications.listSince(other, 0, 10)).toEqual([]);
    expect(notifications.latestId(other)).toBe(0);
    expect(notifications.markRead(other, [mine.id], START)).toBe(0);
    expect(notifications.unreadCount(owner)).toBe(1);
  });
});

describe("task ownership", () => {
  it("hides other users' tasks, caps counting per lane and erases the payload once a task succeeds", () => {
    const db = openTestDatabase();
    const tasks = createTaskRepository(db);
    const other = insertTestUser(db, "bruno");
    const id = enqueue(tasks, "Ana");

    expect(tasks.get(id, other)).toBeNull();
    expect(tasks.list({ ownerId: other, limit: 10 })).toEqual([]);
    expect(tasks.countActive(other, "llm")).toBe(0);
    expect(tasks.countActive(owner, "llm")).toBe(1);

    const [claimed] = tasks.claim("llm", 1, START);
    expect(claimed.ownerId).toBe(owner);
    tasks.complete(id, START, () => ({ ok: true }));
    expect(tasks.getPayload(id)?.payload).toEqual({});
  });
});

describe("task success notifications", () => {
  it("keeps a task succeeded and still notifies when describing the success throws", async () => {
    const { tasks, notifications, worker } = setup([
      handler("minuta.draft", "llm", async () => ({ greeting: "ok" }), {
        describeSuccess: () => {
          throw new Error("href quebrado");
        },
      }),
    ]);
    const id = enqueue(tasks, "Ana");

    await worker.tick();
    expect(tasks.get(id, owner)!.status).toBe("succeeded");
    expect(notifications.listRecent(owner, 1)).toMatchObject([{ level: "success", title: "Concluída: Tarefa Ana", taskId: id }]);
  });
});

describe("shared LLM slots", () => {
  it("claims llm tasks only into slots the pool grants and frees them when tasks end", async () => {
    const db = openTestDatabase();
    const tasks = createTaskRepository(db);
    const slots = createSlotPool(2);
    const worker = createTaskWorker({
      tasks,
      handlers: [handler("minuta.draft", "llm", async () => ({ greeting: "ok" }))],
      isRetryable: () => false,
      describeError: () => "erro",
      notify: () => {},
      sharedSlots: { llm: slots },
      now: () => START,
    });
    ["a", "b", "c"].forEach((name) => enqueue(tasks, name));
    slots.tryAcquire(1); // a batch item holds one slot

    expect(worker.fill()).toBe(1);
    await worker.drain();
    expect(slots.available()).toBe(1);
    expect(tasks.countDue("llm", START)).toBe(2);
  });
});
