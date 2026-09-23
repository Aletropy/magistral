"use client";

import { SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
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
          <button
            key={format}
            type="button"
            className={SECONDARY_BUTTON_CLASS}
            disabled={pendingFormat !== null}
            onClick={() => download(markdown, format, buildFileName(blocks, format))}
          >
            {pendingFormat === format ? "Gerando…" : `Baixar ${EXPORT_FORMAT_INFO[format].label}`}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
