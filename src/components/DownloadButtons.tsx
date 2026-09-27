"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFileDownload } from "@/hooks/useFileDownload";
import { EXPORT_FORMATS, EXPORT_FORMAT_INFO, buildFileName } from "@/lib/export/formats";
import type { DocumentBlock } from "@/lib/markdown/types";
import { cn } from "@/lib/utils";

interface DownloadButtonsProps {
  markdown: string;
  blocks: DocumentBlock[];
  /** Stacked full-width buttons, for a side panel. */
  stacked?: boolean;
}

export function DownloadButtons({ markdown, blocks, stacked = false }: DownloadButtonsProps) {
  const { pendingFormat, error, download } = useFileDownload();

  return (
    <div className={cn("flex flex-col gap-1", !stacked && "items-end")}>
      <div className={cn("flex gap-2", stacked && "flex-col")}>
        {EXPORT_FORMATS.map((format) => (
          <Button
            key={format}
            type="button"
            variant="outline"
            className={cn(stacked && "justify-start")}
            disabled={pendingFormat !== null}
            onClick={() => download(markdown, format, buildFileName(blocks, format))}
          >
            <Download aria-hidden />
            {pendingFormat === format ? "Gerando…" : `Baixar ${EXPORT_FORMAT_INFO[format].label}`}
          </Button>
        ))}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
