import { getBatchRepository } from "@/lib/batch/getBatchRepository";
import { ensureBatchWorkerStarted } from "@/lib/batch/getBatchWorker";
import { MAX_BATCH_BODY_BYTES, batchRequestSchema } from "@/lib/batch/schema";
import { fillRequestTemplate, rowLabel } from "@/lib/batch/template";
import { publishActivity } from "@/lib/events/activityEvents";
import type { BatchCreatedResponseBody } from "@/lib/http/contracts";
import { defineRoute } from "@/lib/http/route";
import { HTTP_CREATED } from "@/lib/http/status";

const MAX_LABEL_CHARS = 120;

export const POST = defineRoute(
  { body: batchRequestSchema, maxBodyBytes: MAX_BATCH_BODY_BYTES },
  ({ user, body: { name, template, rows } }) => {
    const id = getBatchRepository().createJob(
      user.id,
      name,
      template,
      rows.map((row) => ({
        label: rowLabel(template, fillRequestTemplate(template, row)).slice(0, MAX_LABEL_CHARS),
        row,
      })),
    );
    ensureBatchWorkerStarted().wake();
    publishActivity(user.id);
    return Response.json({ id } satisfies BatchCreatedResponseBody, { status: HTTP_CREATED });
  },
);
