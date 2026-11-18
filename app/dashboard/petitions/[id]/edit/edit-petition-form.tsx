"use client";

import type { Petition } from "@/types";
import { PetitionWizard } from "../../_components/petition-wizard";

export default function EditPetitionForm({ petition }: { petition: Petition }) {
  return <PetitionWizard mode="edit" petition={petition} />;
}
