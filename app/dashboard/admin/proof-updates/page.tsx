import { redirect } from "next/navigation";

/** Proof updates are reviewed as receipts now; keep old links working. */
export default function AdminProofUpdatesPage() {
  redirect("/dashboard/admin/receipts");
}
