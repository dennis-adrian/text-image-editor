export type PageSizePreset = "A4" | "A3" | "Letter" | "custom";
export type Orientation = "portrait" | "landscape";
export type FitMode = "fit" | "stretch" | "crop";

export interface PrintSettings {
  pageSize: PageSizePreset;
  orientation: Orientation;
  customWidth: number;
  customHeight: number;
  imageWidth: number;   // mm
  imageHeight: number;  // mm
  fitMode: FitMode;
  marginTop: number;    // mm
  marginRight: number;  // mm
  marginBottom: number; // mm
  marginLeft: number;   // mm
  gutter: number;       // mm
  cropMarks: boolean;
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  pageSize: "A4",
  orientation: "portrait",
  customWidth: 210,
  customHeight: 297,
  imageWidth: 90,
  imageHeight: 90,
  fitMode: "fit",
  marginTop: 10,
  marginRight: 10,
  marginBottom: 10,
  marginLeft: 10,
  gutter: 5,
  cropMarks: true,
};

export const PAGE_SIZES_MM: Record<
  Exclude<PageSizePreset, "custom">,
  { portrait: { w: number; h: number }; landscape: { w: number; h: number } }
> = {
  A4: { portrait: { w: 210, h: 297 }, landscape: { w: 297, h: 210 } },
  A3: { portrait: { w: 297, h: 420 }, landscape: { w: 420, h: 297 } },
  Letter: {
    portrait: { w: 215.9, h: 279.4 },
    landscape: { w: 279.4, h: 215.9 },
  },
};

export interface LayoutResult {
  cols: number;
  rows: number;
  perPage: number;
  pageCount: number;
  imageW: number; // mm
  imageH: number; // mm
  pageW: number;  // mm
  pageH: number;  // mm
}

export function calculateLayout(
  settings: PrintSettings,
  imageCount: number,
): LayoutResult {
  const page =
    settings.pageSize === "custom"
      ? { w: settings.customWidth, h: settings.customHeight }
      : PAGE_SIZES_MM[settings.pageSize][settings.orientation];

  const imageW = settings.imageWidth;
  const imageH = settings.imageHeight;
  const availW = page.w - settings.marginLeft - settings.marginRight;
  const availH = page.h - settings.marginTop - settings.marginBottom;

  const cols = Math.max(
    1,
    Math.floor((availW + settings.gutter) / (imageW + settings.gutter)),
  );
  const rows = Math.max(
    1,
    Math.floor((availH + settings.gutter) / (imageH + settings.gutter)),
  );
  const perPage = cols * rows;
  const pageCount = Math.ceil(imageCount / perPage);

  return { cols, rows, perPage, pageCount, imageW, imageH, pageW: page.w, pageH: page.h };
}
