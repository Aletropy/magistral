"use client";

import { useState, type KeyboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { normalizeForMatch } from "@/lib/text/normalizeForMatch";

const SEPARATOR_KEYS = new Set(["Enter", ","]);

interface TagInputProps {
  id: string;
  tags: string[];
  maxTags: number;
  maxTagChars: number;
  placeholder?: string;
  disabled: boolean;
  invalid?: boolean;
  onChange: (tags: string[]) => void;
}

/** Free-text tags: Enter or comma adds, × or Backspace on an empty field removes. Duplicates ignore case and accents. */
export function TagInput({ id, tags, maxTags, maxTagChars, placeholder, disabled, invalid, onChange }: TagInputProps) {
  const [draft, setDraft] = useState("");

  function addDraft() {
    const tag = draft.trim();
    setDraft("");
    if (!tag || tags.length >= maxTags) return;
    const key = normalizeForMatch(tag);
    if (tags.some((existing) => normalizeForMatch(existing) === key)) return;
    onChange([...tags, tag]);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (SEPARATOR_KEYS.has(event.key)) {
      event.preventDefault();
      addDraft();
    } else if (event.key === "Backspace" && !draft && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Termos adicionados">
          {tags.map((tag) => (
            <li key={tag}>
              <Badge variant="secondary" className="gap-1 pr-1">
                {tag}
                <button
                  type="button"
                  className="rounded px-1 text-muted-foreground hover:text-destructive"
                  aria-label={`Remover “${tag}”`}
                  disabled={disabled}
                  onClick={() => onChange(tags.filter((existing) => existing !== tag))}
                >
                  ×
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
      <Input
        id={id}
        value={draft}
        maxLength={maxTagChars}
        placeholder={tags.length >= maxTags ? `Limite de ${maxTags} termos atingido` : placeholder}
        disabled={disabled || tags.length >= maxTags}
        aria-invalid={invalid}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addDraft}
      />
    </div>
  );
}
