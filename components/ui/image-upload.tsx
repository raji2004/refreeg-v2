"use client";

import * as React from "react";
import { useCallback } from "react";
import Image from "next/image";
import { useDropzone } from "react-dropzone";
import { Button } from "./button";
import { Icons } from "@/components/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Slider } from "./slider";

type AcceptProp = string | Record<string, string[]>;

interface ImageUploadProps {
  onUpload: (files: File[]) => void;
  maxFiles?: number;
  accept?: AcceptProp;
  description?: string;
  enableCrop?: boolean;
  cropAspect?: number;
  autoNormalize?: boolean;
}

function toDropzoneAccept(
  accept?: AcceptProp,
): Record<string, string[]> | undefined {
  if (!accept) return undefined;
  if (typeof accept !== "string") return accept;
  const parts = accept
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const result: Record<string, string[]> = {};
  for (const part of parts) {
    result[part] = [];
  }
  return result;
}

function acceptAllowsImages(accept: AcceptProp): boolean {
  if (typeof accept === "string") {
    return accept.split(",").some((p) => p.trim().startsWith("image"));
  }
  return Object.keys(accept).some((k) => k.startsWith("image"));
}

const DEFAULT_CROP_ASPECT = 16 / 9;
const MIN_CROP_WIDTH = 18;
const MIN_CROP_HEIGHT = 18;

type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DragMode =
  | "move"
  | "n"
  | "s"
  | "e"
  | "w"
  | "nw"
  | "ne"
  | "sw"
  | "se";

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

const normalizeImageToAspect = async (
  file: File,
  aspect: number,
): Promise<File> => {
  const src = await readFileAsDataUrl(file);
  const image = await loadImage(src);
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9;
  const outputWidth = 1600;
  const outputHeight = Math.round(outputWidth / safeAspect);
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const context = canvas.getContext("2d");
  if (!context) return file;

  // Fill the fixed frame without discarding any of the original image. The
  // softened backdrop makes portrait and square uploads feel intentional.
  const coverScale = Math.max(
    outputWidth / image.naturalWidth,
    outputHeight / image.naturalHeight,
  );
  const backdropWidth = image.naturalWidth * coverScale * 1.08;
  const backdropHeight = image.naturalHeight * coverScale * 1.08;
  context.save();
  context.filter = "blur(32px) brightness(0.68)";
  context.drawImage(
    image,
    (outputWidth - backdropWidth) / 2,
    (outputHeight - backdropHeight) / 2,
    backdropWidth,
    backdropHeight,
  );
  context.restore();

  context.fillStyle = "rgba(15, 23, 42, 0.14)";
  context.fillRect(0, 0, outputWidth, outputHeight);

  const containScale = Math.min(
    outputWidth / image.naturalWidth,
    outputHeight / image.naturalHeight,
  );
  const imageWidth = image.naturalWidth * containScale;
  const imageHeight = image.naturalHeight * containScale;
  context.drawImage(
    image,
    (outputWidth - imageWidth) / 2,
    (outputHeight - imageHeight) / 2,
    imageWidth,
    imageHeight,
  );

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.9);
  });
  if (!blob) return file;

  return new File(
    [blob],
    `${file.name.replace(/\.[^/.]+$/, "")}-16x9.jpg`,
    {
      type: "image/jpeg",
      lastModified: Date.now(),
    },
  );
};

const getInitialCropRect = (): CropRect => ({
  x: 20,
  y: 18,
  width: 60,
  height: 48,
});

