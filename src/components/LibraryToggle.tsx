"use client";

import Link from "next/link";
import { LIBRARY_PATH } from "@/lib/rag/paths";

interface LibraryToggleProps {
  checked: boolean;
  sourceCount: number;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}

export function LibraryToggle({ checked, sourceCount, disabled, onChange }: LibraryToggleProps) {
  const isEmpty = sourceCount === 0;

  return (
    <label className="flex cursor-pointer gap-3 rounded-lg border bg-card p-3 has-disabled:cursor-not-allowed has-disabled:opacity-70">
      <input
        type="checkbox"
        className="mt-1 accent-primary"
        checked={checked && !isEmpty}
        disabled={disabled || isEmpty}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="flex flex-col">
        <span className="text-sm font-semibold">Fundamentar com a biblioteca jurídica</span>
        <span className="text-xs text-muted-foreground">
          {isEmpty ? (
            <>
              Nenhum documento ainda.{" "}
              <Link href={LIBRARY_PATH} className="text-primary hover:underline">
                Adicione leis, decretos ou pareceres
              </Link>
              .
            </>
          ) : (
            `A IA cita apenas normas dos ${sourceCount} documento(s) da biblioteca local, sem inventar leis.`
          )}
        </span>
      </span>
    </label>
  );
}
