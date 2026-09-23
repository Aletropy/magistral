import type { DraftResult } from "@/lib/http/api";
import type { MinutaRequest } from "@/lib/minuta/schema";

export interface MinutaSummary {
  id: string;
  title: string;
  personaName: string;
  documentTypeLabel: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedMinuta extends MinutaSummary {
  request: MinutaRequest;
  result: DraftResult;
}

export interface NewMinuta {
  title: string;
  personaName: string;
  documentTypeLabel: string;
  request: MinutaRequest;
  result: DraftResult;
}
