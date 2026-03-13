"use client";

import { useState } from "react";
import { printStore } from "@/lib/print-store";
import { PrintLayout } from "@/components/print-layout";
import type { PrintImage } from "@/lib/print-store";

export default function PrintPage() {
  const [images] = useState<PrintImage[]>(() => printStore.get());

  return <PrintLayout images={images} />;
}
