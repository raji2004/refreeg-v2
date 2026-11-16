import Image from "next/image";
import dynamic from "next/dynamic";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useObjectUrl } from "@/hooks/use-object-urls";
import { isProxyMediaUrl } from "@/lib/s3/media";
import { MAX_PETITION_FILES } from "@/lib/schemas/petition.schema";
import { FieldError } from "@/components/ui/field-error";
import type { PetitionCopy } from "./petition-copy";
import type { PetitionFormApi } from "@/hooks/use-petition-form";

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

const labelClass = "text-base font-semibold text-gray-700 block";

type Props = Pick<
  PetitionFormApi,
  | "form"
  | "errors"
  | "uploadCover"
  | "removeCover"
  | "uploadGallery"
  | "removeGalleryFile"
  | "setVideoLink"
  | "addVideoLink"
  | "removeVideoLink"
> & { copy: PetitionCopy };

export function PetitionMediaStep({
  form,
  errors,
  uploadCover,
  removeCover,
  uploadGallery,
  removeGalleryFile,
  setVideoLink,
  addVideoLink,
  removeVideoLink,
  copy,
}: Props) {
  const pickedCover = useObjectUrl(form.coverImage);
  const coverSrc = pickedCover || form.image;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-gradient">Visual Impact</h3>
        <p className="text-sm text-gray-500">{copy.mediaText}</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <Label className={labelClass}>Cover Image</Label>
          <div className="glass-panel p-6 rounded-2xl border-brand/10 transition-all hover:border-brand/30">
            <ImageUpload onUpload={uploadCover} maxFiles={1} />
            {coverSrc && (
              <div className="mt-4 relative group aspect-video rounded-xl overflow-hidden shadow-sm border border-brand/10">
                <Image
                  src={coverSrc}
                  alt="Cover preview"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  unoptimized={
                    Boolean(pickedCover) || isProxyMediaUrl(coverSrc)
                  }
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {form.coverImage && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={removeCover}
                      className="rounded-full h-10 w-10 p-0"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                )}
              </div>
            )}
            <FieldError message={errors.coverImage} className="mt-2" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className={labelClass}>{copy.galleryLabel}</Label>
            <span className="text-xs text-brand font-medium bg-brand/5 px-2 py-1 rounded-full border border-brand/10">
              Max {MAX_PETITION_FILES} files
            </span>
          </div>
          <div className="glass-panel p-6 rounded-2xl border-brand/10">
            <ImageUpload
              onUpload={uploadGallery}
              maxFiles={MAX_PETITION_FILES - form.multimedia.length}
              description={`Upload up to ${MAX_PETITION_FILES} files`}
            />
            <FieldError message={errors.multimedia} className="mt-2" />
            {form.multimedia.length > 0 && (
              <div className="mt-6">
                <SelectedMediaCarousel
                  files={form.multimedia}
                  onRemove={removeGalleryFile}
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <Label className={labelClass}>{copy.linksLabel}</Label>
          <div className="space-y-3">
            {form.videoLinks.map((link, index) => (
              <div
                key={index}
                className="flex gap-2 group animate-in slide-in-from-left-2"
              >
                <Input
                  value={link}
                  onChange={(e) => setVideoLink(index, e.target.value)}
                  placeholder={copy.linkPlaceholder}
                  className="premium-input bg-white"
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeVideoLink(index)}
                  className="text-red-500 hover:bg-red-50 rounded-lg h-12"
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              onClick={addVideoLink}
              variant="outline"
              className="h-12 w-full rounded-xl border-2 border-dashed border-gray-200 bg-transparent text-gray-500 transition-colors hover:border-brand/30 hover:bg-brand/5 hover:text-brand"
            >
              {copy.addLink}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
