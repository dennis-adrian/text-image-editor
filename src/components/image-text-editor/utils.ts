const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontSize: number,
  fontFamily: string,
): string[] => {
  ctx.font = `${fontSize}px ${fontFamily}`;
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
};

export const calculateOptimalFontSize = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  fontFamily: string,
  minSize = 12,
  maxSize = 200,
): { fontSize: number; lines: string[] } => {
  let fontSize = maxSize;

  while (fontSize > minSize) {
    ctx.font = `${fontSize}px ${fontFamily}`;
    const lines = wrapText(ctx, text, maxWidth, fontSize, fontFamily);
    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;

    if (totalHeight <= maxHeight) {
      return { fontSize, lines };
    }

    fontSize -= 2;
  }

  const lines = wrapText(ctx, text, maxWidth, minSize, fontFamily);
  return { fontSize: minSize, lines };
};

export const drawTextInBox = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  boxWidth: number,
  boxHeight: number,
  showBox = false,
  fontFamily: string,
  textColor: string,
  textAlign: "left" | "center" | "right",
) => {
  const { fontSize, lines } = calculateOptimalFontSize(
    ctx,
    text,
    boxWidth,
    boxHeight,
    fontFamily,
  );

  if (showBox) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x, y, boxWidth, boxHeight);
    ctx.setLineDash([]);
  }

  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = textColor;
  ctx.textBaseline = "top";
  ctx.textAlign = textAlign;

  ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  const lineHeight = fontSize * 1.2;

  lines.forEach((line, index) => {
    let lineX = x;
    if (textAlign === "center") {
      lineX = x + boxWidth / 2;
    } else if (textAlign === "right") {
      lineX = x + boxWidth;
    }

    ctx.fillText(line, lineX, y + index * lineHeight);
  });

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
};
