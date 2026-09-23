import { beforeEach, describe, expect, it, vi } from "vitest";
import { IN_MEMORY_DATABASE, openDatabase } from "@/lib/db/openDatabase";
import type { MinutaRequest } from "@/lib/minuta/schema";
import { createBatchRepository, type BatchRepository } from "./repository";
import type { ClaimedBatchItem } from "./types";
import { retryDelayMs } from "@/lib/queue/retryPolicy";
import { BATCH_MAX_ATTEMPTS, createBatchWorker } from "./worker";

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
};
const ROWS = ["Ana", "Bruno", "Carla"].map((nome) => ({ label: nome, row: { nome } }));
/** Just after "now": new items become due at their creation time. */
const START = new Date(Date.now() + 1000);

class TransientError extends Error {}

function setup(processItem: (item: ClaimedBatchItem) => Promise<string>, now = () => START) {
  const batches = createBatchRepository(openDatabase(IN_MEMORY_DATABASE));
  const jobId = batches.createJob("Notificações IPTU", TEMPLATE, ROWS);
  const worker = createBatchWorker({
    batches,
    processItem,
    isRetryable: (error) => error instanceof TransientError,
    describeError: (error) => (error instanceof Error ? error.message : "erro"),
    concurrency: 2,
    now,
  });
  return { batches, jobId, worker };
}

describe("batch repository", () => {
  let batches: BatchRepository;

  beforeEach(() => {
    batches = createBatchRepository(openDatabase(IN_MEMORY_DATABASE));
  });

  it("creates a job with one pending item per row and summarizes it", () => {
    const id = batches.createJob("Lote", TEMPLATE, ROWS);
    const job = batches.getJob(id)!;

    expect(job).toMatchObject({ name: "Lote", total: 3, counts: { pending: 3, running: 0, done: 0, failed: 0 } });
    expect(job.template).toEqual(TEMPLATE);
    expect(job.items.map((item) => [item.position, item.label])).toEqual([[1, "Ana"], [2, "Bruno"], [3, "Carla"]]);
    expect(batches.listJobs()).toHaveLength(1);
  });

  it("claims items atomically so a second claim gets the rest", () => {
    batches.createJob("Lote", TEMPLATE, ROWS);
    const first = batches.claimItems(2, START);
    const second = batches.claimItems(2, START);

    expect(first.map((item) => item.row.nome)).toEqual(["Ana", "Bruno"]);
    expect(second.map((item) => item.row.nome)).toEqual(["Carla"]);
    expect(first[0]).toMatchObject({ attempts: 1, template: TEMPLATE });
  });

  it("deleting a job removes its items", () => {
    const id = batches.createJob("Lote", TEMPLATE, ROWS);
    expect(batches.deleteJob(id)).toBe(true);
    expect(batches.claimItems(10, START)).toEqual([]);
  });
});

describe("createBatchWorker", () => {
  it("drafts every item, respecting the concurrency limit", async () => {
    const { batches, jobId, worker } = setup(async (item) => `# Notificação para ${item.row.nome}`);

    expect(await worker.tick()).toBe(2);
    expect(await worker.tick()).toBe(1);
    expect(await worker.tick()).toBe(0);

    expect(batches.getJob(jobId)!.counts).toEqual({ pending: 0, running: 0, done: 3, failed: 0 });
    expect(batches.finishedItems(jobId).map((item) => item.markdown)).toEqual([
      "# Notificação para Ana",
      "# Notificação para Bruno",
      "# Notificação para Carla",
    ]);
  });

  it("retries transient failures after the backoff, and fails permanent ones at once", async () => {
    let clock = START;
    const attemptsByName = new Map<string, number>();
    const { batches, jobId, worker } = setup(async (item) => {
      const name = item.row.nome;
      attemptsByName.set(name, (attemptsByName.get(name) ?? 0) + 1);
      if (name === "Ana" && attemptsByName.get(name) === 1) throw new TransientError("Muitas solicitações");
      if (name === "Bruno") throw new Error("Personalidade não encontrada.");
      return "# ok";
    }, () => clock);

    await worker.tick();
    const waiting = batches.getJob(jobId)!.items.find((item) => item.label === "Ana")!;
    expect(waiting).toMatchObject({ status: "pending", error: "Muitas solicitações", attempts: 1 });
    expect(batches.getJob(jobId)!.items.find((item) => item.label === "Bruno")).toMatchObject({
      status: "failed",
      error: "Personalidade não encontrada.",
    });

    await worker.tick(); // Carla; Ana is not due yet
    expect(attemptsByName.get("Ana")).toBe(1);

    clock = new Date(START.getTime() + retryDelayMs(1));
    await worker.tick();
    expect(batches.getJob(jobId)!.counts).toEqual({ pending: 0, running: 0, done: 2, failed: 1 });
  });

  it("gives up after the maximum number of attempts", async () => {
    let clock = START;
    const { batches, jobId, worker } = setup(async () => {
      throw new TransientError("Serviço indisponível");
    }, () => clock);

    for (let attempt = 1; attempt <= BATCH_MAX_ATTEMPTS; attempt++) {
      await worker.tick();
      await worker.tick();
      clock = new Date(clock.getTime() + retryDelayMs(attempt));
    }
    expect(batches.getJob(jobId)!.counts.failed).toBe(3);
    expect(batches.getJob(jobId)!.items.every((item) => item.attempts === BATCH_MAX_ATTEMPTS)).toBe(true);

    expect(batches.retryFailedItems(jobId, clock)).toBe(3);
    expect(batches.getJob(jobId)!.items[0]).toMatchObject({ status: "pending", attempts: 0, error: null });
    expect(batches.claimItems(3, clock)).toHaveLength(3);
  });

  it("on start, requeues items a crashed process left running and finishes the whole job", async () => {
    const { batches, jobId, worker } = setup(vi.fn(async () => "# ok"));
    batches.claimItems(2, START);
    expect(batches.getJob(jobId)!.counts.running).toBe(2);

    worker.start();
    await vi.waitFor(() => expect(batches.getJob(jobId)!.counts.done).toBe(3));
    worker.stop();
  });

  it("reports a finished job exactly once, and again after its failed items are retried", async () => {
    const finished: string[] = [];
    const batches = createBatchRepository(openDatabase(IN_MEMORY_DATABASE));
    const jobId = batches.createJob("Lote", TEMPLATE, ROWS);
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

  it("ignores the result of an item whose job was deleted mid-flight", async () => {
    const { batches, jobId, worker } = setup(async () => {
      batches.deleteJob(jobId);
      return "# tarde demais";
    });
    await expect(worker.tick()).resolves.toBe(2);
    expect(batches.getJob(jobId)).toBeNull();
  });
});
