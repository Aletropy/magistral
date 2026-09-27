import type { MinutaRequest } from "@/lib/minuta/schema";
import type { DraftResult } from "@/lib/minuta/types";

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
  ownerId: string;
  title: string;
  personaName: string;
  documentTypeLabel: string;
  request: MinutaRequest;
  result: DraftResult;
}
