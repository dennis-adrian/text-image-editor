"use client";

import type React from "react";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload,
  Download,
  Type,
  DownloadCloud,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import {
  drawTextInBox,
  calculateOptimalFontSize,
} from "@/components/image-text-editor/utils";

export function ImageTextEditor() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [textArray, setTextArray] = useState<string[]>(["Your Text Here"]);
  const [textInput, setTextInput] = useState("Your Text Here");
  const [textX, setTextX] = useState(14.5);
  const [textY, setTextY] = useState(35.5);
  const [textBoxWidth, setTextBoxWidth] = useState(70);
  const [textBoxHeight, setTextBoxHeight] = useState(10);
  const [textColor, setTextColor] = useState("#000000");
  const [fontFamily, setFontFamily] = useState("Chau Philomene One");
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">(
    "center",
  );
  const [generatedImages, setGeneratedImages] = useState<HTMLCanvasElement[]>(
    [],
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [dragStartTextPos, setDragStartTextPos] = useState({ x: 0, y: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const throttleRef = useRef<NodeJS.Timeout | null>(null);
  const textCacheRef = useRef<
    Map<string, { fontSize: number; lines: string[] }>
  >(new Map());

  // Utility function to handle special characters
  const sanitizeText = (text: string): string => {
    return text
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/&copy;/g, "©")
      .replace(/&reg;/g, "®")
      .replace(/&trade;/g, "™")
      .replace(/&euro;/g, "€")
      .replace(/&pound;/g, "£")
      .replace(/&yen;/g, "¥")
      .replace(/&cent;/g, "¢")
      .replace(/&sect;/g, "§")
      .replace(/&para;/g, "¶")
      .replace(/&middot;/g, "·")
      .replace(/&hellip;/g, "…")
      .replace(/&ndash;/g, "–")
      .replace(/&mdash;/g, "—");
  };

  // Ensure custom font is loaded for canvas rendering
  useEffect(() => {
    const loadCustomFont = async () => {
      try {
        // Check if the custom font is available
        if (document.fonts && document.fonts.load) {
          await document.fonts.load('16px "Chau Philomene One"');
          console.log("Custom font loaded successfully");
        }
      } catch (error) {
        console.warn("Custom font loading failed:", error);
      }
    };

    loadCustomFont();
  }, []);

  // Optimized text drawing with caching
  const drawTextInBoxOptimized = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      text: string,
      x: number,
      y: number,
      boxWidth: number,
      boxHeight: number,
      showBox: boolean,
      fontFamily: string,
      textColor: string,
      textAlign: "left" | "center" | "right",
    ) => {
      const cacheKey = `${text}-${boxWidth}-${boxHeight}-${fontFamily}`;
      let cached = textCacheRef.current.get(cacheKey);

      if (!cached) {
        const sanitizedText = sanitizeText(text);
        const result = calculateOptimalFontSize(
          ctx,
          sanitizedText,
          boxWidth,
          boxHeight,
          fontFamily,
        );
        cached = result;
        textCacheRef.current.set(cacheKey, cached);
      }

      const { fontSize, lines } = cached;

      const lineHeight = fontSize * 1.2;
      const totalTextHeight = lines.length * lineHeight;

      // Use the actual text height for the bounding box instead of the fixed boxHeight
      const actualBoxHeight = totalTextHeight;

      if (showBox) {
        ctx.strokeStyle = "rgba(0,0,0, 0.5)";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(x, y, boxWidth, actualBoxHeight);
        ctx.setLineDash([]);
      }

      // Set font with fallback for custom fonts
      const fontToUse =
        fontFamily === "Chau Philomene One"
          ? `"Chau Philomene One", Arial, sans-serif`
          : fontFamily;
      ctx.font = `${fontSize}px ${fontToUse}`;
      ctx.fillStyle = textColor;
      ctx.textBaseline = "top";
      ctx.textAlign = textAlign;

      lines.forEach((line: string, index: number) => {
        let lineX = x;
        if (textAlign === "center") {
          lineX = x + boxWidth / 2;
        } else if (textAlign === "right") {
          lineX = x + boxWidth;
        }

        ctx.fillText(line, lineX, y + index * lineHeight);
      });
    },
    [],
  );

  // Throttled canvas redraw for smooth dragging
  const throttledCanvasRedraw = useCallback(
    (tempX: number, tempY: number) => {
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }

      throttleRef.current = setTimeout(() => {
        if (!image || !previewCanvasRef.current) return;

        const canvas = previewCanvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Clear and redraw
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);

        const boxWidthPx = (textBoxWidth / 100) * canvas.width;
        const boxHeightPx = (textBoxHeight / 100) * canvas.height;
        const x = (tempX / 100) * canvas.width;
        const y = (tempY / 100) * canvas.height;
        const text = textArray[0] || "";

        drawTextInBoxOptimized(
          ctx,
          text,
          x,
          y,
          boxWidthPx,
          boxHeightPx,
          true,
          fontFamily,
          textColor,
          textAlign,
        );
      }, 16); // ~60fps throttling
    },
    [
      image,
      textArray,
      textBoxWidth,
      textBoxHeight,
      fontFamily,
      textColor,
      textAlign,
      drawTextInBoxOptimized,
    ],
  );

  // Clear text cache when text properties change
  useEffect(() => {
    textCacheRef.current.clear();
  }, [textArray, textBoxWidth, textBoxHeight, fontFamily]);

  // Cleanup throttle timeout on unmount
  useEffect(() => {
    return () => {
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!image || textArray.length === 0) {
      setGeneratedImages([]);
      return;
    }

    const canvases: HTMLCanvasElement[] = [];

    textArray.forEach((text) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = image.width;
      canvas.height = image.height;

      ctx.drawImage(image, 0, 0);

      const boxWidthPx = (textBoxWidth / 100) * canvas.width;
      const boxHeightPx = (textBoxHeight / 100) * canvas.height;
      const x = (textX / 100) * canvas.width;
      const y = (textY / 100) * canvas.height;

      drawTextInBox(
        ctx,
        text,
        x,
        y,
        boxWidthPx,
        boxHeightPx,
        false,
        fontFamily,
        textColor,
        textAlign,
      );

      canvases.push(canvas);
    });

    setGeneratedImages(canvases);
  }, [
    image,
    textArray,
    textX,
    textY,
    textBoxWidth,
    textBoxHeight,
    textColor,
    fontFamily,
    textAlign,
  ]);

  // Only redraw preview canvas when not dragging to avoid conflicts
  useEffect(() => {
    if (!image || !previewCanvasRef.current || isDragging) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = image.width;
    canvas.height = image.height;

    ctx.drawImage(image, 0, 0);

    const boxWidthPx = (textBoxWidth / 100) * canvas.width;
    const boxHeightPx = (textBoxHeight / 100) * canvas.height;
    const x = (textX / 100) * canvas.width;
    const y = (textY / 100) * canvas.height;
    const text = textArray[0] || "";

    drawTextInBoxOptimized(
      ctx,
      text,
      x,
      y,
      boxWidthPx,
      boxHeightPx,
      true,
      fontFamily,
      textColor,
      textAlign,
    );
  }, [
    image,
    textArray,
    textX,
    textY,
    textBoxWidth,
    textBoxHeight,
    textColor,
    fontFamily,
    textAlign,
    isDragging,
    drawTextInBoxOptimized,
  ]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    setIsDragging(true);
    setDragStartPos({ x: mouseX, y: mouseY });
    setDragStartTextPos({ x: textX, y: textY });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDragging) return;

      const canvas = previewCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      const deltaX = mouseX - dragStartPos.x;
      const deltaY = mouseY - dragStartPos.y;

      const newX = Math.max(
        0,
        Math.min(100, dragStartTextPos.x + (deltaX / canvas.width) * 100),
      );
      const newY = Math.max(
        0,
        Math.min(100, dragStartTextPos.y + (deltaY / canvas.height) * 100),
      );

      // Use throttled redraw for smooth dragging
      throttledCanvasRedraw(newX, newY);

      // Update state for final position
      setTextX(newX);
      setTextY(newY);
    },
    [isDragging, dragStartPos, dragStartTextPos, throttledCanvasRedraw],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    // Clear any pending throttled redraws
    if (throttleRef.current) {
      clearTimeout(throttleRef.current);
      throttleRef.current = null;
    }
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        setImage(img);
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

  const handleXPositionChange = (value: string) => {
    const numValue = Number.parseFloat(value);
    if (!isNaN(numValue)) {
      setTextX(Math.max(0, Math.min(100, numValue)));
    }
  };

  const handleYPositionChange = (value: string) => {
    const numValue = Number.parseFloat(value);
    if (!isNaN(numValue)) {
      setTextY(Math.max(0, Math.min(100, numValue)));
    }
  };

  const handleDownloadSingle = (
    canvas: HTMLCanvasElement,
    index: number,
    text: string,
  ) => {
    canvas.toBlob((blob) => {
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${index + 1}-image-${text}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  const handleDownloadAll = () => {
    generatedImages.forEach((canvas, index) => {
      setTimeout(() => {
        handleDownloadSingle(canvas, index, textArray[index]);
      }, index * 200);
    });
  };

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

          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="w-5 h-5" />
                Text Settings
              </CardTitle>
              <CardDescription>
                Add multiple texts (comma-separated) with auto-sizing in fixed
                box
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="text">Text Content (comma-separated)</Label>
                <Textarea
                  id="text"
                  value={textInput}
                  onChange={(e) => handleTextInputChange(e.target.value)}
                  placeholder="Enter your texts, separated by new lines&#10;Each text will create a new image&#10;Text size adjusts to fit the fixed box&#10;Special characters like &, ©, ® are supported"
                  className="border-2 min-h-[120px] font-mono"
                  rows={5}
                />
                <p className="text-sm text-muted-foreground">
                  {textArray.length} image{textArray.length !== 1 ? "s" : ""}{" "}
                  will be generated
                </p>
              </div>

              <div className="space-y-4">
                <Label>Text Position</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="position-x"
                      className="text-sm text-muted-foreground"
                    >
                      X Position (%)
                    </Label>
                    <Input
                      id="position-x"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={textX.toFixed(1)}
                      onChange={(e) => handleXPositionChange(e.target.value)}
                      className="border-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="position-y"
                      className="text-sm text-muted-foreground"
                    >
                      Y Position (%)
                    </Label>
                    <Input
                      id="position-y"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={textY.toFixed(1)}
                      onChange={(e) => handleYPositionChange(e.target.value)}
                      className="border-2"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  You can also drag the text box in the preview to reposition it
                </p>
              </div>

              <div className="space-y-4 p-4 bg-muted/50 rounded-lg border-2">
                <Label className="text-base font-semibold">
                  Text Box Dimensions
                </Label>

                <div className="space-y-2">
                  <Label htmlFor="text-box-width">
                    Box Width: {textBoxWidth}%
                  </Label>
                  <Slider
                    id="text-box-width"
                    min={10}
                    max={100}
                    step={5}
                    value={[textBoxWidth]}
                    onValueChange={(value) => setTextBoxWidth(value[0])}
                    className="py-4"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="text-box-height">
                    Box Height: {textBoxHeight}%
                  </Label>
                  <Slider
                    id="text-box-height"
                    min={5}
                    max={50}
                    step={1}
                    value={[textBoxHeight]}
                    onValueChange={(value) => setTextBoxHeight(value[0])}
                    className="py-4"
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Text automatically scales to fit within the box width, and the
                  box height adjusts to match the text
                </p>
              </div>

              <div className="space-y-2">
                <Label>Text Alignment</Label>
                <div className="flex gap-2">
                  <Button
                    variant={textAlign === "left" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTextAlign("left")}
                    className="flex-1"
                  >
                    <AlignLeft className="w-4 h-4 mr-2" />
                    Left
                  </Button>
                  <Button
                    variant={textAlign === "center" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTextAlign("center")}
                    className="flex-1"
                  >
                    <AlignCenter className="w-4 h-4 mr-2" />
                    Center
                  </Button>
                  <Button
                    variant={textAlign === "right" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTextAlign("right")}
                    className="flex-1"
                  >
                    <AlignRight className="w-4 h-4 mr-2" />
                    Right
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="font-family">Font Family</Label>
                <Select value={fontFamily} onValueChange={setFontFamily}>
                  <SelectTrigger id="font-family" className="border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Arial">Arial</SelectItem>
                    <SelectItem value="Georgia">Georgia</SelectItem>
                    <SelectItem value="Times New Roman">
                      Times New Roman
                    </SelectItem>
                    <SelectItem value="Courier New">Courier New</SelectItem>
                    <SelectItem value="Verdana">Verdana</SelectItem>
                    <SelectItem value="Impact">Impact</SelectItem>
                    <SelectItem value="Chau Philomene One">
                      Chau Philomene One ✨
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="text-color">Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="text-color"
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-20 h-10 cursor-pointer border-2"
                  />
                  <Input
                    type="text"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="flex-1 border-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {image && generatedImages.length > 0 && (
            <Button
              onClick={handleDownloadAll}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              size="lg"
            >
              <DownloadCloud className="w-4 h-4 mr-2" />
              Download All Images ({generatedImages.length})
            </Button>
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
                    <canvas
                      ref={previewCanvasRef}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      className="w-full h-auto border-2 border-border rounded-lg cursor-move"
                      style={{ touchAction: "none" }}
                    />
                  </div>

                  {generatedImages.length > 1 && (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                      <p className="text-sm font-semibold text-muted-foreground">
                        All Generated Images:
                      </p>
                      {generatedImages.map((canvas, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                              Image {index + 1}: &quot;{textArray[index]}&quot;
                            </p>
                            <Button
                              onClick={() =>
                                handleDownloadSingle(
                                  canvas,
                                  index,
                                  textArray[index],
                                )
                              }
                              size="sm"
                              variant="outline"
                              className="h-8"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                          </div>
                          <img
                            src={canvas.toDataURL() || "/placeholder.svg"}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-auto border-2 border-border rounded-lg"
                          />
                        </div>
                      ))}
                    </div>
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
