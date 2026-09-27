import { beforeEach, describe, expect, it, vi } from "vitest";
import { insertTestUser } from "@/lib/auth/testHelpers";
import { IN_MEMORY_DATABASE, openDatabase } from "@/lib/db/openDatabase";
import type { MinutaRequest } from "@/lib/minuta/schema";
import { createBatchRepository, type BatchRepository } from "./repository";
import type { ClaimedBatchItem } from "./types";
import { retryDelayMs } from "@/lib/queue/retryPolicy";
import { createSlotPool } from "@/lib/queue/slotPool";
import { BATCH_MAX_ATTEMPTS, INTERRUPTED_ITEM_MESSAGE, createBatchWorker } from "./worker";

const TEMPLATE: MinutaRequest = {
  documentType: "outro",
  customDocumentType: "Notificação",
  parties: [
    { name: "{{nome}}", role: "Notificado", qualification: "" },
    { name: "Município", role: "Notificante", qualification: "" },
  ],
  clauses: "",
  persona: "agressivo",
  useLibrary: false,
  approvedClauseIds: [],
  baseDocument: null,
};
const ROWS = ["Ana", "Bruno", "Carla"].map((nome) => ({ label: nome, row: { nome } }));
/** Just after "now": new items become due at their creation time. */
const START = new Date(Date.now() + 1000);

class TransientError extends Error {}

function setup(processItem: (item: ClaimedBatchItem) => Promise<string>, now = () => START) {
  const db = openDatabase(IN_MEMORY_DATABASE);
  const owner = insertTestUser(db);
  const batches = createBatchRepository(db);
  const jobId = batches.createJob(owner, "Notificações IPTU", TEMPLATE, ROWS);
  const worker = createBatchWorker({
    batches,
    processItem,
    isRetryable: (error) => error instanceof TransientError,
    describeError: (error) => (error instanceof Error ? error.message : "erro"),
    concurrency: 2,
    now,
  });
  return { batches, jobId, worker, owner };
}

describe("batch repository", () => {
  let batches: BatchRepository;
  let owner: string;

  beforeEach(() => {
    const db = openDatabase(IN_MEMORY_DATABASE);
    owner = insertTestUser(db);
    batches = createBatchRepository(db);
  });

  it("creates a job with one pending item per row and summarizes it", () => {
    const id = batches.createJob(owner, "Lote", TEMPLATE, ROWS);
    const job = batches.getJob(id, owner)!;

    expect(job).toMatchObject({ name: "Lote", total: 3, counts: { pending: 3, running: 0, done: 0, failed: 0 } });
    expect(job.template).toEqual(TEMPLATE);
    expect(job.items.map((item) => [item.position, item.label])).toEqual([[1, "Ana"], [2, "Bruno"], [3, "Carla"]]);
    expect(batches.listJobs(owner)).toHaveLength(1);
  });

  it("claims items atomically so a second claim gets the rest", () => {
    batches.createJob(owner, "Lote", TEMPLATE, ROWS);
    const first = batches.claimItems(2, START);
    const second = batches.claimItems(2, START);

    expect(first.map((item) => item.row.nome)).toEqual(["Ana", "Bruno"]);
    expect(second.map((item) => item.row.nome)).toEqual(["Carla"]);
    expect(first[0]).toMatchObject({ attempts: 1, template: TEMPLATE });
  });

  it("deleting a job removes its items", () => {
    const id = batches.createJob(owner, "Lote", TEMPLATE, ROWS);
    expect(batches.deleteJob(id, owner)).toBe(true);
    expect(batches.claimItems(10, START)).toEqual([]);
  });
});

