import { getCreatorComplianceStatus } from "@/actions/proof-update-actions";
import { ProofUploadDialog } from "./proof-upload-dialog";
import { AlertTriangle, Clock, PauseCircle } from "lucide-react";

export async function ProofComplianceBanner({ userId }: { userId: string }) {
  const requirements = await getCreatorComplianceStatus(userId);
  if (requirements.length === 0) return null;

  const byCause = new Map<
    string,
    {
      title: string;
      paused: boolean;
      pending: number[];
      submitted: number[];
    }
  >();

  for (const r of requirements) {
    const entry = byCause.get(r.cause.id) ?? {
      title: r.cause.title,
      paused: r.cause.compliance_paused,
      pending: [],
      submitted: [],
    };
    if (r.status === "pending") entry.pending.push(r.milestone);
    else entry.submitted.push(r.milestone);
    byCause.set(r.cause.id, entry);
  }

  return (
    <div className="space-y-3 mb-6">
      {Array.from(byCause.entries()).map(([causeId, c]) => {
        const earliestDeadline = requirements.find(
          (r) => r.cause.id === causeId && r.status === "pending",
        )?.deadline;

        if (c.paused) {
          return (
            <div
              key={causeId}
              className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <PauseCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    “{c.title}” is suspended
                  </p>
                  <p className="text-sm text-red-700">
                    It's hidden from the platform and not accepting donations.
                    Submit your fund-use update — the campaign goes live again
                    once it's approved.
                  </p>
                </div>
              </div>
              <ProofUploadDialog
                causeId={causeId}
                causeTitle={c.title}
                pendingMilestones={c.pending}
              />
            </div>
          );
        }

        if (c.pending.length > 0) {
          return (
            <div
              key={causeId}
              className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    Action needed: “{c.title}” crossed{" "}
                    {c.pending.map((m) => `${m}%`).join(" and ")}
                  </p>
                  <p className="text-sm text-amber-700">
                    Post a fund-use update
                    {earliestDeadline
                      ? ` by ${new Date(earliestDeadline).toDateString()}`
                      : ""}{" "}
                    or the campaign will be paused and hidden.
                  </p>
                </div>
              </div>
              <ProofUploadDialog
                causeId={causeId}
                causeTitle={c.title}
                pendingMilestones={c.pending}
              />
            </div>
          );
        }

        return (
          <div
            key={causeId}
            className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4"
          >
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-blue-800">
                Update under review — “{c.title}”
              </p>
              <p className="text-sm text-blue-700">
                Your {c.submitted.map((m) => `${m}%`).join(" and ")} fund-use
                update is with our team. We'll email you when it's approved.
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
