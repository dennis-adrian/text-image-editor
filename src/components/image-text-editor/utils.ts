// Quote multi-word font names so the Canvas 2D API parses them correctly.
// Without quotes, "Times New Roman" is parsed as family "Times" with unknown
// keywords "New" and "Roman", causing fallback to the default font.
export function toCssFontFamily(fontFamily: string): string {
  if (
    fontFamily.includes(" ") &&
    !fontFamily.startsWith('"') &&
    !fontFamily.startsWith("'")
  ) {
    return `"${fontFamily}", sans-serif`;
  }
  return fontFamily;
}

// Utility function to properly handle special characters
export const sanitizeText = (text: string): string => {
  // Decode HTML entities and handle special characters
  return (
    text
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      // Handle other common special characters
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
      .replace(/&mdash;/g, "—")
  );
};

const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontSize: number,
  fontFamily: string,
): string[] => {
  // Sanitize the text to handle special characters
  const sanitizedText = sanitizeText(text);

  ctx.font = `${fontSize}px ${toCssFontFamily(fontFamily)}`;
  const words = sanitizedText.split(" ");
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
    ctx.font = `${fontSize}px ${toCssFontFamily(fontFamily)}`;
    const lines = wrapText(ctx, text, maxWidth, fontSize, fontFamily);
    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;

    const maxLineWidth = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (totalHeight <= maxHeight && maxLineWidth <= maxWidth) {
      return { fontSize, lines };
    }

    fontSize -= 2;
  }

  const lines = wrapText(ctx, text, maxWidth, minSize, fontFamily);
  return { fontSize: minSize, lines };
};

export function sanitizeFilename(text: string): string {
  return text
    .replace(/[/\\:*?"<>|]/g, "_")
    .substring(0, 50)
    .trim();
}

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

  ctx.font = `${fontSize}px ${toCssFontFamily(fontFamily)}`;
  ctx.fillStyle = textColor;
  ctx.textBaseline = "top";
  ctx.textAlign = textAlign;

  const lineHeight = fontSize * 1.2;
  const totalTextHeight = lines.length * lineHeight;

  // Center the text block vertically within the box
  const centeredY = y + Math.max(0, (boxHeight - totalTextHeight) / 2);

  if (showBox) {
    ctx.strokeStyle = "rgba(0,0,0, 0.5)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x, y, boxWidth, boxHeight);
    ctx.setLineDash([]);
  }

  lines.forEach((line, index) => {
    let lineX = x;
    if (textAlign === "center") {
      lineX = x + boxWidth / 2;
    } else if (textAlign === "right") {
      lineX = x + boxWidth;
    }

    ctx.fillText(line, lineX, centeredY + index * lineHeight);
  });

  // ctx.shadowColor = "transparent";
  // ctx.shadowBlur = 0;
  // ctx.shadowOffsetX = 0;
  // ctx.shadowOffsetY = 0;
};
