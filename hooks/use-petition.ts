"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPetition, updatePetition } from "@/actions/petition-actions";
import {
  resolveMultimediaForSubmit,
  uploadFileWithPresign,
} from "@/lib/s3/upload-client";
import type { PetitionFormData } from "@/types";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "nextjs-toploader/app";

// Files go browser → S3 first so only keys travel through the server action.
async function withUploadedMedia<T extends Partial<PetitionFormData>>(
  data: T,
): Promise<T> {
  const next = { ...data };
  if (next.coverImage instanceof File) {
    const { key } = await uploadFileWithPresign(next.coverImage, {
      entityType: "petitions",
      mediaType: next.coverImage.type.startsWith("video/")
        ? "videos"
        : "images",
    });
    next.coverImage = key;
  }
  if (next.multimedia?.length) {
    next.multimedia = await resolveMultimediaForSubmit(next.multimedia, {
      entityType: "petitions",
    });
  }
  return next;
}

export function usePetition() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async ({
      userId,
      petitionData,
    }: {
      userId: string;
      petitionData: PetitionFormData;
    }) => createPetition(userId, await withUploadedMedia(petitionData)),
    onSuccess: () => {
      toast({
        title: "Petition created successfully",
        description: "Your petition has been submitted for approval.",
      });
      queryClient.invalidateQueries({ queryKey: ["petitions"] });
      router.push("/dashboard/petitions");
    },
    onError: (error: any) => {
      toast({
        title: "Error creating petition",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      petitionId,
      userId,
      petitionData,
    }: {
      petitionId: string;
      userId: string;
      petitionData: Partial<PetitionFormData>;
    }) =>
      updatePetition(petitionId, userId, await withUploadedMedia(petitionData)),
    onSuccess: () => {
      toast({
        title: "Petition updated successfully",
        description: "Your petition has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["petitions"] });
      router.push(`/dashboard/petitions`);
    },
    onError: (error: any) => {
      toast({
        title: "Error updating petition",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createUserPetition = async (
    userId: string,
    petitionData: PetitionFormData,
  ) => {
    return createMutation.mutateAsync({ userId, petitionData });
  };

  const updateUserPetition = async (
    petitionId: string,
    userId: string,
    petitionData: Partial<PetitionFormData>,
  ) => {
    return updateMutation.mutateAsync({ petitionId, userId, petitionData });
  };

  return {
    isLoading: createMutation.isPending || updateMutation.isPending,
    createPetition: createUserPetition,
    updatePetition: updateUserPetition,
  };
}
