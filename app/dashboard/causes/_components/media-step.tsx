import Image from "next/image";
import dynamic from "next/dynamic";
import { Plus } from "lucide-react";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CAUSE_COVER_ACCEPT,
  CAUSE_COVER_DESCRIPTION,
  CAUSE_COVER_HEIGHT,
  CAUSE_COVER_WIDTH,
} from "@/lib/media/cause-cover";
import { isProxyMediaUrl } from "@/lib/s3/media";
import {
  MAX_GALLERY_FILES,
  type CauseFormErrors,
  type CauseFormValues,
} from "@/lib/schemas/cause.schema";
import { FieldError } from "@/components/ui/field-error";

const ImageUpload = dynamic(
  () => import("@/components/ui/image-upload").then((mod) => mod.ImageUpload),
  { loading: () => <Skeleton className="h-40 w-full" /> },
);

const SelectedMediaCarousel = dynamic(
  () =>
    import("@/components/ui/premium/selected-media-carousel").then(
      (mod) => mod.SelectedMediaCarousel,
    ),
  { loading: () => <Skeleton className="h-[200px] w-full" />, ssr: false },
);

const GALLERY_ACCEPT = {
  ...CAUSE_COVER_ACCEPT,
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
};

const labelClass = "block text-sm font-semibold text-gray-700 sm:text-base";
const panelClass = "rounded-2xl border border-mist bg-white px-3 py-4 sm:p-6";

type Props = {
  form: CauseFormValues;
  errors: CauseFormErrors;
  setFormFields: <K extends keyof CauseFormValues>(
    key: K,
    value: CauseFormValues[K],
  ) => void;
  onCoverUpload: (files: File[]) => void;
  onCoverRemove: () => void;
  onGalleryUpload: (files: File[]) => void;
  onGalleryRemove: (index: number) => void;
};

export function CauseMediaStep({
  form,
  errors,
  setFormFields,
  onCoverUpload,
  onCoverRemove,
  onGalleryUpload,
  onGalleryRemove,
}: Props) {
  const coverSrc = form.coverImage
    ? URL.createObjectURL(form.coverImage)
    : form.image;
  const setLink = (index: number, value: string) =>
    setFormFields(
      "videoLinks",
      form.videoLinks.map((link, i) => (i === index ? value : link)),
    );

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="space-y-4">
        <Label className={labelClass}>Cover Image</Label>
        <div className={panelClass}>
          <ImageUpload
            onUpload={onCoverUpload}
            maxFiles={1}
            accept={CAUSE_COVER_ACCEPT}
            enableCrop
            cropAspect={16 / 9}
            cropRequired
            cropOutputWidth={CAUSE_COVER_WIDTH}
            cropOutputHeight={CAUSE_COVER_HEIGHT}
            description={`${CAUSE_COVER_DESCRIPTION} · up to 100MB`}
          />
          {coverSrc && (
            <div className="group relative mt-4 aspect-video overflow-hidden rounded-xl border border-brand/10 shadow-sm">
              <Image
                src={coverSrc}
                alt="Cover Preview"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                unoptimized={
                  Boolean(form.coverImage) || isProxyMediaUrl(coverSrc)
                }
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {form.coverImage && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={onCoverRemove}
                  className="absolute right-3 top-3 h-9 w-9 rounded-full border border-white/60 p-0 shadow-sm"
                  aria-label="Remove cover image"
                >
                  <Icons.trash className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
          <FieldError message={errors.coverImage} className="mt-2" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Label className={labelClass}>Multimedia Gallery</Label>
          <span className="w-fit rounded-full border border-mist-light bg-[#F8FAFC] px-2.5 py-1 text-xs font-semibold text-steel">
            Max 5 files · 2 videos (MP4/WebM, 50MB, 90s)
          </span>
        </div>
        <div className={panelClass}>
          <ImageUpload
            onUpload={onGalleryUpload}
            maxFiles={MAX_GALLERY_FILES - form.multimedia.length}
            accept={GALLERY_ACCEPT}
            enableCrop
            cropAspect={16 / 9}
            cropOutputWidth={CAUSE_COVER_WIDTH}
            cropOutputHeight={CAUSE_COVER_HEIGHT}
            description="Select up to 5 images and crop each one, or keep its original framing; videos may be MP4/WebM (max 50MB / 90s each)"
          />
          <FieldError message={errors.multimedia} className="mt-2" />
          {form.multimedia.length > 0 && (
            <div className="mt-6">
              <SelectedMediaCarousel
                files={form.multimedia}
                onRemove={onGalleryRemove}
                variant="refreeg"
              />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <Label className={labelClass}>Video Links (Optional)</Label>
        <div className="space-y-3">
          {form.videoLinks.map((link, index) => (
            <div
              key={index}
              className="group flex flex-col gap-2 animate-in slide-in-from-left-2 sm:flex-row"
            >
              <Input
                value={link}
                onChange={(e) => setLink(index, e.target.value)}
                placeholder="YouTube or Vimeo link"
                className="h-11 premium-input bg-white sm:h-12"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setFormFields(
                    "videoLinks",
                    form.videoLinks.filter((_, i) => i !== index),
                  )
                }
                className="h-11 shrink-0 rounded-xl border-[#E7B9B5] bg-white px-5 font-semibold text-[#B42318] shadow-none hover:border-[#D77A72] hover:bg-[#FFF4F2] hover:text-[#912018] sm:h-12"
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            onClick={() =>
              setFormFields("videoLinks", [...form.videoLinks, ""])
            }
            variant="outline"
            className="h-11 w-full rounded-xl border border-dashed border-[#B8C5D3] bg-white text-steel shadow-none hover:border-blue-steel hover:bg-[#F4F8FC] hover:text-blue-steel sm:h-12"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add video link
          </Button>
        </div>
      </div>
    </div>
  );
}
