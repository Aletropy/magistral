"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface EditableListProps {
  legend: string;
  hint: string;
  items: string[];
  maxItems: number;
  addLabel: string;
  errors: Record<string, string>;
  /** Field path prefix used by the error map, e.g. "toneParameters". */
  errorPath: string;
  disabled: boolean;
  onChange: (items: string[]) => void;
  renderItem: (props: {
    id: string;
    value: string;
    invalid: boolean;
    onChange: (value: string) => void;
  }) => ReactNode;
}

/** A growable list of text inputs with per-item removal and error display. */
export function EditableList({
  legend,
  hint,
  items,
  maxItems,
  addLabel,
  errors,
  errorPath,
  disabled,
  onChange,
  renderItem,
}: EditableListProps) {
  function update(index: number, value: string) {
    onChange(items.map((item, i) => (i === index ? value : item)));
  }

  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="mb-1 text-sm font-medium">{legend}</legend>
      <p className="-mt-1 text-xs text-muted-foreground">{hint}</p>
      {items.map((item, index) => {
        const error = errors[`${errorPath}.${index}`];
        return (
          <div key={index} className="flex flex-col gap-1">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                {renderItem({
                  id: `${errorPath}-${index}`,
                  value: item,
                  invalid: Boolean(error),
                  onChange: (value) => update(index, value),
                })}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remover item ${index + 1}`}
                onClick={() => onChange(items.filter((_, i) => i !== index))}
              >
                Remover
              </Button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );
      })}
      {errors[errorPath] && <p className="text-xs text-destructive">{errors[errorPath]}</p>}
      <Button
        type="button"
        variant="outline"
        className="self-start"
        disabled={items.length >= maxItems}
        onClick={() => onChange([...items, ""])}
      >
        {addLabel}
      </Button>
    </fieldset>
  );
}
