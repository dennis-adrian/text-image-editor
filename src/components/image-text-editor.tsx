"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Download, Type, DownloadCloud } from "lucide-react"

export default function ImageTextEditor() {
    const [image, setImage] = useState<HTMLImageElement | null>(null)
    const [textArray, setTextArray] = useState<string[]>(["Your Text Here"])
    const [textInput, setTextInput] = useState("Your Text Here")
    const [textX, setTextX] = useState(50)
    const [textY, setTextY] = useState(50)
    const [textMaxWidth, setTextMaxWidth] = useState(80)
    const [textColor, setTextColor] = useState("#ffffff")
    const [fontFamily, setFontFamily] = useState("Arial")
    const [generatedImages, setGeneratedImages] = useState<HTMLCanvasElement[]>([])

    const fileInputRef = useRef<HTMLInputElement>(null)

    const calculateFontSize = (
        ctx: CanvasRenderingContext2D,
        text: string,
        maxWidth: number,
        fontFamily: string,
        minSize = 12,
        maxSize = 200,
    ): number => {
        let fontSize = maxSize

        while (fontSize > minSize) {
            ctx.font = `${fontSize}px ${fontFamily}`
            const metrics = ctx.measureText(text)

            if (metrics.width <= maxWidth) {
                return fontSize
            }

            fontSize -= 2
        }

        return minSize
    }

    useEffect(() => {
        if (!image || textArray.length === 0) {
            setGeneratedImages([])
            return
        }

        const canvases: HTMLCanvasElement[] = []

        textArray.forEach((text) => {
            const canvas = document.createElement("canvas")
            const ctx = canvas.getContext("2d")
            if (!ctx) return

            // Set canvas size to image size
            canvas.width = image.width
            canvas.height = image.height

            // Draw image
            ctx.drawImage(image, 0, 0)

            // Calculate max width in pixels
            const maxWidthPx = (textMaxWidth / 100) * canvas.width

            // Calculate optimal font size
            const optimalFontSize = calculateFontSize(ctx, text, maxWidthPx, fontFamily)

            // Draw text with calculated font size
            ctx.font = `${optimalFontSize}px ${fontFamily}`
            ctx.fillStyle = textColor
            ctx.textBaseline = "top"

            // Add text shadow for better visibility
            ctx.shadowColor = "rgba(0, 0, 0, 0.5)"
            ctx.shadowBlur = 4
            ctx.shadowOffsetX = 2
            ctx.shadowOffsetY = 2

            const x = (textX / 100) * canvas.width
            const y = (textY / 100) * canvas.height
            ctx.fillText(text, x, y, maxWidthPx)

            canvases.push(canvas)
        })

        setGeneratedImages(canvases)
    }, [image, textArray, textX, textY, textMaxWidth, textColor, fontFamily])

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            const img = new Image()
            img.crossOrigin = "anonymous"
            img.onload = () => {
                setImage(img)
            }
            img.src = event.target?.result as string
        }
        reader.readAsDataURL(file)
    }

    const handleTextInputChange = (value: string) => {
        setTextInput(value)
        const lines = value.split("\n").filter((line) => line.trim() !== "")
        setTextArray(lines.length > 0 ? lines : [""])
    }

    const handleDownloadSingle = (canvas: HTMLCanvasElement, index: number) => {
        canvas.toBlob((blob) => {
            if (!blob) return

            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `edited-image-${index + 1}.png`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        })
    }

    const handleDownloadAll = () => {
        generatedImages.forEach((canvas, index) => {
            setTimeout(() => {
                handleDownloadSingle(canvas, index)
            }, index * 200) // Stagger downloads to avoid browser blocking
        })
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="mb-8 text-center">
                <h1 className="text-4xl font-bold mb-2 text-foreground">Image Text Editor</h1>
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
                            <CardDescription>Choose an image to add text overlay</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
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
                            <CardDescription>Add multiple texts (one per line) with auto-sizing</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="text">Text Content (one per line)</Label>
                                <Textarea
                                    id="text"
                                    value={textInput}
                                    onChange={(e) => handleTextInputChange(e.target.value)}
                                    placeholder="Enter your texts, one per line&#10;Each line will create a new image&#10;Text size adjusts automatically"
                                    className="border-2 min-h-[120px] font-mono"
                                    rows={5}
                                />
                                <p className="text-sm text-muted-foreground">
                                    {textArray.length} image{textArray.length !== 1 ? "s" : ""} will be generated
                                </p>
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
                                        <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                                        <SelectItem value="Courier New">Courier New</SelectItem>
                                        <SelectItem value="Verdana">Verdana</SelectItem>
                                        <SelectItem value="Impact">Impact</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="text-width">Text Max Width: {textMaxWidth}%</Label>
                                <Slider
                                    id="text-width"
                                    min={10}
                                    max={100}
                                    step={5}
                                    value={[textMaxWidth]}
                                    onValueChange={(value) => setTextMaxWidth(value[0])}
                                    className="py-4"
                                />
                                <p className="text-xs text-muted-foreground">Font size adjusts automatically to fit this width</p>
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

                            <div className="space-y-2">
                                <Label htmlFor="position-x">Horizontal Position: {textX}%</Label>
                                <Slider
                                    id="position-x"
                                    min={0}
                                    max={100}
                                    step={1}
                                    value={[textX]}
                                    onValueChange={(value) => setTextX(value[0])}
                                    className="py-4"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="position-y">Vertical Position: {textY}%</Label>
                                <Slider
                                    id="position-y"
                                    min={0}
                                    max={100}
                                    step={1}
                                    value={[textY]}
                                    onValueChange={(value) => setTextY(value[0])}
                                    className="py-4"
                                />
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
                            <CardTitle>Preview</CardTitle>
                            <CardDescription>
                                {image
                                    ? `Showing ${generatedImages.length} generated image${generatedImages.length !== 1 ? "s" : ""}`
                                    : "Upload an image to get started"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {generatedImages.length > 0 ? (
                                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                                    {generatedImages.map((canvas, index) => (
                                        <div key={index} className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-muted-foreground">
                                                    Image {index + 1}: "{textArray[index]}"
                                                </p>
                                                <Button
                                                    onClick={() => handleDownloadSingle(canvas, index)}
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
    )
}