const createCroppedImage = async ({
  file,
  src,
  zoom,
  cropRect,
  frameWidth,
  frameHeight,
}: {
  file: File;
  src: string;
  zoom: number;
  cropRect: { x: number; y: number; width: number; height: number };
  frameWidth: number;
  frameHeight: number;
}) => {
  const image = await loadImage(src);
  const baseScale = Math.min(frameWidth / image.width, frameHeight / image.height);
  const scaledWidth = image.width * baseScale * zoom;
  const scaledHeight = image.height * baseScale * zoom;
  const imageLeft = (frameWidth - scaledWidth) / 2;
  const imageTop = (frameHeight - scaledHeight) / 2;

  const sourceX = Math.max(
    0,
    Math.min(image.width, (cropRect.x - imageLeft) / (baseScale * zoom)),
  );
  const sourceY = Math.max(
    0,
    Math.min(image.height, (cropRect.y - imageTop) / (baseScale * zoom)),
  );
  const sourceWidth = Math.max(
    1,
    Math.min(image.width - sourceX, cropRect.width / (baseScale * zoom)),
  );
  const sourceHeight = Math.max(
    1,
    Math.min(image.height - sourceY, cropRect.height / (baseScale * zoom)),
  );

  const outputWidth = Math.round(sourceWidth);
  const outputHeight = Math.round(sourceHeight);
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    return file;
  }

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const extension = mimeType === "image/png" ? "png" : "jpg";

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mimeType, mimeType === "image/png" ? undefined : 0.92);
  });

  if (!blob) {
    return file;
  }

  return new File(
    [blob],
    `${file.name.replace(/\.[^/.]+$/, "")}-cropped.${extension}`,
    {
      type: mimeType,
      lastModified: Date.now(),
    },
  );
};

