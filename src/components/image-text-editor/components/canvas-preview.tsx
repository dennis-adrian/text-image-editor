"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { calculateOptimalFontSize, toCssFontFamily } from "@/components/image-text-editor/utils";
import type { TextAlign } from "@/components/image-text-editor/types";

interface CanvasPreviewProps {
  image: HTMLImageElement | null;
  previewText: string;
  textX: number;
  textY: number;
  textBoxWidth: number;
  textBoxHeight: number;
  textColor: string;
  fontFamily: string;
  textAlign: TextAlign;
  onPositionChange: (x: number, y: number) => void;
}

export const CanvasPreview = React.memo(function CanvasPreview({
  image,
  previewText,
  textX,
  textY,
  textBoxWidth,
  textBoxHeight,
  textColor,
  fontFamily,
  textAlign,
  onPositionChange,
}: CanvasPreviewProps) {

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const throttleRef = useRef<NodeJS.Timeout | null>(null);
  const textCacheRef = useRef<
    Map<string, { fontSize: number; lines: string[] }>
  >(new Map());
  const currentDragPosRef = useRef({ x: 0, y: 0 });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [dragStartTextPos, setDragStartTextPos] = useState({ x: 0, y: 0 });

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
      currentFontFamily: string,
      currentTextColor: string,
      currentTextAlign: TextAlign,
    ) => {
      const cacheKey = `${text}-${boxWidth}-${boxHeight}-${currentFontFamily}`;
      let cached = textCacheRef.current.get(cacheKey);

      if (!cached) {
        const result = calculateOptimalFontSize(
          ctx,
          text,
          boxWidth,
          boxHeight,
          currentFontFamily,
        );
        cached = result;
        textCacheRef.current.set(cacheKey, cached);
      }

      const { fontSize, lines } = cached;
      const lineHeight = fontSize * 1.2;
      const totalTextHeight = lines.length * lineHeight;

      if (showBox) {
        ctx.strokeStyle = "rgba(0,0,0, 0.5)";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(x, y, boxWidth, boxHeight);
        ctx.setLineDash([]);
      }

      ctx.font = `${fontSize}px ${toCssFontFamily(currentFontFamily)}`;
      ctx.fillStyle = currentTextColor;
      ctx.textBaseline = "top";
      ctx.textAlign = currentTextAlign;

      // Center the text block vertically within the box
      const centeredY = y + Math.max(0, (boxHeight - totalTextHeight) / 2);

      lines.forEach((line: string, index: number) => {
        let lineX = x;
        if (currentTextAlign === "center") {
          lineX = x + boxWidth / 2;
        } else if (currentTextAlign === "right") {
          lineX = x + boxWidth;
        }
        ctx.fillText(line, lineX, centeredY + index * lineHeight);
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
        if (!image || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);

        const boxWidthPx = (textBoxWidth / 100) * canvas.width;
        const boxHeightPx = (textBoxHeight / 100) * canvas.height;
        const x = (tempX / 100) * canvas.width;
        const y = (tempY / 100) * canvas.height;
        const text = previewText || "";

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
      }, 16);
    },
    [
      image,
      previewText,
      textBoxWidth,
      textBoxHeight,
      fontFamily,
      textColor,
      textAlign,
      drawTextInBoxOptimized,
    ],
  );

  // Clear cache when relevant props change
  useEffect(() => {
    textCacheRef.current.clear();
  }, [textBoxWidth, textBoxHeight, fontFamily]);

  // Cleanup throttle on unmount
  useEffect(() => {
    return () => {
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
    };
  }, []);

  // Redraw preview when props change (not during drag)
  useEffect(() => {
    if (!image || !canvasRef.current || isDragging) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = image.width;
    canvas.height = image.height;

    ctx.drawImage(image, 0, 0);

    const boxWidthPx = (textBoxWidth / 100) * canvas.width;
    const boxHeightPx = (textBoxHeight / 100) * canvas.height;
    const x = (textX / 100) * canvas.width;
    const y = (textY / 100) * canvas.height;
    const text = previewText || "";

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
    previewText,
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

  // ── Mouse handlers ──

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    setIsDragging(true);
    setDragStartPos({
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    });
    setDragStartTextPos({ x: textX, y: textY });
    currentDragPosRef.current = { x: textX, y: textY };
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDragging) return;

      const canvas = canvasRef.current;
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

      currentDragPosRef.current = { x: newX, y: newY };
      throttledCanvasRedraw(newX, newY);
    },
    [isDragging, dragStartPos, dragStartTextPos, throttledCanvasRedraw],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (throttleRef.current) {
      clearTimeout(throttleRef.current);
      throttleRef.current = null;
    }
    onPositionChange(currentDragPosRef.current.x, currentDragPosRef.current.y);
  }, [onPositionChange]);

  // ── Touch handlers ──

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    setIsDragging(true);
    setDragStartPos({
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY,
    });
    setDragStartTextPos({ x: textX, y: textY });
    currentDragPosRef.current = { x: textX, y: textY };
  };

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDragging) return;

      const touch = e.touches[0];
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const touchX = (touch.clientX - rect.left) * scaleX;
      const touchY = (touch.clientY - rect.top) * scaleY;

      const deltaX = touchX - dragStartPos.x;
      const deltaY = touchY - dragStartPos.y;

      const newX = Math.max(
        0,
        Math.min(100, dragStartTextPos.x + (deltaX / canvas.width) * 100),
      );
      const newY = Math.max(
        0,
        Math.min(100, dragStartTextPos.y + (deltaY / canvas.height) * 100),
      );

      currentDragPosRef.current = { x: newX, y: newY };
      throttledCanvasRedraw(newX, newY);
    },
    [isDragging, dragStartPos, dragStartTextPos, throttledCanvasRedraw],
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    if (throttleRef.current) {
      clearTimeout(throttleRef.current);
      throttleRef.current = null;
    }
    onPositionChange(currentDragPosRef.current.x, currentDragPosRef.current.y);
  }, [onPositionChange]);

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="w-full h-auto border-2 border-border rounded-lg cursor-move"
      style={{ touchAction: "none" }}
    />
  );
});
