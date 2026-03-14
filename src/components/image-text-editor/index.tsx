"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Upload,
  DownloadCloud,
  Loader2,
  Images,
  Printer,
  BookmarkPlus,
} from "lucide-react";
import { printStore } from "@/lib/print-store";
import {
  drawTextInBox,
  sanitizeFilename,
} from "@/components/image-text-editor/utils";
import {
  DEFAULT_SETTINGS,
  LOCAL_STORAGE_KEY,
  type TextAlign,
  type TextSettings,
} from "@/components/image-text-editor/types";
import { TextSettingsCard } from "@/components/image-text-editor/components/text-settings-card";
import { CanvasPreview } from "@/components/image-text-editor/components/canvas-preview";
import { GeneratedImagesList } from "@/components/image-text-editor/components/generated-images-list";

// ── localStorage helpers (client-only; do not use in initial state to avoid hydration mismatch) ──

function loadSettingsFromStorage(): Partial<TextSettings> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<TextSettings>;
  } catch {
    return null;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ImageTextEditor() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [generatedImages, setGeneratedImages] = useState<HTMLCanvasElement[]>(
    [],
  );
  const [generatedTextArray, setGeneratedTextArray] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [uploadedFonts, setUploadedFonts] = useState<string[]>([]);
  const [collectionCount, setCollectionCount] = useState(0);

  // Persisted settings — use defaults for initial render (SSR + first client paint) to avoid hydration mismatch
  const [textInput, setTextInput] = useState(DEFAULT_SETTINGS.textInput);
  const [textArray, setTextArray] = useState<string[]>(() => {
    const lines = DEFAULT_SETTINGS.textInput
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    return lines.length > 0 ? lines : [""];
  });
  const [textX, setTextX] = useState(DEFAULT_SETTINGS.textX);
  const [textY, setTextY] = useState(DEFAULT_SETTINGS.textY);
  const [textBoxWidth, setTextBoxWidth] = useState(
    DEFAULT_SETTINGS.textBoxWidth,
  );
  const [textBoxHeight, setTextBoxHeight] = useState(
    DEFAULT_SETTINGS.textBoxHeight,
  );
  const [textColor, setTextColor] = useState(DEFAULT_SETTINGS.textColor);
  const [fontFamily, setFontFamily] = useState(DEFAULT_SETTINGS.fontFamily);
  const [textAlign, setTextAlign] = useState<TextAlign>(
    DEFAULT_SETTINGS.textAlign,
  );
  const [copies, setCopies] = useState(DEFAULT_SETTINGS.copies);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const generationIdRef = useRef(0);

  // ── Hydrate from localStorage (client-only, after first paint to avoid hydration mismatch) ──

  useEffect(() => {
    setCollectionCount(printStore.get().length);
    const stored = loadSettingsFromStorage();
    if (!stored) return;
    if (typeof stored.textInput === "string") {
      setTextInput(stored.textInput);
      const lines = stored.textInput
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      setTextArray(lines.length > 0 ? lines : [""]);
    } else if (stored.textInput !== undefined) {
      setTextInput("");
      setTextArray([""]);
    }
    const safeNum = (v: unknown): v is number =>
      typeof v === "number" && !Number.isNaN(v);
    if (safeNum(stored.textX)) setTextX(stored.textX);
    if (safeNum(stored.textY)) setTextY(stored.textY);
    if (safeNum(stored.textBoxWidth)) setTextBoxWidth(stored.textBoxWidth);
    if (safeNum(stored.textBoxHeight)) setTextBoxHeight(stored.textBoxHeight);
    if (typeof stored.textColor === "string") setTextColor(stored.textColor);
    if (typeof stored.fontFamily === "string") setFontFamily(stored.fontFamily);
    if (safeNum(stored.copies)) setCopies(Math.max(1, stored.copies));
    const validAligns: TextAlign[] = ["left", "center", "right"];
    if (
      typeof stored.textAlign === "string" &&
      validAligns.includes(stored.textAlign as TextAlign)
    ) {
      setTextAlign(stored.textAlign as TextAlign);
    }
  }, []);

  // ── Persist settings to localStorage ───────────────────────────────────────

  useEffect(() => {
    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          textInput,
          textX,
          textY,
          textBoxWidth,
          textBoxHeight,
          textColor,
          fontFamily,
          textAlign,
          copies,
        } satisfies TextSettings),
      );
    } catch {
      // quota exceeded — ignore
    }
  }, [
    textInput,
    textX,
    textY,
    textBoxWidth,
    textBoxHeight,
    textColor,
    fontFamily,
    textAlign,
    copies,
  ]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        setImage(img);
        setGeneratedImages([]);
        setGeneratedTextArray([]);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleTextInputChange = (value: string) => {
    setTextInput(value);
    const lines = value
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "");
    setTextArray(lines.length > 0 ? lines : [""]);
  };

  const handleImportCSV = useCallback((texts: string[]) => {
    const joined = texts.join("\n");
    setTextInput(joined);
    setTextArray(texts);
  }, []);

  const handleFontUpload = useCallback((name: string) => {
    setUploadedFonts((prev) => (prev.includes(name) ? prev : [...prev, name]));
  }, []);

  const handlePositionChange = useCallback((x: number, y: number) => {
    setTextX(x);
    setTextY(y);
  }, []);

  const handleXChange = (value: string) => {
    const n = Number.parseFloat(value);
    if (!Number.isNaN(n)) setTextX(Math.max(0, Math.min(100, n)));
  };

  const handleYChange = (value: string) => {
    const n = Number.parseFloat(value);
    if (!Number.isNaN(n)) setTextY(Math.max(0, Math.min(100, n)));
  };

  // ── Generate images on button click ─────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (!image || isGenerating) return;

    // Snapshot the settings at the moment the button is clicked
    const nonEmptyTexts = textArray.filter(Boolean);
    const isPlainMode = nonEmptyTexts.length === 0;
    const snapCopies = copies;
    const snap = {
      textX,
      textY,
      textBoxWidth,
      textBoxHeight,
      textColor,
      fontFamily,
      textAlign,
    };

    // Build expanded list: each text repeated `copies` times, or N plain copies
    const expandedTexts: string[] = isPlainMode
      ? Array(snapCopies).fill("")
      : nonEmptyTexts.flatMap((t) => Array(snapCopies).fill(t));

    const expandedLabels: string[] = isPlainMode
      ? expandedTexts.map((_, i) => `Copy ${i + 1}`)
      : nonEmptyTexts.flatMap((t) =>
          Array.from({ length: snapCopies }, (_, ci) =>
            snapCopies > 1 ? `${t} (${ci + 1}/${snapCopies})` : t,
          ),
        );

    const currentId = ++generationIdRef.current;
    setGeneratedImages([]);
    setGeneratedTextArray([]);
    setIsGenerating(true);

    // Ensure all fonts are loaded before measuring text
    await document.fonts.ready;

    const CHUNK_SIZE = 5;
    let chunkIndex = 0;
    const accumulated: HTMLCanvasElement[] = [];

    const processChunk = () => {
      const slice = expandedTexts.slice(chunkIndex, chunkIndex + CHUNK_SIZE);

      for (const text of slice) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);

        if (text !== "") {
          const boxW = (snap.textBoxWidth / 100) * canvas.width;
          const boxH = (snap.textBoxHeight / 100) * canvas.height;
          const x = (snap.textX / 100) * canvas.width;
          const y = (snap.textY / 100) * canvas.height;

          drawTextInBox(
            ctx,
            text,
            x,
            y,
            boxW,
            boxH,
            false,
            snap.fontFamily,
            snap.textColor,
            snap.textAlign,
          );
        }

        accumulated.push(canvas);
      }

      chunkIndex += CHUNK_SIZE;

      if (generationIdRef.current !== currentId) return; // superseded — drop results

      setGeneratedImages([...accumulated]);
      setGeneratedTextArray(expandedLabels.slice(0, accumulated.length));

      if (chunkIndex < expandedTexts.length) {
        setTimeout(processChunk, 0); // yield to main thread
      } else {
        setIsGenerating(false);
      }
    };

    setTimeout(processChunk, 0);
  }, [
    image,
    textArray,
    copies,
    textX,
    textY,
    textBoxWidth,
    textBoxHeight,
    textColor,
    fontFamily,
    textAlign,
    isGenerating,
  ]);

  const handleDownloadSingle = useCallback(
    (canvas: HTMLCanvasElement, index: number, text: string) => {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${index + 1}-image-${sanitizeFilename(text)}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    },
    [],
  );

  const handleAddToCollection = useCallback(() => {
    const printImages = generatedImages.map((canvas, i) => ({
      dataUrl: canvas.toDataURL("image/jpeg", 0.92),
      label: generatedTextArray[i] ?? "",
    }));
    printStore.add(printImages);
    setCollectionCount(printStore.get().length);
  }, [generatedImages, generatedTextArray]);

  const handleClearCollection = useCallback(() => {
    printStore.clear();
    setCollectionCount(0);
  }, []);

  const handleDownloadAll = async () => {
    if (isZipping || generatedImages.length === 0) return;
    setIsZipping(true);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();

      await Promise.all(
        generatedImages.map(
          (canvas, i) =>
            new Promise<void>((resolve) => {
              canvas.toBlob((blob) => {
                if (blob) {
                  zip.file(
                    `${i + 1}-image-${sanitizeFilename(generatedTextArray[i] ?? "")}.png`,
                    blob,
                  );
                }
                resolve();
              });
            }),
        ),
      );

      const content = await zip.generateAsync({ type: "blob" });

      // Check if ZIP has any files
      if (Object.keys(zip.files).length === 0) {
        console.error("No images could be added to ZIP");
        return;
      }

      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = "images.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsZipping(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const readyToGenerate = !!image && !isGenerating;
  const nonEmptyCount = textArray.filter(Boolean).length;
  const totalToGenerate = nonEmptyCount > 0 ? nonEmptyCount * copies : copies;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2 text-foreground">
          Image Text Editor
        </h1>
        <p className="text-muted-foreground text-lg">
          Upload an image, add multiple texts, and download your creations
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Controls Panel */}
        <div className="space-y-6">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Image
              </CardTitle>
              <CardDescription>
                Choose an image to add text overlay
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                size="lg"
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose Image
              </Button>
            </CardContent>
          </Card>

          <TextSettingsCard
            textInput={textInput}
            textX={textX}
            textY={textY}
            textBoxWidth={textBoxWidth}
            textBoxHeight={textBoxHeight}
            textColor={textColor}
            fontFamily={fontFamily}
            textAlign={textAlign}
            textCount={nonEmptyCount}
            copies={copies}
            onCopiesChange={setCopies}
            onTextInputChange={handleTextInputChange}
            onXChange={handleXChange}
            onYChange={handleYChange}
            onWidthChange={setTextBoxWidth}
            onHeightChange={setTextBoxHeight}
            onColorChange={setTextColor}
            onFontChange={setFontFamily}
            onAlignChange={setTextAlign}
            onImportCSV={handleImportCSV}
            uploadedFonts={uploadedFonts}
            onFontUpload={handleFontUpload}
          />

          <Button
            onClick={handleGenerate}
            disabled={!readyToGenerate}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Images className="w-4 h-4 mr-2" />
                Generate Images ({totalToGenerate})
              </>
            )}
          </Button>

          {generatedImages.length > 0 && !isGenerating && (
            <Button
              onClick={handleAddToCollection}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <BookmarkPlus className="w-4 h-4 mr-2" />
              Add to Print Collection ({generatedImages.length} images)
            </Button>
          )}

          {generatedImages.length > 0 && (
            <Button
              onClick={handleDownloadAll}
              disabled={isZipping || isGenerating}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              size="lg"
            >
              {isZipping ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating ZIP…
                </>
              ) : (
                <>
                  <DownloadCloud className="w-4 h-4 mr-2" />
                  Download All ({generatedImages.length})
                </>
              )}
            </Button>
          )}

          {collectionCount > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
                <span className="flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5" />
                  Print collection:{" "}
                  <strong className="text-foreground">
                    {collectionCount}
                  </strong>{" "}
                  images
                </span>
                <button
                  onClick={handleClearCollection}
                  className="text-destructive hover:underline text-xs"
                >
                  Clear
                </button>
              </div>
              <Button asChild className="w-full" size="lg">
                <Link href="/print">Go to Print Layout →</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Preview Panel */}
        <div>
          <Card className="border-2 sticky top-8">
            <CardHeader>
              <CardTitle>Interactive Preview</CardTitle>
              <CardDescription>
                {image
                  ? "Drag the text box to reposition it. Dashed box shows the fixed text area."
                  : "Upload an image to get started"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {image ? (
                <div className="space-y-4">
                  <div className="relative">
                    <CanvasPreview
                      image={image}
                      previewText={textArray[0] ?? ""}
                      textX={textX}
                      textY={textY}
                      textBoxWidth={textBoxWidth}
                      textBoxHeight={textBoxHeight}
                      textColor={textColor}
                      fontFamily={fontFamily}
                      textAlign={textAlign}
                      onPositionChange={handlePositionChange}
                    />
                  </div>

                  {(generatedImages.length > 0 || isGenerating) && (
                    <GeneratedImagesList
                      generatedImages={generatedImages}
                      textArray={generatedTextArray}
                      isGenerating={isGenerating}
                      totalCount={totalToGenerate}
                      onDownloadSingle={handleDownloadSingle}
                    />
                  )}
                </div>
              ) : (
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border">
                  <div className="text-center text-muted-foreground">
                    <Upload className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No image uploaded</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
