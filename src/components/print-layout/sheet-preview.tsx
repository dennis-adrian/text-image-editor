"use client";

import { useRef, useEffect } from "react";
import type { PrintSettings, LayoutResult } from "./types";
import type { PrintImage } from "@/lib/print-store";

interface SheetPreviewProps {
  settings: PrintSettings;
  images: PrintImage[];
  layout: LayoutResult;
  pageIndex: number;
  containerWidth?: number;
}

export function SheetPreview({
  settings,
  images,
  layout,
  pageIndex,
  containerWidth = 380,
}: SheetPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { pageW, pageH, imageW, imageH, cols, rows } = layout;
    const scale = containerWidth / pageW;

    canvas.width = Math.round(pageW * scale);
    canvas.height = Math.round(pageH * scale);

    // Background
    ctx.fillStyle = "#e5e7eb";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Page white
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.15)";
    ctx.shadowBlur = 8 * scale;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.shadowBlur = 0;

    const marginTop = settings.marginTop * scale;
    const marginLeft = settings.marginLeft * scale;
    const gutter = settings.gutter * scale;
    const imgW = imageW * scale;
    const imgH = imageH * scale;

    const startSlot = pageIndex * layout.perPage;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const slot = row * cols + col;
        const imgIdx = startSlot + slot;

        const x = marginLeft + col * (imgW + gutter);
        const y = marginTop + row * (imgH + gutter);

        if (imgIdx < images.length) {
          // Draw placeholder first
          ctx.fillStyle = "#d1d5db";
          ctx.fillRect(x, y, imgW, imgH);

          const imgEl = new Image();
          imgEl.onload = () => {
            if (!canvas) return;
            const c2 = canvas.getContext("2d");
            if (!c2) return;

            if (settings.fitMode === "stretch") {
              c2.drawImage(imgEl, x, y, imgW, imgH);
            } else {
              const aspect = imgEl.width / imgEl.height;
              const boxAspect = imgW / imgH;
              let sw = imgW,
                sh = imgH,
                ox = 0,
                oy = 0;

              if (settings.fitMode === "fit") {
                if (aspect > boxAspect) {
                  sh = imgW / aspect;
                  oy = (imgH - sh) / 2;
                } else {
                  sw = imgH * aspect;
                  ox = (imgW - sw) / 2;
                }
                c2.fillStyle = "#f3f4f6";
                c2.fillRect(x, y, imgW, imgH);
                c2.drawImage(imgEl, x + ox, y + oy, sw, sh);
              } else {
                // crop
                c2.save();
                c2.beginPath();
                c2.rect(x, y, imgW, imgH);
                c2.clip();
                if (aspect > boxAspect) {
                  sw = imgH * aspect;
                  ox = (imgW - sw) / 2;
                  sh = imgH;
                } else {
                  sh = imgW / aspect;
                  oy = (imgH - sh) / 2;
                  sw = imgW;
                }
                c2.drawImage(imgEl, x + ox, y + oy, sw, sh);
                c2.restore();
              }
            }

            // Redraw crop marks after image
            if (settings.cropMarks) {
              drawCropMarksCanvas(c2, x, y, imgW, imgH, scale);
            }
          };
          imgEl.src = images[imgIdx].dataUrl;
        } else {
          // Empty slot
          ctx.fillStyle = "#f3f4f6";
          ctx.fillRect(x, y, imgW, imgH);
          ctx.strokeStyle = "#d1d5db";
          ctx.lineWidth = 0.5;
          ctx.setLineDash([3, 3]);
          ctx.strokeRect(x, y, imgW, imgH);
          ctx.setLineDash([]);
        }

        // Crop marks (drawn immediately for layout, redrawn after images load too)
        if (settings.cropMarks) {
          drawCropMarksCanvas(ctx, x, y, imgW, imgH, scale);
        }
      }
    }
  }, [settings, images, layout, pageIndex, containerWidth]);

  return (
    <canvas
      ref={canvasRef}
      className="max-w-full h-auto rounded shadow-sm"
      style={{ display: "block" }}
    />
  );
}

function drawCropMarksCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
) {
  const mark = 3 * scale;
  const gap = 1.5 * scale;
  ctx.strokeStyle = "#374151";
  ctx.lineWidth = 0.5;
  ctx.setLineDash([]);

  // top-left
  ctx.beginPath();
  ctx.moveTo(x - gap - mark, y);
  ctx.lineTo(x - gap, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y - gap - mark);
  ctx.lineTo(x, y - gap);
  ctx.stroke();
  // top-right
  ctx.beginPath();
  ctx.moveTo(x + w + gap, y);
  ctx.lineTo(x + w + gap + mark, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + w, y - gap - mark);
  ctx.lineTo(x + w, y - gap);
  ctx.stroke();
  // bottom-left
  ctx.beginPath();
  ctx.moveTo(x - gap - mark, y + h);
  ctx.lineTo(x - gap, y + h);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y + h + gap);
  ctx.lineTo(x, y + h + gap + mark);
  ctx.stroke();
  // bottom-right
  ctx.beginPath();
  ctx.moveTo(x + w + gap, y + h);
  ctx.lineTo(x + w + gap + mark, y + h);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + w, y + h + gap);
  ctx.lineTo(x + w, y + h + gap + mark);
  ctx.stroke();
}
