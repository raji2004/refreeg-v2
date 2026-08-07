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
  cropRequired?: boolean;
  cropOutputWidth?: number;
  cropOutputHeight?: number;
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

type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type CropBatch = {
  files: File[];
  imageIndexes: number[];
  position: number;
  results: Array<File | undefined>;
};

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
  x: 10,
  y: 10,
  width: 80,
  height: 80,
});

function getCropSetup(imageAspect: number, cropAspect: number) {
  const safeImageAspect =
    Number.isFinite(imageAspect) && imageAspect > 0 ? imageAspect : cropAspect;
  const safeCropAspect =
    Number.isFinite(cropAspect) && cropAspect > 0
      ? cropAspect
      : DEFAULT_CROP_ASPECT;

  const bounds: CropRect =
    safeImageAspect >= safeCropAspect
      ? {
          x: 0,
          y: (100 - (safeCropAspect / safeImageAspect) * 100) / 2,
          width: 100,
          height: (safeCropAspect / safeImageAspect) * 100,
        }
      : {
          x: (100 - (safeImageAspect / safeCropAspect) * 100) / 2,
          y: 0,
          width: (safeImageAspect / safeCropAspect) * 100,
          height: 100,
        };

  // The preview frame uses the requested output aspect ratio, so equal
  // percentage width and height produces an exact crop of that ratio.
  const size = Math.min(bounds.width, bounds.height);
  return {
    bounds,
    cropRect: {
      x: bounds.x + (bounds.width - size) / 2,
      y: bounds.y + (bounds.height - size) / 2,
      width: size,
      height: size,
    },
  };
}

