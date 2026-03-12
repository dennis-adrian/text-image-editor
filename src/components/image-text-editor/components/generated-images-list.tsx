"use client";

import React, { useMemo } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GeneratedImagesListProps {
  generatedImages: HTMLCanvasElement[];
  textArray: string[];
  isGenerating: boolean;
  totalCount: number;
  onDownloadSingle: (
    canvas: HTMLCanvasElement,
    index: number,
    text: string,
  ) => void;
}

export const GeneratedImagesList = React.memo(function GeneratedImagesList({
  generatedImages,
  textArray,
  isGenerating,
  totalCount,
  onDownloadSingle,
}: GeneratedImagesListProps) {
  const dataUrls = useMemo(
    () => generatedImages.map((canvas) => canvas.toDataURL("image/png")),
    [generatedImages],
  );

  if (generatedImages.length === 0 && !isGenerating) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-muted-foreground">
          Generated Images
        </p>
        {isGenerating && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>
              {generatedImages.length} / {totalCount}
            </span>
          </div>
        )}
      </div>

      <div className="max-h-[500px] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          {generatedImages.map((canvas, index) => (
            <div key={index} className="space-y-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={dataUrls[index] || "/placeholder.svg"}
                alt={`Preview ${index + 1}`}
                className="w-full h-auto border border-border rounded"
              />
              <div className="flex items-center gap-1">
                <p className="text-xs text-muted-foreground truncate flex-1">
                  {index + 1}. {textArray[index]}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 shrink-0"
                  onClick={() =>
                    onDownloadSingle(canvas, index, textArray[index])
                  }
                >
                  <Download className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
