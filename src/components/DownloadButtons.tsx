"use client";

import { Button } from "@/components/ui/button";
import { useFileDownload } from "@/hooks/useFileDownload";
import { EXPORT_FORMATS, EXPORT_FORMAT_INFO, buildFileName } from "@/lib/export/formats";
import type { DocumentBlock } from "@/lib/markdown/types";

interface DownloadButtonsProps {
  markdown: string;
  blocks: DocumentBlock[];
}

export function DownloadButtons({ markdown, blocks }: DownloadButtonsProps) {
  const { pendingFormat, error, download } = useFileDownload();

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {EXPORT_FORMATS.map((format) => (
          <Button
            key={format}
            type="button"
            variant="outline"
            disabled={pendingFormat !== null}
            onClick={() => download(markdown, format, buildFileName(blocks, format))}
          >
            {pendingFormat === format ? "Gerando…" : `Baixar ${EXPORT_FORMAT_INFO[format].label}`}
          </Button>
        ))}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
