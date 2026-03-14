"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SheetPreview } from "./sheet-preview";
import {
  DEFAULT_PRINT_SETTINGS,
  calculateLayout,
  type PrintSettings,
  type FitMode,
  type PageSizePreset,
  type Orientation,
} from "./types";
import type { PrintImage } from "@/lib/print-store";

interface PrintLayoutProps {
  images: PrintImage[];
}

export function PrintLayout({ images }: PrintLayoutProps) {
  const [settings, setSettings] = useState<PrintSettings>(
    DEFAULT_PRINT_SETTINGS,
  );
  const [pageIndex, setPageIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [uniformMargins, setUniformMargins] = useState(true);

  const layout = calculateLayout(settings, images.length);

  // Clamp pageIndex when layout changes
  const safePageIndex = Math.min(pageIndex, Math.max(0, layout.pageCount - 1));

  const update = useCallback(
    <K extends keyof PrintSettings>(key: K, value: PrintSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      setPageIndex(0);
    },
    [],
  );

  const handleExportPDF = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const { pageW, pageH, imageW, imageH, cols, perPage, pageCount } = layout;

      const pageFormat = [Math.min(pageW, pageH), Math.max(pageW, pageH)] as [
        number,
        number,
      ];
      const pdf = new jsPDF({
        orientation: settings.orientation,
        unit: "mm",
        format: pageFormat,
      });

      for (let pi = 0; pi < pageCount; pi++) {
        if (pi > 0) pdf.addPage(pageFormat, settings.orientation);

        for (let slot = 0; slot < perPage; slot++) {
          const imgIdx = pi * perPage + slot;
          if (imgIdx >= images.length) break;

          const col = slot % cols;
          const row = Math.floor(slot / cols);
          const x = settings.marginLeft + col * (imageW + settings.gutter);
          const y = settings.marginTop + row * (imageH + settings.gutter);

          await placeImage(
            pdf,
            images[imgIdx].dataUrl,
            x,
            y,
            imageW,
            imageH,
            settings.fitMode,
          );

          if (settings.cropMarks) {
            drawCropMarksPDF(pdf, x, y, imageW, imageH);
          }
        }
      }

      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "print-layout.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  if (images.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground mb-4">
          No images to print. Go back and generate some images first.
        </p>
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Editor
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button asChild variant="outline" size="sm">
          <Link href="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Editor
          </Link>
        </Button>
        <h1 className="text-3xl font-bold text-foreground">Print Layout</h1>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Settings Panel */}
        <div className="space-y-4">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Page Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Page size + orientation */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="pageSize-select">Page Size</Label>
                  <Select
                    value={settings.pageSize}
                    onValueChange={(v) =>
                      update("pageSize", v as PageSizePreset)
                    }
                  >
                    <SelectTrigger id="pageSize-select" className="border-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                      <SelectItem value="A3">A3 (297 × 420 mm)</SelectItem>
                      <SelectItem value="Letter">
                        Letter (216 × 279 mm)
                      </SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orientation-select">Orientation</Label>
                  <Select
                    value={settings.orientation}
                    onValueChange={(v) =>
                      update("orientation", v as Orientation)
                    }
                  >
                    <SelectTrigger id="orientation-select" className="border-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">Portrait</SelectItem>
                      <SelectItem value="landscape">Landscape</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Custom dimensions */}
              {settings.pageSize === "custom" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="custom-width-mm">Width (mm)</Label>
                    <Input
                      id="custom-width-mm"
                      type="number"
                      min={50}
                      max={1000}
                      value={settings.customWidth}
                      onChange={(e) => {
                        const next = e.currentTarget.valueAsNumber;

                        if (Number.isFinite(next)) {
                          update("customWidth", next);
                        }
                      }}
                      className="border-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="custom-height-mm">Height (mm)</Label>
                    <Input
                      id="custom-height-mm"
                      type="number"
                      min={50}
                      max={1000}
                      value={settings.customHeight}
                      onChange={(e) => {
                        const next = e.currentTarget.valueAsNumber;

                        if (Number.isFinite(next)) {
                          update("customHeight", next);
                        }
                      }}
                      className="border-2"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <CardTitle>Image Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="image-width-mm">Width (mm)</Label>
                  <Input
                    id="image-width-mm"
                    type="number"
                    min={10}
                    max={1000}
                    step={1}
                    value={settings.imageWidth}
                    onChange={(e) =>
                      update("imageWidth", Number(e.target.value))
                    }
                    className="border-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image-height-mm">Height (mm)</Label>
                  <Input
                    id="image-height-mm"
                    type="number"
                    min={10}
                    max={1000}
                    step={1}
                    value={settings.imageHeight}
                    onChange={(e) =>
                      update("imageHeight", Number(e.target.value))
                    }
                    className="border-2"
                  />
                </div>
              </div>

              <div
                className="space-y-2"
                role="radiogroup"
                aria-labelledby="fit-mode-label"
              >
                <Label id="fit-mode-label">Fit Mode</Label>
                <div className="flex gap-2">
                  {(["fit", "stretch", "crop"] as FitMode[]).map((mode) => (
                    <Button
                      key={mode}
                      type="button"
                      role="radio"
                      aria-checked={settings.fitMode === mode}
                      variant={
                        settings.fitMode === mode ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => update("fitMode", mode)}
                      className="flex-1 capitalize"
                    >
                      {mode}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {settings.fitMode === "fit" &&
                    "Scales image to fit within the box, preserving aspect ratio."}
                  {settings.fitMode === "stretch" &&
                    "Forces image to exact dimensions. May distort."}
                  {settings.fitMode === "crop" &&
                    "Fills the box and crops the excess, preserving aspect ratio."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <CardTitle>Spacing & Marks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="uniform-margins"
                    checked={uniformMargins}
                    onChange={(e) => {
                      setUniformMargins(e.target.checked);
                      if (e.target.checked) {
                        const v = settings.marginTop;
                        setSettings((prev) => ({
                          ...prev,
                          marginRight: v,
                          marginBottom: v,
                          marginLeft: v,
                        }));
                      }
                    }}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <Label htmlFor="uniform-margins" className="cursor-pointer">
                    Same margin on all sides
                  </Label>
                </div>

                {uniformMargins ? (
                  <div className="space-y-2">
                    <Label htmlFor="margin-all-mm">All sides (mm)</Label>
                    <Input
                      id="margin-all-mm"
                      type="number"
                      min={0}
                      max={100}
                      value={settings.marginTop}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setSettings((prev) => ({
                          ...prev,
                          marginTop: v,
                          marginRight: v,
                          marginBottom: v,
                          marginLeft: v,
                        }));
                        setPageIndex(0);
                      }}
                      className="border-2"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {(
                      [
                        "marginTop",
                        "marginRight",
                        "marginBottom",
                        "marginLeft",
                      ] as const
                    ).map((key) => (
                      <div key={key} className="space-y-2">
                        <Label
                          htmlFor={`margin-${key}-mm`}
                          className="capitalize"
                        >
                          {key.replace("margin", "")} (mm)
                        </Label>
                        <Input
                          id={`margin-${key}-mm`}
                          type="number"
                          min={0}
                          max={100}
                          value={settings[key]}
                          onChange={(e) => update(key, Number(e.target.value))}
                          className="border-2"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="gutter-mm">Gutter (mm)</Label>
                <Input
                  id="gutter-mm"
                  type="number"
                  min={0}
                  max={30}
                  value={settings.gutter}
                  onChange={(e) => update("gutter", Number(e.target.value))}
                  className="border-2"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="cropmarks"
                  checked={settings.cropMarks}
                  onChange={(e) => update("cropMarks", e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
                <Label htmlFor="cropmarks" className="cursor-pointer">
                  Include crop marks
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Export button */}
          <Button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="w-full"
            size="lg"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating PDF…
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 mr-2" />
                Export PDF ({layout.pageCount}{" "}
                {layout.pageCount === 1 ? "page" : "pages"})
              </>
            )}
          </Button>
        </div>

        {/* Preview Panel */}
        <div className="space-y-4">
          <Card className="border-2 sticky top-8">
            <CardHeader>
              <CardTitle>Sheet Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">
                  {layout.perPage} images/sheet
                </span>
                {" · "}
                {layout.cols} × {layout.rows} grid
                {" · "}
                {images.length} images total
              </div>

              <SheetPreview
                settings={settings}
                images={images}
                layout={layout}
                pageIndex={safePageIndex}
              />

              {/* Page navigation */}
              {layout.pageCount > 1 && (
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePageIndex === 0}
                    onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                  >
                    ← Prev
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {safePageIndex + 1} of {layout.pageCount}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePageIndex >= layout.pageCount - 1}
                    onClick={() =>
                      setPageIndex((p) => Math.min(layout.pageCount - 1, p + 1))
                    }
                  >
                    Next →
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── PDF helpers ────────────────────────────────────────────────────────────────

async function placeImage(
  pdf: import("jspdf").jsPDF,
  dataUrl: string,
  x: number,
  y: number,
  boxW: number,
  boxH: number,
  fitMode: FitMode,
): Promise<void> {
  if (fitMode === "stretch") {
    const format = dataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
    pdf.addImage(dataUrl, format, x, y, boxW, boxH);
    return;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const aspect = img.width / img.height;
      const boxAspect = boxW / boxH;

      if (fitMode === "fit") {
        let renderW = boxW,
          renderH = boxH,
          ox = 0,
          oy = 0;
        if (aspect > boxAspect) {
          renderH = boxW / aspect;
          oy = (boxH - renderH) / 2;
        } else {
          renderW = boxH * aspect;
          ox = (boxW - renderW) / 2;
        }
        const format = dataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
        pdf.addImage(dataUrl, format, x + ox, y + oy, renderW, renderH);
      } else {
        // crop: create off-screen canvas at 150 DPI
        const dpi = 150;
        const pxW = Math.round((boxW * dpi) / 25.4);
        const pxH = Math.round((boxH * dpi) / 25.4);
        const canvas = document.createElement("canvas");
        canvas.width = pxW;
        canvas.height = pxH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          // Fallback to stretch if canvas context unavailable
          const fmt = dataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
          pdf.addImage(dataUrl, fmt, x, y, boxW, boxH);
          resolve();
          return;
        }
        const scaleToFill = Math.max(pxW / img.width, pxH / img.height);
        const drawW = img.width * scaleToFill;
        const drawH = img.height * scaleToFill;
        const ox = (pxW - drawW) / 2;
        const oy = (pxH - drawH) / 2;
        ctx.drawImage(img, ox, oy, drawW, drawH);
        pdf.addImage(
          canvas.toDataURL("image/jpeg", 0.92),
          "JPEG",
          x,
          y,
          boxW,
          boxH,
        );
      }
      resolve();
    };
    img.onerror = () => {
      // Skip failed images or fallback
      resolve();
    };
    img.src = dataUrl;
  });
}

function drawCropMarksPDF(
  pdf: import("jspdf").jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const mark = 3;
  const gap = 2;
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.25);

  // top-left
  pdf.line(x - gap - mark, y, x - gap, y);
  pdf.line(x, y - gap - mark, x, y - gap);
  // top-right
  pdf.line(x + w + gap, y, x + w + gap + mark, y);
  pdf.line(x + w, y - gap - mark, x + w, y - gap);
  // bottom-left
  pdf.line(x - gap - mark, y + h, x - gap, y + h);
  pdf.line(x, y + h + gap, x, y + h + gap + mark);
  // bottom-right
  pdf.line(x + w + gap, y + h, x + w + gap + mark, y + h);
  pdf.line(x + w, y + h + gap, x + w, y + h + gap + mark);
}
