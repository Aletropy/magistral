"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CLAUSES_PATH } from "@/lib/clauses/paths";
import { MAX_APPROVED_CLAUSES } from "@/lib/clauses/schema";
import { clauseAppliesTo, type Clause } from "@/lib/clauses/types";
import type { DocumentTypeId } from "@/lib/minuta/documentTypes";

/** A fixed id keeps dnd-kit's accessibility ids identical on the server and the client. */
const DND_CONTEXT_ID = "approved-clauses";

export type ClauseOption = Pick<Clause, "id" | "title" | "category" | "documentTypes" | "body">;

interface ApprovedClausesFieldProps {
  clauses: ClauseOption[];
  documentType: DocumentTypeId;
  value: string[];
  error?: string;
  disabled: boolean;
  onChange: (clauseIds: string[]) => void;
}

function SortableClause({
  clause,
  position,
  disabled,
  onRemove,
}: {
  clause: ClauseOption;
  position: number;
  disabled: boolean;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: clause.id,
    disabled,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-sm data-[dragging=true]:z-10 data-[dragging=true]:shadow-md"
      data-dragging={isDragging}
    >
      <button
        type="button"
        className="cursor-grab touch-none rounded px-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label={`Reordenar “${clause.title}” (espaço para pegar, setas para mover)`}
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <span className="w-5 text-right tabular-nums text-muted-foreground">{position}.</span>
      <span className="flex-1 truncate" title={clause.body}>
        {clause.title}
      </span>
      <Button type="button" variant="ghost" size="xs" disabled={disabled} onClick={onRemove}>
        Remover
      </Button>
    </li>
  );
}

/** Pick pre-approved clauses for the document type and order them by drag and drop (mouse, touch or keyboard). */
export function ApprovedClausesField({ clauses, documentType, value, error, disabled, onChange }: ApprovedClausesFieldProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const byId = new Map(clauses.map((clause) => [clause.id, clause]));
  const selected = value.flatMap((id) => byId.get(id) ?? []);
  const available = clauses.filter((clause) => !value.includes(clause.id) && clauseAppliesTo(clause, documentType));
  const isFull = value.length >= MAX_APPROVED_CLAUSES;

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    onChange(arrayMove(value, value.indexOf(String(active.id)), value.indexOf(String(over.id))));
  }

  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="mb-1 flex w-full items-baseline justify-between text-sm font-medium">
        Cláusulas aprovadas (opcional)
        <Link href={CLAUSES_PATH} className="text-xs font-normal text-primary hover:underline">
          Gerenciar cláusulas
        </Link>
      </legend>
      <p className="-mt-1 text-xs text-muted-foreground">
        Entram na minuta na ordem abaixo, com o conteúdo preservado; a IA só ajusta o tom.
      </p>

      {selected.length > 0 && (
        <DndContext id={DND_CONTEXT_ID} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={value} strategy={verticalListSortingStrategy}>
            <ol className="flex flex-col gap-1.5">
              {selected.map((clause, index) => (
                <SortableClause
                  key={clause.id}
                  clause={clause}
                  position={index + 1}
                  disabled={disabled}
                  onRemove={() => onChange(value.filter((id) => id !== clause.id))}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      {clauses.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhuma cláusula cadastrada.{" "}
          <Link href={CLAUSES_PATH} className="text-primary hover:underline">
            Crie a primeira
          </Link>
          .
        </p>
      ) : (
        available.length > 0 && (
          <details className="rounded-md border bg-card px-3 py-2">
            <summary className="cursor-pointer text-sm">Adicionar cláusula ({available.length} disponíveis)</summary>
            <ul className="mt-2 flex flex-col gap-1">
              {available.map((clause) => (
                <li key={clause.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate" title={clause.body}>
                    {clause.title}
                    {clause.category && <span className="text-muted-foreground"> · {clause.category}</span>}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    disabled={isFull}
                    onClick={() => onChange([...value, clause.id])}
                  >
                    Adicionar
                  </Button>
                </li>
              ))}
            </ul>
          </details>
        )
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </fieldset>
  );
}
