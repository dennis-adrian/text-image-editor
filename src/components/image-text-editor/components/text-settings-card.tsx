"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
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
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  FileText,
  Upload,
} from "lucide-react";
import type { TextAlign } from "@/components/image-text-editor/types";

interface TextSettingsCardProps {
  textInput: string;
  textX: number;
  textY: number;
  textBoxWidth: number;
  textBoxHeight: number;
  textColor: string;
  fontFamily: string;
  textAlign: TextAlign;
  textCount: number;
  onTextInputChange: (value: string) => void;
  onXChange: (value: string) => void;
  onYChange: (value: string) => void;
  onWidthChange: (value: number) => void;
  onHeightChange: (value: number) => void;
  onColorChange: (value: string) => void;
  onFontChange: (value: string) => void;
  onAlignChange: (value: TextAlign) => void;
  onImportCSV: (texts: string[]) => void;
  uploadedFonts: string[];
  onFontUpload: (name: string) => void;
  copies: number;
  onCopiesChange: (value: number) => void;
}

export function TextSettingsCard({
  textInput,
  textX,
  textY,
  textBoxWidth,
  textBoxHeight,
  textColor,
  fontFamily,
  textAlign,
  textCount,
  onTextInputChange,
  onXChange,
  onYChange,
  onWidthChange,
  onHeightChange,
  onColorChange,
  onFontChange,
  onAlignChange,
  onImportCSV,
  uploadedFonts,
  onFontUpload,
  copies,
  onCopiesChange,
}: TextSettingsCardProps) {
  const csvInputRef = useRef<HTMLInputElement>(null);
  const fontInputRef = useRef<HTMLInputElement>(null);
  const [fontError, setFontError] = useState("");
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [selectedColumn, setSelectedColumn] = useState("");
  const [csvError, setCsvError] = useState("");

  const BUILTIN_FONTS = [
    "Arial",
    "Georgia",
    "Times New Roman",
    "Courier New",
    "Verdana",
    "Impact",
    "Chau Philomene One",
    "Reusco Display",
  ];

  const handleFontFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFontError("");
    try {
      const name = file.name.replace(/\.[^.]+$/, "");
      if (BUILTIN_FONTS.includes(name) || uploadedFonts.includes(name)) {
        setFontError(`Font "${name}" already exists.`);
        return;
      }
      const buffer = await file.arrayBuffer();
      const face = new FontFace(name, buffer);
      await face.load();
      document.fonts.add(face);
      onFontUpload(name);
      onFontChange(name);
    } catch {
      setFontError("Failed to load font. Make sure it's a valid font file.");
    }
    e.target.value = "";
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvError("");
    setCsvColumns([]);
    setCsvData([]);
    setSelectedColumn("");

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const cols = results.meta.fields ?? [];
        if (cols.length === 0) {
          setCsvError("CSV has no header row.");
          return;
        }
        setCsvColumns(cols);
        setCsvData(results.data);
        setSelectedColumn(cols[0]);
      },
      error: () => setCsvError("Failed to read file."),
    });

    e.target.value = "";
  };

  const handleApplyColumn = () => {
    const texts = csvData
      .map((row) => row[selectedColumn]?.trim())
      .filter((v): v is string => Boolean(v));

    if (texts.length === 0) {
      setCsvError("Selected column has no non-empty values.");
      return;
    }

    onImportCSV(texts);
    setCsvColumns([]);
    setCsvData([]);
    setSelectedColumn("");
    setCsvError("");
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Type className="w-5 h-5" />
          Text Settings
        </CardTitle>
        <CardDescription>
          Add multiple texts (one per line) with auto-sizing in fixed box
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="text">Text Content</Label>
          <Textarea
            id="text"
            value={textInput}
            onChange={(e) => onTextInputChange(e.target.value)}
            placeholder="Enter your texts, separated by new lines&#10;Each text will create a new image&#10;Text size adjusts to fit the fixed box&#10;Special characters like &, ©, ® are supported"
            className="border-2 min-h-[120px] font-mono"
            rows={5}
          />

          {/* CSV Import */}
          <div className="space-y-2">
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => csvInputRef.current?.click()}
            >
              <FileText className="w-3 h-3 mr-1" />
              Import CSV
            </Button>

            {csvError && <p className="text-sm text-destructive">{csvError}</p>}

            {csvColumns.length > 0 && (
              <div className="flex gap-2 items-center">
                <Select
                  value={selectedColumn}
                  onValueChange={setSelectedColumn}
                >
                  <SelectTrigger className="border-2 h-8 flex-1">
                    <SelectValue placeholder="Pick column" />
                  </SelectTrigger>
                  <SelectContent>
                    {csvColumns.map((col, idx) => (
                      <SelectItem key={`${idx}-${col}`} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleApplyColumn}>
                  Apply
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="copies">Copies per text</Label>
            <Input
              id="copies"
              type="number"
              min="1"
              max="99"
              step="1"
              value={copies}
              onChange={(e) => {
                const n = Math.round(parseInt(e.target.value, 10));
                if (!isNaN(n)) onCopiesChange(Math.max(1, Math.min(99, n)));
              }}
              className="border-2 w-24"
            />
          </div>

          <p className="text-sm text-muted-foreground">
            {textCount > 0
              ? `${textCount * copies} image${textCount * copies !== 1 ? "s" : ""} will be generated`
              : `${copies} plain image${copies !== 1 ? "s" : ""} will be generated`}
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
                onChange={(e) => onXChange(e.target.value)}
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
                onChange={(e) => onYChange(e.target.value)}
                className="border-2"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            You can also drag the text box in the preview to reposition it
          </p>
        </div>

        <div className="space-y-4 p-4 bg-muted/50 rounded-lg border-2">
          <Label className="text-base font-semibold">Text Box Dimensions</Label>

          <div className="space-y-2">
            <Label htmlFor="text-box-width">Box Width: {textBoxWidth}%</Label>
            <Slider
              id="text-box-width"
              min={10}
              max={100}
              step={5}
              value={[textBoxWidth]}
              onValueChange={(value) => onWidthChange(value[0])}
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
              onValueChange={(value) => onHeightChange(value[0])}
              className="py-4"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Text automatically scales to fit within the box width, and the box
            height adjusts to match the text
          </p>
        </div>

        <div className="space-y-2">
          <Label>Text Alignment</Label>
          <div className="flex gap-2">
            <Button
              variant={textAlign === "left" ? "default" : "outline"}
              size="sm"
              onClick={() => onAlignChange("left")}
              className="flex-1"
              aria-pressed={textAlign === "left"}
            >
              <AlignLeft className="w-4 h-4 mr-2" />
              Left
            </Button>
            <Button
              variant={textAlign === "center" ? "default" : "outline"}
              size="sm"
              onClick={() => onAlignChange("center")}
              className="flex-1"
              aria-pressed={textAlign === "center"}
            >
              <AlignCenter className="w-4 h-4 mr-2" />
              Center
            </Button>
            <Button
              variant={textAlign === "right" ? "default" : "outline"}
              size="sm"
              onClick={() => onAlignChange("right")}
              className="flex-1"
              aria-pressed={textAlign === "right"}
            >
              <AlignRight className="w-4 h-4 mr-2" />
              Right
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="font-family">Font Family</Label>
          <Select value={fontFamily} onValueChange={onFontChange}>
            <SelectTrigger id="font-family" className="border-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Arial">Arial</SelectItem>
              <SelectItem value="Georgia">Georgia</SelectItem>
              <SelectItem value="Times New Roman">Times New Roman</SelectItem>
              <SelectItem value="Courier New">Courier New</SelectItem>
              <SelectItem value="Verdana">Verdana</SelectItem>
              <SelectItem value="Impact">Impact</SelectItem>
              <SelectItem value="Chau Philomene One">
                Chau Philomene One
              </SelectItem>
              <SelectItem value="Reusco Display">Reusco Display</SelectItem>
              {uploadedFonts.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input
            ref={fontInputRef}
            type="file"
            accept=".ttf,.otf,.woff,.woff2"
            onChange={handleFontFileChange}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fontInputRef.current?.click()}
          >
            <Upload className="w-3 h-3 mr-1" />
            Upload font
          </Button>
          {fontError && <p className="text-sm text-destructive">{fontError}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="text-color">Text Color</Label>
          <div className="flex gap-2">
            <Input
              id="text-color"
              type="color"
              value={textColor}
              onChange={(e) => onColorChange(e.target.value)}
              className="w-20 h-10 cursor-pointer border-2"
            />
            <Input
              type="text"
              value={textColor}
              onChange={(e) => onColorChange(e.target.value)}
              className="flex-1 border-2"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
