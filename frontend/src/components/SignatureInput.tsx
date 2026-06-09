import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUp, Edit2, Trash2, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface SignatureInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SignatureInput({
  id,
  label,
  value,
  onChange,
  placeholder = "Type signature name...",
}: SignatureInputProps) {
  const [isDrawOpen, setIsDrawOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Checks if the signature value is a base64 image data URL
  const isImage = value && value.startsWith("data:image/");

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === "string") {
          onChange(result);
        }
      };
      reader.readAsDataURL(file);
    }
    // Clear the input value so the same file can be uploaded again if needed
    e.target.value = "";
  };

  const openDrawModal = () => {
    setIsDrawOpen(true);
    // Give state a moment to render the dialog before drawing on it
    setTimeout(() => {
      clearCanvas();
    }, 100);
  };

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set pointer capture to ensure we get events even if the cursor leaves the canvas boundaries
    canvas.setPointerCapture(e.pointerId);

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a"; // Slate 900
    setIsDrawing(true);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (err) {
        // Safe fallback if pointer capture release fails
      }
    }
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Check if the canvas is empty by comparing with a blank canvas,
    // or simply save the contents if the user drew something.
    const dataUrl = canvas.toDataURL("image/png");
    onChange(dataUrl);
    setIsDrawOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-semibold text-slate-700">
          {label}
        </Label>
        {isImage && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange("")}
            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 px-2 text-xs"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        )}
      </div>

      {isImage ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-lg p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
          <img
            src={value}
            alt={`${label} Preview`}
            className="max-h-20 max-w-full object-contain pointer-events-none"
          />
          <div className="flex gap-2 mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openDrawModal}
              className="text-xs h-7 gap-1 px-2"
            >
              <Edit2 className="h-3 w-3" /> Re-draw
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUploadClick}
              className="text-xs h-7 gap-1 px-2"
            >
              <FileUp className="h-3 w-3" /> Re-upload
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            id={id}
            value={value || ""}
            onChange={handleTextChange}
            placeholder={placeholder}
            className="border-slate-200 focus-visible:ring-emerald-500 bg-white"
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openDrawModal}
              className="text-xs text-slate-600 border-slate-200 hover:bg-slate-50 gap-1 h-7 px-2"
            >
              <Edit2 className="h-3 w-3" /> Draw Signature
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUploadClick}
              className="text-xs text-slate-600 border-slate-200 hover:bg-slate-50 gap-1 h-7 px-2"
            >
              <FileUp className="h-3 w-3" /> Upload Signature
            </Button>
          </div>
        </div>
      )}

      {/* Hidden file input for uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Drawing Pad Modal Dialog */}
      <Dialog open={isDrawOpen} onOpenChange={setIsDrawOpen}>
        <DialogContent className="sm:max-w-xl p-6 rounded-2xl shadow-2xl border border-slate-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Draw Your Signature
            </DialogTitle>
          </DialogHeader>
          
          <div className="my-4">
            <div className="bg-slate-100 rounded-lg p-1 border border-slate-200">
              <canvas
                ref={canvasRef}
                width={550}
                height={200}
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={stopDrawing}
                onPointerLeave={stopDrawing}
                className="w-full h-[200px] bg-white rounded-md cursor-crosshair touch-none border border-slate-200"
              />
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">
              Use your mouse, trackpad, or touchscreen to draw your signature inside the box.
            </p>
          </div>

          <DialogFooter className="flex flex-row items-center justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearCanvas}
              className="text-slate-500 hover:text-slate-800 gap-1 h-8"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
            <div className="flex gap-2 ml-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDrawOpen(false)}
                className="h-8"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={saveCanvas}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"
              >
                Save Signature
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
