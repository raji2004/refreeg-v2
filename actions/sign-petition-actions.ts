"use server";

import { auth } from "@/lib/auth/auth";
import { createSignature } from "./signature-actions";
import { revalidatePath } from "next/cache";

export async function signPetitionQuick(input: {
  petitionId: string;
  name: string;
  email: string;
  message?: string;
  isAnonymous?: boolean;
}) {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  try {
    const signature = await createSignature(input.petitionId, userId, {
      amount: 1,
      name: input.name,
      email: input.email,
      message: input.message || "",
      isAnonymous: !!input.isAnonymous,
    });
    revalidatePath("/causes");
    return { data: signature, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Could not sign this petition.",
    };
  }
}