export function ImageUpload({
  onUpload,
  maxFiles = 1,
  accept = "image/*",
  description,
  enableCrop = true,
  cropAspect = DEFAULT_CROP_ASPECT,
  autoNormalize = false,
}: ImageUploadProps) {
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [cropSource, setCropSource] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState([1]);
  const [cropRect, setCropRect] = React.useState<CropRect>(getInitialCropRect);
  const [isCropping, setIsCropping] = React.useState(false);
  const [isNormalizing, setIsNormalizing] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const previewFrameRef = React.useRef<HTMLDivElement | null>(null);
  const dragStateRef = React.useRef<{
    mode: DragMode;
    startX: number;
    startY: number;
    startRect: CropRect;
  } | null>(null);

  const shouldCropFile = React.useCallback(
    (file: File) =>
      enableCrop &&
      maxFiles === 1 &&
      acceptAllowsImages(accept) &&
      file.type.startsWith("image/"),
    [accept, enableCrop, maxFiles],
  );

  const resetCropState = React.useCallback(() => {
    setPendingFile(null);
    setCropSource(null);
    setZoom([1]);
    setCropRect(getInitialCropRect());
    setIsCropping(false);
    setIsDragging(false);
    dragStateRef.current = null;
  }, []);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const [firstFile] = acceptedFiles;

      if (!firstFile) {
        return;
      }

      if (autoNormalize) {
        setIsNormalizing(true);
        try {
          const normalizedFiles = await Promise.all(
            acceptedFiles.map((file) =>
              file.type.startsWith("image/")
                ? normalizeImageToAspect(file, cropAspect)
                : Promise.resolve(file),
            ),
          );
          onUpload(normalizedFiles);
        } catch (error) {
          console.error("Failed to normalize uploaded image:", error);
          onUpload(acceptedFiles);
        } finally {
          setIsNormalizing(false);
        }
        return;
      }

      if (shouldCropFile(firstFile)) {
        try {
          const preview = await readFileAsDataUrl(firstFile);
          setPendingFile(firstFile);
          setCropSource(preview);
          setZoom([1]);
          setCropRect(getInitialCropRect());
          return;
        } catch (error) {
          console.error("Failed to prepare image crop preview:", error);
        }
      }

      onUpload(acceptedFiles);
    },
    [autoNormalize, cropAspect, onUpload, shouldCropFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    disabled: isNormalizing,
    accept: toDropzoneAccept(accept),
  });

  const handleCropConfirm = React.useCallback(async () => {
    const frame = previewFrameRef.current;

    if (!pendingFile || !cropSource || !frame) {
      return;
    }

    setIsCropping(true);
    try {
      const frameWidth = frame.clientWidth;
      const frameHeight = frame.clientHeight;
      const croppedFile = await createCroppedImage({
        file: pendingFile,
        src: cropSource,
        zoom: zoom[0] ?? 1,
        cropRect: {
          x: (cropRect.x / 100) * frameWidth,
          y: (cropRect.y / 100) * frameHeight,
          width: (cropRect.width / 100) * frameWidth,
          height: (cropRect.height / 100) * frameHeight,
        },
        frameWidth,
        frameHeight,
      });
      onUpload([croppedFile]);
      resetCropState();
    } catch (error) {
      console.error("Failed to crop image:", error);
      onUpload([pendingFile]);
      resetCropState();
    }
  }, [
    cropRect,
    cropSource,
    onUpload,
    pendingFile,
    resetCropState,
    zoom,
  ]);

  const handlePointerDown = React.useCallback(
    (mode: DragMode) => (event: React.PointerEvent<HTMLDivElement>) => {
      if (!cropSource) {
        return;
      }

      dragStateRef.current = {
        mode,
        startX: event.clientX,
        startY: event.clientY,
        startRect: cropRect,
      };
      setIsDragging(true);
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [cropRect, cropSource],
  );

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const dragState = dragStateRef.current;
      const frame = previewFrameRef.current;

      if (!dragState || !frame) {
        return;
      }

      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;
      const deltaXPct = (deltaX / frame.clientWidth) * 100;
      const deltaYPct = (deltaY / frame.clientHeight) * 100;
      const { mode, startRect } = dragState;

      let nextRect: CropRect = { ...startRect };

      if (mode === "move") {
        nextRect.x = Math.max(
          0,
          Math.min(100 - startRect.width, startRect.x + deltaXPct),
        );
        nextRect.y = Math.max(
          0,
          Math.min(100 - startRect.height, startRect.y + deltaYPct),
        );
      } else {
        if (mode.includes("w")) {
          const nextX = Math.max(
            0,
            Math.min(startRect.x + startRect.width - MIN_CROP_WIDTH, startRect.x + deltaXPct),
          );
          nextRect.width = startRect.width + (startRect.x - nextX);
          nextRect.x = nextX;
        }

        if (mode.includes("e")) {
          const nextWidth = Math.max(
            MIN_CROP_WIDTH,
            Math.min(100 - startRect.x, startRect.width + deltaXPct),
          );
          nextRect.width = nextWidth;
        }

        if (mode.includes("n")) {
          const nextY = Math.max(
            0,
            Math.min(startRect.y + startRect.height - MIN_CROP_HEIGHT, startRect.y + deltaYPct),
          );
          nextRect.height = startRect.height + (startRect.y - nextY);
          nextRect.y = nextY;
        }

        if (mode.includes("s")) {
          const nextHeight = Math.max(
            MIN_CROP_HEIGHT,
            Math.min(100 - startRect.y, startRect.height + deltaYPct),
          );
          nextRect.height = nextHeight;
        }
      }

      setCropRect(nextRect);
    },
    [],
  );

  const handlePointerUp = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      dragStateRef.current = null;
      setIsDragging(false);
    },
    [],
  );

  return (
    <>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25"
        } ${isNormalizing ? "cursor-wait opacity-70" : ""}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <Icons.upload className="h-8 w-8 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">
            {isNormalizing ? (
              <p>Formatting images to 16:9...</p>
            ) : isDragActive ? (
              <p>Drop the files here ...</p>
            ) : (
              <p>
                Drag & drop files here, or{" "}
                <Button variant="link" className="p-0 h-auto" type="button">
                  click to select
                </Button>
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {description ||
              (maxFiles === 1
                ? "Upload a single file"
                : `Upload up to ${maxFiles} files`)}
          </p>
          {autoNormalize && acceptAllowsImages(accept) ? (
            <p className="text-[11px] text-muted-foreground/80">
              Images are automatically formatted to 16:9 without cropping out
              content.
            </p>
          ) : enableCrop && maxFiles === 1 && acceptAllowsImages(accept) ? (
            <p className="text-[11px] text-muted-foreground/80">
              You can crop the image before it is added.
            </p>
          ) : null}
        </div>
      </div>
      <Dialog
        open={Boolean(pendingFile && cropSource)}
        onOpenChange={(open) => {
          if (!open) {
            resetCropState();
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Crop Image</DialogTitle>
            <DialogDescription>
              Adjust the framing before adding the image. The crop uses a{" "}
              {cropAspect === DEFAULT_CROP_ASPECT ? "16:9" : "custom"} frame.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div
              ref={previewFrameRef}
              className="relative aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-slate-950"
            >
              {cropSource && (
                <Image
                  src={cropSource}
                  alt="Crop preview"
                  fill
                  sizes="(max-width: 768px) 100vw, 768px"
                  unoptimized
                  className="object-contain transition-transform duration-150"
                  style={{
                    transform: `scale(${zoom[0] ?? 1})`,
                    transformOrigin: "center",
                  }}
                />
              )}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div
                  className={`pointer-events-auto absolute border-2 border-white bg-transparent shadow-[0_0_0_9999px_rgba(15,23,42,0.5)] ${
                    isDragging ? "cursor-grabbing" : "cursor-grab"
                  }`}
                  style={{
                    left: `${cropRect.x}%`,
                    top: `${cropRect.y}%`,
                    width: `${cropRect.width}%`,
                    height: `${cropRect.height}%`,
                  }}
                  onPointerDown={handlePointerDown("move")}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                >
                  <div className="absolute inset-0 bg-transparent" />
                  <div
                    className="absolute inset-x-0 top-0 h-3 -translate-y-1/2 cursor-n-resize"
                    onPointerDown={handlePointerDown("n")}
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 h-3 translate-y-1/2 cursor-s-resize"
                    onPointerDown={handlePointerDown("s")}
                  />
                  <div
                    className="absolute inset-y-0 left-0 w-3 -translate-x-1/2 cursor-w-resize"
                    onPointerDown={handlePointerDown("w")}
                  />
                  <div
                    className="absolute inset-y-0 right-0 w-3 translate-x-1/2 cursor-e-resize"
                    onPointerDown={handlePointerDown("e")}
                  />
                  <div
                    className="absolute left-0 top-0 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-nw-resize rounded-full border border-white bg-slate-950"
                    onPointerDown={handlePointerDown("nw")}
                  />
                  <div
                    className="absolute right-0 top-0 h-4 w-4 translate-x-1/2 -translate-y-1/2 cursor-ne-resize rounded-full border border-white bg-slate-950"
                    onPointerDown={handlePointerDown("ne")}
                  />
                  <div
                    className="absolute left-0 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-w-resize rounded-full border border-white bg-slate-950"
                    onPointerDown={handlePointerDown("w")}
                  />
                  <div
                    className="absolute right-0 top-1/2 h-4 w-4 translate-x-1/2 -translate-y-1/2 cursor-e-resize rounded-full border border-white bg-slate-950"
                    onPointerDown={handlePointerDown("e")}
                  />
                  <div
                    className="absolute bottom-0 left-0 h-4 w-4 -translate-x-1/2 translate-y-1/2 cursor-sw-resize rounded-full border border-white bg-slate-950"
                    onPointerDown={handlePointerDown("sw")}
                  />
                  <div
                    className="absolute bottom-0 right-0 h-4 w-4 translate-x-1/2 translate-y-1/2 cursor-se-resize rounded-full border border-white bg-slate-950"
                    onPointerDown={handlePointerDown("se")}
                  />
                  <div
                    className="absolute bottom-0 left-1/2 h-4 w-4 -translate-x-1/2 translate-y-1/2 cursor-s-resize rounded-full border border-white bg-slate-950"
                    onPointerDown={handlePointerDown("s")}
                  />
                  <div
                    className="absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-n-resize rounded-full border border-white bg-slate-950"
                    onPointerDown={handlePointerDown("n")}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-slate-500">
                  Drag the box, edges, or corners to choose the crop.
                </p>
                <span className="text-xs text-slate-500">Zoom</span>
              </div>
              <Slider
                min={1}
                max={2.5}
                step={0.01}
                value={zoom}
                onValueChange={setZoom}
                trackClassName="h-1.5 bg-slate-200"
                rangeClassName="bg-slate-300"
                thumbClassName="h-6 w-6 border-0 bg-slate-950 shadow-[0_6px_18px_rgba(15,23,42,0.32)] focus-visible:ring-2 focus-visible:ring-slate-900/20 focus-visible:ring-offset-2"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={resetCropState}
              disabled={isCropping}
              className="w-full border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (pendingFile) {
                  onUpload([pendingFile]);
                  resetCropState();
                }
              }}
              disabled={isCropping}
              className="w-full bg-slate-100 text-slate-800 hover:bg-slate-200 sm:w-auto"
            >
              Use Original
            </Button>
            <Button
              type="button"
              onClick={handleCropConfirm}
              disabled={isCropping}
              className="w-full bg-slate-900 text-white hover:bg-slate-800 sm:w-auto"
            >
              {isCropping ? "Cropping..." : "Apply Crop"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