describe("createBatchWorker", () => {
  it("drafts every item, respecting the concurrency limit", async () => {
    const { batches, jobId, worker, owner } = setup(async (item) => `# Notificação para ${item.row.nome}`);

    expect(await worker.tick()).toBe(2);
    expect(await worker.tick()).toBe(1);
    expect(await worker.tick()).toBe(0);

    expect(batches.getJob(jobId, owner)!.counts).toEqual({ pending: 0, running: 0, done: 3, failed: 0 });
    expect(batches.finishedItems(jobId).map((item) => item.markdown)).toEqual([
      "# Notificação para Ana",
      "# Notificação para Bruno",
      "# Notificação para Carla",
    ]);
  });

  it("retries transient failures after the backoff, and fails permanent ones at once", async () => {
    let clock = START;
    const attemptsByName = new Map<string, number>();
    const { batches, jobId, worker, owner } = setup(async (item) => {
      const name = item.row.nome;
      attemptsByName.set(name, (attemptsByName.get(name) ?? 0) + 1);
      if (name === "Ana" && attemptsByName.get(name) === 1) throw new TransientError("Muitas solicitações");
      if (name === "Bruno") throw new Error("Personalidade não encontrada.");
      return "# ok";
    }, () => clock);

    await worker.tick();
    const waiting = batches.getJob(jobId, owner)!.items.find((item) => item.label === "Ana")!;
    expect(waiting).toMatchObject({ status: "pending", error: "Muitas solicitações", attempts: 1 });
    expect(batches.getJob(jobId, owner)!.items.find((item) => item.label === "Bruno")).toMatchObject({
      status: "failed",
      error: "Personalidade não encontrada.",
    });

    await worker.tick(); // Carla; Ana is not due yet
    expect(attemptsByName.get("Ana")).toBe(1);

    clock = new Date(START.getTime() + retryDelayMs(1));
    await worker.tick();
    expect(batches.getJob(jobId, owner)!.counts).toEqual({ pending: 0, running: 0, done: 2, failed: 1 });
  });

  it("gives up after the maximum number of attempts", async () => {
    let clock = START;
    const { batches, jobId, worker, owner } = setup(async () => {
      throw new TransientError("Serviço indisponível");
    }, () => clock);

    for (let attempt = 1; attempt <= BATCH_MAX_ATTEMPTS; attempt++) {
      await worker.tick();
      await worker.tick();
      clock = new Date(clock.getTime() + retryDelayMs(attempt));
    }
    expect(batches.getJob(jobId, owner)!.counts.failed).toBe(3);
    expect(batches.getJob(jobId, owner)!.items.every((item) => item.attempts === BATCH_MAX_ATTEMPTS)).toBe(true);

    expect(batches.retryFailedItems(jobId, clock)).toBe(3);
    expect(batches.getJob(jobId, owner)!.items[0]).toMatchObject({ status: "pending", attempts: 0, error: null });
    expect(batches.claimItems(3, clock)).toHaveLength(3);
  });

  it("on start, requeues items a crashed process left running and finishes the whole job", async () => {
    const { batches, jobId, worker, owner } = setup(vi.fn(async () => "# ok"));
    batches.claimItems(2, START);
    expect(batches.getJob(jobId, owner)!.counts.running).toBe(2);

    worker.start();
    await vi.waitFor(() => expect(batches.getJob(jobId, owner)!.counts.done).toBe(3));
    worker.stop();
  });

  it("reports a finished job exactly once, and again after its failed items are retried", async () => {
    const finished: string[] = [];
    const db = openDatabase(IN_MEMORY_DATABASE);
    const owner = insertTestUser(db);
    const batches = createBatchRepository(db);
    const jobId = batches.createJob(owner, "Lote", TEMPLATE, ROWS);
    let fail = true;
    const worker = createBatchWorker({
      batches,
      processItem: async (item) => {
        if (fail && item.row.nome === "Carla") throw new Error("inválido");
        return "# ok";
      },
      isRetryable: () => false,
      describeError: () => "erro",
      onJobFinished: (job) => finished.push(`${job.counts.done}/${job.counts.failed}`),
      concurrency: 2,
      now: () => START,
    });

    await worker.tick();
    expect(finished).toEqual([]);
    await worker.tick();
    expect(finished).toEqual(["2/1"]);

    fail = false;
    batches.retryFailedItems(jobId, START);
    await worker.tick();
    expect(finished).toEqual(["2/1", "3/0"]);
  });

  it("aborts the items of a deleted job that are being drafted, releasing their slots", async () => {
    const slots = createSlotPool(2);
    const db = openDatabase(IN_MEMORY_DATABASE);
    const owner = insertTestUser(db);
    const batches = createBatchRepository(db);
    const jobId = batches.createJob(owner, "Lote", TEMPLATE, ROWS);
    const started: string[] = [];
    const worker = createBatchWorker({
      batches,
      slots,
      processItem: (item, signal) =>
        new Promise((_resolve, reject) => {
          started.push(item.row.nome);
          signal.addEventListener("abort", () => reject(signal.reason));
        }),
      isRetryable: () => true,
      describeError: () => "erro",
      now: () => START,
    });

    const wave = worker.tick();
    await vi.waitFor(() => expect(started).toHaveLength(2));
    expect(slots.available()).toBe(0);
    batches.deleteJob(jobId, owner);
    expect(worker.cancelJob(jobId)).toBe(2);
    await expect(wave).resolves.toBe(2);
    expect(slots.available()).toBe(2);
    expect(batches.claimItems(10, START)).toEqual([]);
  });

  it("shares LLM slots with other work and yields to waiting interactive tasks", async () => {
    const slots = createSlotPool(2);
    let yieldToTasks = true;
    const db = openDatabase(IN_MEMORY_DATABASE);
    const owner = insertTestUser(db);
    const batches = createBatchRepository(db);
    const jobId = batches.createJob(owner, "Lote", TEMPLATE, ROWS);
    const worker = createBatchWorker({
      batches,
      slots,
      shouldYield: () => yieldToTasks,
      processItem: async () => "# ok",
      isRetryable: () => false,
      describeError: () => "erro",
      now: () => START,
    });

    expect(await worker.tick()).toBe(0);
    yieldToTasks = false;
    slots.tryAcquire(1); // a background task holds one slot
    expect(await worker.tick()).toBe(1);
    expect(batches.getJob(jobId, owner)!.counts.done).toBe(1);
    expect(slots.available()).toBe(1);
  });

  it("on restart, fails items that were running with no attempts left instead of looping on them", () => {
    const db = openDatabase(IN_MEMORY_DATABASE);
    const owner = insertTestUser(db);
    const batches = createBatchRepository(db);
    const jobId = batches.createJob(owner, "Lote", TEMPLATE, ROWS);
    batches.claimItems(2, START);
    db.prepare("UPDATE batch_items SET attempts = ? WHERE position = 1").run(BATCH_MAX_ATTEMPTS);

    expect(batches.resetRunningItems(BATCH_MAX_ATTEMPTS, INTERRUPTED_ITEM_MESSAGE)).toBe(2);
    const items = batches.getJob(jobId, owner)!.items;
    expect(items[0]).toMatchObject({ status: "failed", error: INTERRUPTED_ITEM_MESSAGE });
    expect(items[1].status).toBe("pending");
  });

  it("ignores the result of an item whose job was deleted mid-flight", async () => {
    const { batches, jobId, worker, owner } = setup(async () => {
      batches.deleteJob(jobId, owner);
      return "# tarde demais";
    });
    await expect(worker.tick()).resolves.toBe(2);
    expect(batches.getJob(jobId, owner)).toBeNull();
  });
});
