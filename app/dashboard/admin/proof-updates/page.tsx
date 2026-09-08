import { getPendingProofUpdatesForAdmin } from "@/actions/proof-update-actions";
import ProofUpdatesClient from "./proof-updates-client";

export const metadata = { title: "Proof Updates | RefreeG Admin" };

export default async function AdminProofUpdatesPage() {
  const updates = await getPendingProofUpdatesForAdmin();
  // Serialize Dates before crossing into the client component
  const serialized = updates.map((u) => ({
    ...u,
    created_at: u.created_at.toISOString(),
    reviewed_at: u.reviewed_at?.toISOString() ?? null,
  }));
  return <ProofUpdatesClient initialUpdates={serialized} />;
}
