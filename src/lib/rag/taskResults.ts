import { z } from "zod";

/** Results of the library's background tasks, parsed on the client from the task's stored JSON. */

export const LIBRARY_UPLOAD_STATUSES = ["added", "duplicate", "failed"] as const;
export type LibraryUploadStatus = (typeof LIBRARY_UPLOAD_STATUSES)[number];

export const libraryUploadOutcomeSchema = z.object({
  fileName: z.string(),
  status: z.enum(LIBRARY_UPLOAD_STATUSES),
  /** Why the file was skipped or failed, in pt-BR. */
  message: z.string().optional(),
});
export type LibraryUploadOutcome = z.infer<typeof libraryUploadOutcomeSchema>;

export const libraryUploadResultSchema = z.object({ outcomes: z.array(libraryUploadOutcomeSchema) });
export type LibraryUploadResult = z.infer<typeof libraryUploadResultSchema>;

export const folderSyncReportSchema = z.object({
  added: z.array(z.string()),
  updated: z.array(z.string()),
  removed: z.array(z.string()),
  unchanged: z.number(),
  /** Files whose content is already in the library under another name. */
  duplicates: z.array(z.string()),
  failed: z.array(z.object({ path: z.string(), message: z.string() })),
});
export type FolderSyncReport = z.infer<typeof folderSyncReportSchema>;

export const librarySyncResultSchema = z.object({ folder: z.string(), report: folderSyncReportSchema });
export type LibrarySyncResult = z.infer<typeof librarySyncResultSchema>;

export const libraryReindexResultSchema = z.object({ chunks: z.number(), model: z.string() });
export type LibraryReindexResult = z.infer<typeof libraryReindexResultSchema>;

export const demoLibraryResultSchema = z.object({ added: z.number() });
export type DemoLibraryResult = z.infer<typeof demoLibraryResultSchema>;