const createCroppedImage = async ({
  file,
  src,
  zoom,
  cropRect,
  frameWidth,
  frameHeight,
  targetWidth,
  targetHeight,
}: {
  file: File;
  src: string;
  zoom: number;
  cropRect: { x: number; y: number; width: number; height: number };
  frameWidth: number;
  frameHeight: number;
  targetWidth?: number;
  targetHeight?: number;
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

  const outputWidth = targetWidth ?? Math.round(sourceWidth);
  const outputHeight = targetHeight ?? Math.round(sourceHeight);
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is unavailable");
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
    throw new Error("Could not create the cropped image");
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
  cropRequired = false,
  cropOutputWidth,
  cropOutputHeight,
  autoNormalize = false,
}: ImageUploadProps) {
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [cropSource, setCropSource] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState([1]);
  const [cropRect, setCropRect] = React.useState<CropRect>(getInitialCropRect);
  const [cropBounds, setCropBounds] = React.useState<CropRect>({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });
  const [cropError, setCropError] = React.useState<string | null>(null);
  const [preparationError, setPreparationError] = React.useState<string | null>(
    null,
  );
  const [isCropping, setIsCropping] = React.useState(false);
  const [isNormalizing, setIsNormalizing] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [cropProgress, setCropProgress] = React.useState({
    current: 1,
    total: 1,
  });
  const previewFrameRef = React.useRef<HTMLDivElement | null>(null);
  const cropBatchRef = React.useRef<CropBatch | null>(null);
  const dragStateRef = React.useRef<{
    startX: number;
    startY: number;
    startRect: CropRect;
  } | null>(null);

  const shouldCropFile = React.useCallback(
    (file: File) =>
      enableCrop &&
      acceptAllowsImages(accept) &&
      file.type.startsWith("image/"),
    [accept, enableCrop],
  );

  const resetCropState = React.useCallback(() => {
    setPendingFile(null);
    setCropSource(null);
    setZoom([1]);
    setCropRect(getInitialCropRect());
    setCropBounds({ x: 0, y: 0, width: 100, height: 100 });
    setCropError(null);
    setPreparationError(null);
    setIsCropping(false);
    setIsDragging(false);
    setCropProgress({ current: 1, total: 1 });
    cropBatchRef.current = null;
    dragStateRef.current = null;
  }, []);

  const prepareCropFile = React.useCallback(
    async (file: File) => {
      try {
        const preview = await readFileAsDataUrl(file);
        const image = await loadImage(preview);
        const setup = getCropSetup(
          image.naturalWidth / image.naturalHeight,
          cropAspect,
        );
        setPendingFile(file);
        setCropSource(preview);
        setZoom([1]);
        setCropBounds(setup.bounds);
        setCropRect(setup.cropRect);
        setCropError(null);
        return true;
      } catch (error) {
        console.error("Failed to prepare image crop preview:", error);
        return false;
      }
    },
    [cropAspect],
  );

  const completeCropFile = React.useCallback(
    async (completedFile: File) => {
      const batch = cropBatchRef.current;
      if (!batch) {
        onUpload([completedFile]);
        resetCropState();
        return;
      }

      const currentIndex = batch.imageIndexes[batch.position];
      batch.results[currentIndex] = completedFile;
      let nextPosition = batch.position + 1;

      while (nextPosition < batch.imageIndexes.length) {
        batch.position = nextPosition;
        const nextIndex = batch.imageIndexes[nextPosition];
        const nextFile = batch.files[nextIndex];
        if (await prepareCropFile(nextFile)) {
          setCropProgress({
            current: nextPosition + 1,
            total: batch.imageIndexes.length,
          });
          return;
        }

        if (cropRequired) {
          cropBatchRef.current = null;
          setPendingFile(null);
          setCropSource(null);
          setPreparationError(
            "Could not open the crop editor for one of these images. Try another JPG, PNG, or WebP file.",
          );
          return;
        }

        batch.results[nextIndex] = nextFile;
        nextPosition += 1;
      }

      const completedBatch = batch.results.filter(
        (file): file is File => Boolean(file),
      );
      resetCropState();
      onUpload(completedBatch);
    },
    [cropRequired, onUpload, prepareCropFile, resetCropState],
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const [firstFile] = acceptedFiles;

      if (!firstFile) return;
      setPreparationError(null);

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

      const imageIndexes = acceptedFiles.reduce<number[]>((indexes, file, index) => {
        if (shouldCropFile(file)) indexes.push(index);
        return indexes;
      }, []);

      if (imageIndexes.length === 0) {
        onUpload(acceptedFiles);
        return;
      }

      const batch: CropBatch = {
        files: acceptedFiles,
        imageIndexes,
        position: 0,
        results: acceptedFiles.map((file) =>
          shouldCropFile(file) ? undefined : file,
        ),
      };
      cropBatchRef.current = batch;
      setCropProgress({ current: 1, total: imageIndexes.length });

      const firstImage = acceptedFiles[imageIndexes[0]];
      if (await prepareCropFile(firstImage)) return;

      if (cropRequired) {
        cropBatchRef.current = null;
        setPreparationError(
          "Could not open the crop editor for this image. Try another JPG, PNG, or WebP file.",
        );
        return;
      }

      await completeCropFile(firstImage);
    },
    [
      autoNormalize,
      completeCropFile,
      cropAspect,
      cropRequired,
      onUpload,
      prepareCropFile,
      shouldCropFile,
    ],
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
        targetWidth: cropOutputWidth,
        targetHeight: cropOutputHeight,
      });
      await completeCropFile(croppedFile);
    } catch (error) {
      console.error("Failed to crop image:", error);
      if (cropRequired) {
        setCropError(
          "Could not crop this image. Try another JPG, PNG, or WebP file.",
        );
      } else {
        await completeCropFile(pendingFile);
      }
    } finally {
      setIsCropping(false);
    }
  }, [
    cropRect,
    cropSource,
    cropOutputHeight,
    cropOutputWidth,
    cropRequired,
    completeCropFile,
    pendingFile,
    zoom,
  ]);

  const handlePointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!cropSource) return;

      dragStateRef.current = {
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
      const { startRect } = dragState;
      const currentZoom = zoom[0] ?? 1;
      const zoomedBounds = {
        x: 50 + (cropBounds.x - 50) * currentZoom,
        y: 50 + (cropBounds.y - 50) * currentZoom,
        width: cropBounds.width * currentZoom,
        height: cropBounds.height * currentZoom,
      };
      const minX = Math.max(0, zoomedBounds.x);
      const minY = Math.max(0, zoomedBounds.y);
      const maxX =
        Math.min(100, zoomedBounds.x + zoomedBounds.width) - startRect.width;
      const maxY =
        Math.min(100, zoomedBounds.y + zoomedBounds.height) - startRect.height;

      setCropRect({
        ...startRect,
        x: Math.max(minX, Math.min(maxX, startRect.x + deltaXPct)),
        y: Math.max(minY, Math.min(maxY, startRect.y + deltaYPct)),
      });
    },
    [cropBounds, zoom],
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
          ) : enableCrop && acceptAllowsImages(accept) ? (
            <p className="text-[11px] text-muted-foreground/80">
              {cropRequired
                ? "A crop step opens after you select an image."
                : maxFiles === 1
                  ? "You can crop the image before it is added."
                  : "A crop step opens for each selected image."}
            </p>
          ) : null}
        </div>
      </div>
      {preparationError && (
        <p className="mt-2 text-sm font-medium text-red-600" role="alert">
          {preparationError}
        </p>
      )}
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
            <DialogTitle>
              Crop Image
              {cropProgress.total > 1
                ? ` ${cropProgress.current} of ${cropProgress.total}`
                : ""}
            </DialogTitle>
            <DialogDescription>
              Adjust the framing before adding the image. The crop uses a{" "}
              {cropAspect === DEFAULT_CROP_ASPECT ? "16:9" : "custom"} frame
              {cropOutputWidth && cropOutputHeight
                ? ` with a recommended ${cropOutputWidth} × ${cropOutputHeight} px output.`
                : "."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div
              ref={previewFrameRef}
              className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950"
              style={{ aspectRatio: cropAspect }}
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
                  data-crop-selection="fixed-aspect"
                  className={`pointer-events-auto absolute border-2 border-white bg-transparent shadow-[0_0_0_9999px_rgba(15,23,42,0.5)] ${
                    isDragging ? "cursor-grabbing" : "cursor-grab"
                  }`}
                  style={{
                    left: `${cropRect.x}%`,
                    top: `${cropRect.y}%`,
                    width: `${cropRect.width}%`,
                    height: `${cropRect.height}%`,
                  }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                >
                  <div className="absolute inset-0 bg-transparent" />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-slate-500">
                  Drag the frame to position the crop, then use zoom for a
                  tighter shot.
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
            {cropError && (
              <p className="text-sm font-medium text-red-600" role="alert">
                {cropError}
              </p>
            )}
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
            {!cropRequired && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (pendingFile) {
                    void completeCropFile(pendingFile);
                  }
                }}
                disabled={isCropping}
                className="w-full bg-slate-100 text-slate-800 hover:bg-slate-200 sm:w-auto"
              >
                Use Original
              </Button>
            )}
            <Button
              type="button"
              onClick={handleCropConfirm}
              disabled={isCropping}
              className="w-full bg-slate-900 text-white hover:bg-slate-800 sm:w-auto"
            >
              {isCropping
                ? "Cropping..."
                : cropRequired
                  ? "Apply recommended crop"
                  : "Apply Crop"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
