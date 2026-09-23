"use client";

import { useId, useState, type ChangeEvent } from "react";
import { buttonVariants } from "@/components/ui/button";
import { plural } from "@/lib/text/plural";
import { cn } from "@/lib/utils";

interface FileInputProps {
  /** Lets a surrounding FormField label point at the input; generated when omitted. */
  id?: string;
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  /** Accessible name when there is no visible label pointing at the input. */
  ariaLabel?: string;
  onFiles: (files: File[]) => void;
}

function describeSelection(files: File[]): string {
  if (files.length === 0) return "Nenhum arquivo selecionado";
  if (files.length === 1) return files[0].name;
  return plural(files.length, "arquivo selecionado", "arquivos selecionados");
}

/** A file picker with pt-BR text on every browser (the native one follows the browser's language). */
export function FileInput({ id, accept, multiple = false, disabled = false, ariaLabel, onFiles }: FileInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [files, setFiles] = useState<File[]>([]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const chosen = [...(event.target.files ?? [])];
    setFiles(chosen);
    onFiles(chosen);
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-3">
      <input
        id={inputId}
        type="file"
        className="peer sr-only"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={handleChange}
      />
      <label
        htmlFor={inputId}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "cursor-pointer peer-focus-visible:border-ring peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
          "peer-disabled:pointer-events-none peer-disabled:opacity-50",
        )}
      >
        {multiple ? "Escolher arquivos" : "Escolher arquivo"}
      </label>
      <span className="min-w-0 truncate text-sm text-muted-foreground">{describeSelection(files)}</span>
    </div>
  );
}
