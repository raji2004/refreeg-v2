"use client";

import React, { useRef } from "react";
import { useCampaignFlow } from "../campaign-flow-provider";
import {
  Upload,
  Image as ImageIcon,
  FileText,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Check,
} from "lucide-react";
import Image from "next/image";

export function Step4Photos() {
  const { draft, updateDraft, nextStep, prevStep } = useCampaignFlow();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    updateDraft({
      coverImage: file,
      coverImagePreview: previewUrl,
    });
  };

  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    updateDraft({
      galleryImages: [...draft.galleryImages, ...files].slice(0, 8),
      galleryImagePreviews: [
        ...draft.galleryImagePreviews,
        ...newPreviews,
      ].slice(0, 8),
    });
  };

  const handleDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const names = files.map((f) => f.name);
    updateDraft({
      documents: [...draft.documents, ...files],
      documentNames: [...draft.documentNames, ...names],
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-3xl border border-[#EFEBE1] bg-white p-6 shadow-sm sm:p-8">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="font-serif text-2xl font-bold tracking-tight text-[#0E1B14] sm:text-3xl">
            Photos and documents
          </h2>
          <p className="text-sm text-[#6B7280]">
            One cover photo, up to eight more, and the costed list.
          </p>
        </div>

        {/* Section 1: Cover Photo */}
        <div className="mt-8 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
              Cover photo
            </label>
            <span className="text-xs text-[#6B7280]">
              16:9 ratio recommended · Max 10MB
            </span>
          </div>

          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverSelect}
            className="hidden"
          />

          {draft.coverImagePreview ? (
            <div className="relative overflow-hidden rounded-2xl border border-[#EFEBE1]">
              <div className="relative aspect-video w-full bg-gray-100">
                <Image
                  src={draft.coverImagePreview}
                  alt="Cover preview"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex items-center justify-between bg-[#FAF9F6] p-3">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[#0B5D3B]">
                  <Check className="h-4 w-4 stroke-[3]" />
                  Cover photo uploaded
                </span>
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="rounded-lg border border-[#EFEBE1] bg-white px-3 py-1 text-xs font-semibold text-[#0E1B14] hover:bg-[#F2F2EE]"
                >
                  Change photo
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => coverInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#EFEBE1] bg-[#FAF9F6] p-8 text-center transition hover:border-[#0E1B14] hover:bg-[#F2F2EE]"
            >
              <div className="rounded-full bg-white p-3 shadow-xs">
                <Upload className="h-6 w-6 text-[#0E1B14]" />
              </div>
              <p className="mt-3 text-sm font-semibold text-[#0E1B14]">
                Click or drag cover image here
              </p>
              <p className="mt-1 text-xs text-[#6B7280]">
                PNG, JPG or WEBP (shown prominently on search & cards)
              </p>
            </div>
          )}
        </div>

        {/* Section 2: Gallery Photos */}
        <div className="mt-8 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
              Additional photos ({draft.galleryImagePreviews.length} / 8)
            </label>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="text-xs font-semibold text-[#0B5D3B] hover:underline"
            >
              + Upload more
            </button>
          </div>

          <input
            ref={galleryInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleGallerySelect}
            className="hidden"
          />

          {draft.galleryImagePreviews.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {draft.galleryImagePreviews.map((url, i) => (
                <div
                  key={i}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-[#EFEBE1]"
                >
                  <Image
                    src={url}
                    alt={`Gallery ${i}`}
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      updateDraft({
                        galleryImages: draft.galleryImages.filter(
                          (_, idx) => idx !== i,
                        ),
                        galleryImagePreviews: draft.galleryImagePreviews.filter(
                          (_, idx) => idx !== i,
                        ),
                      });
                    }}
                    className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1 text-white opacity-0 transition group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#6B7280]">
              No additional photos added yet. Upload up to 8 more photos to show
              real conditions and rebuild trust.
            </p>
          )}
        </div>

        {/* Section 3: Costed List & Documents */}
        <div className="mt-8 space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
            Documents (e.g. Costed list, market association letter)
          </label>

          <input
            ref={docInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            onChange={handleDocSelect}
            className="hidden"
          />

          <div className="space-y-2">
            {draft.documentNames.map((name, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-[#EFEBE1] bg-[#FAF9F6] p-3 text-xs"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#0B5D3B]" />
                  <span className="font-medium text-[#0E1B14]">{name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    updateDraft({
                      documents: draft.documents.filter((_, idx) => idx !== i),
                      documentNames: draft.documentNames.filter(
                        (_, idx) => idx !== i,
                      ),
                    });
                  }}
                  className="text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[#EFEBE1] bg-[#FAF9F6] px-4 py-2.5 text-xs font-semibold text-[#0E1B14] hover:border-[#0E1B14]"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload PDF or document
            </button>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-10 flex items-center justify-between border-t border-[#EFEBE1] pt-6">
          <button
            type="button"
            onClick={prevStep}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#6B7280] hover:text-[#0E1B14]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to target
          </button>
          <button
            type="button"
            onClick={nextStep}
            className="inline-flex items-center gap-2 rounded-full bg-[#0E1B14] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-black"
          >
            <span>Continue to payout</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
