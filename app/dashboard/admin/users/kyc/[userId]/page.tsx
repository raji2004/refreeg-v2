import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { getUserRole } from "@/actions/admin/role-actions";
import {
  getAdminKycDetail,
  getAdminKycNeighbors,
  updateVerificationStatus,
} from "@/actions/users/kyc-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CalloutBanner } from "@/components/ui/callout-banner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { KycStatusBadge } from "@/components/admin/kyc/kyc-status-badge";
import { FaceMatchMeter } from "@/components/admin/kyc/face-match-meter";
import { RecordCheckTable } from "@/components/admin/kyc/record-check-table";
import {
  KycDocumentGrid,
  type KycDocumentTile,
} from "@/components/admin/kyc/kyc-document-grid";
import { AskResubmitDialog } from "@/components/admin/kyc/ask-resubmit-dialog";
import { KycFlashToast } from "@/components/admin/kyc/kyc-flash-toast";
import KycRejectionDialog from "./KycRejectionDialog";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import { formatIdTypeLabel, initials } from "@/lib/kyc-review";
import {
  KYC_FACE_MATCH_THRESHOLD,
  kycStatusTabs,
} from "@/lib/options/kyc-review.options";
import {
  formatAccountAge,
  formatDate,
  formatRelativeTime,
} from "@/lib/format-date";
import type { DecisionSummary } from "@/lib/didit";
import type { KycQueueTab, KycVerification } from "@/types/kyc-types";

const RESUBMIT_MESSAGE_PLACEHOLDER =
  "Your selfie didn't match your ID photo clearly. Please take a new one facing a window, and check your details match your ID.";

function buildDiditTiles(
  kyc: KycVerification,
  decision: DecisionSummary | null,
): KycDocumentTile[] {
  const idLabel = formatIdTypeLabel(
    decision?.documents.documentType ?? kyc.id_type,
  );
  if (decision) {
    const tiles: KycDocumentTile[] = [
      {
        key: "front",
        label: `${idLabel} · Front`,
        url: decision.documents.frontImage,
      },
      {
        key: "selfie",
        label: "Live selfie",
        url: decision.documents.selfieImage,
      },
    ];
    if (decision.documents.backImage) {
      tiles.splice(1, 0, {
        key: "back",
        label: `${idLabel} · Back`,
        url: decision.documents.backImage,
      });
    }
    return tiles;
  }
  return [
    { key: "front", label: `${idLabel} · Front`, url: null },
    { key: "back", label: `${idLabel} · Back`, url: null },
    { key: "selfie", label: "Live selfie", url: null },
  ];
}

export default async function KycReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};

  const session = await auth();
  const adminId = session?.user?.id;
  if (!adminId) {
    redirect("/auth/signin");
  }

  const userRole = await getUserRole(adminId);
  if (!userRole || (userRole !== "admin" && userRole !== "manager")) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You do not have permission to access this page.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const tabParam =
    typeof resolvedSearchParams.from === "string"
      ? resolvedSearchParams.from
      : undefined;
  const tab = (
    kycStatusTabs.some((item) => item.value === tabParam)
      ? tabParam
      : "needs-review"
  ) as KycQueueTab;
  const activeTabLabel =
    kycStatusTabs.find((item) => item.value === tab)?.label ?? "Needs review";

  const [detail, neighbors] = await Promise.all([
    getAdminKycDetail(userId),
    getAdminKycNeighbors(userId, tab),
  ]);

  if (!detail.kyc) {
    return (
      <div className="mx-auto mt-8 max-w-4xl">
        <Alert variant="destructive">
          <AlertTitle>No KYC Submission</AlertTitle>
          <AlertDescription>
            {detail.error || "This user has not submitted KYC yet."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const kyc = detail.kyc;
  const profile = detail.profile;
  const decision = detail.decision;
  const isDidit = kyc.document_type === "didit";
  const displayName = profile?.fullName || kyc.full_name || "Unnamed applicant";
  const firstName = displayName.split(" ")[0];

  const faceMatch = decision?.faceMatchScore ?? null;
  const faceMatchFailing =
    faceMatch != null && faceMatch < KYC_FACE_MATCH_THRESHOLD;
  const recordDiffers = detail.recordRows.some(
    (row) => row.result === "differs",
  );
  const sessionFinished = decision ? decision.sessionFinished : true;
  const disableApprove =
    isDidit &&
    decision != null &&
    (!sessionFinished ||
      faceMatchFailing ||
      recordDiffers ||
      decision.blocklistedMatches);

  const failingReasons: string[] = [];
  if (faceMatchFailing && faceMatch != null) {
    failingReasons.push(
      `Face match is ${faceMatch}%, below the ${KYC_FACE_MATCH_THRESHOLD}% threshold`,
    );
  }
  if (decision?.blocklistedMatches) {
    failingReasons.push("the selfie matches a blocklisted session");
  }
  for (const row of detail.recordRows) {
    if (row.result === "differs") {
      failingReasons.push(
        row.official
          ? `${row.field.toLowerCase()} differs from the official record`
          : `${row.field.toLowerCase()} is missing`,
      );
    }
  }

  const tiles = isDidit ? buildDiditTiles(kyc, decision) : [];
  const legacyMediaUrl =
    !isDidit && kyc.document_url ? getMediaUrl(kyc.document_url) : null;
  const legacyIsPdf =
    !isDidit &&
    Boolean(kyc.document_url?.split("?")[0].toLowerCase().endsWith(".pdf"));

  const extras = (
    [
      ["Address", kyc.address],
      ["City", kyc.city],
      ["State", kyc.state],
      ["Postal code", kyc.postal],
      ["Country", kyc.country],
    ] as [string, string | undefined][]
  )
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => ({ label, value: value as string }))
    .filter(
      (entry) =>
        !detail.recordRows.some(
          (row) => row.field === entry.label && row.official == null,
        ),
    );

  async function approveAction() {
    "use server";
    const result = await updateVerificationStatus(kyc.id, "approved");
    if (result.error) {
      throw new Error(result.error);
    }
    redirect(
      `/dashboard/admin/users/kyc?tab=${tab}&flash=approved&name=${encodeURIComponent(firstName)}&kycId=${kyc.id}`,
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <KycFlashToast />

      <nav className="flex items-center gap-2 text-xs text-ink/50">
        <Link
          href={`/dashboard/admin/users/kyc?tab=${tab}`}
          className="hover:text-ink"
        >
          KYC
        </Link>
        <span className="text-ink/30">→</span>
        <span>{activeTabLabel}</span>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-fraunces text-3xl tracking-tight text-ink">
            {displayName}
          </h1>
          <KycStatusBadge status={kyc.status} />
        </div>
        <div className="flex items-center gap-2">
          {neighbors.prevUserId ? (
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/dashboard/admin/users/kyc/${neighbors.prevUserId}?from=${tab}`}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
          )}
          {neighbors.nextUserId ? (
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/dashboard/admin/users/kyc/${neighbors.nextUserId}?from=${tab}`}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <Card variant="surface">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Documents</CardTitle>
              <CardDescription>
                Submitted {formatRelativeTime(kyc.created_at)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tiles.length > 0 ? (
                <KycDocumentGrid tiles={tiles} />
              ) : legacyMediaUrl && !legacyIsPdf ? (
                <a
                  href={legacyMediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block overflow-hidden rounded-lg border border-hairline bg-cream-muted"
                >
                  <Image
                    src={legacyMediaUrl}
                    alt="KYC document"
                    width={640}
                    height={480}
                    className="max-h-72 w-full object-contain"
                    unoptimized={isProxyMediaUrl(legacyMediaUrl)}
                  />
                </a>
              ) : legacyIsPdf ? (
                <a
                  href={legacyMediaUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-lg border border-hairline bg-cream-muted px-4 py-3 text-sm font-medium text-ink underline-offset-4 hover:underline"
                >
                  View PDF document
                </a>
              ) : (
                <div className="rounded-lg border border-dashed border-ink/20 bg-cream-muted p-8 text-center text-sm text-ink/50">
                  No document uploaded
                </div>
              )}
              {isDidit && faceMatch != null && (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-ink/60">Face match</span>
                  <FaceMatchMeter score={faceMatch} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card variant="surface" className="scroll-mt-8" id="record-check">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Record check</CardTitle>
              <CardDescription>{detail.recordSource}</CardDescription>
            </CardHeader>
            <CardContent>
              <RecordCheckTable rows={detail.recordRows} />
            </CardContent>
          </Card>

          {extras.length > 0 && (
            <Card variant="surface">
              <CardHeader>
                <CardTitle className="text-base">Submission details</CardTitle>
                <CardDescription>
                  Information provided with the submission
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {extras.map((entry) => (
                  <div key={entry.label} className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/50">
                      {entry.label}
                    </p>
                    <p className="break-words text-sm font-medium text-ink">
                      {entry.value}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {kyc.verification_notes && (
            <Card variant="surface">
              <CardHeader>
                <CardTitle className="text-base">Decision log</CardTitle>
                <CardDescription>
                  Last updated {formatDate(kyc.updated_at)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm leading-relaxed text-ink/70">
                  {kyc.verification_notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card variant="surface">
            <CardHeader>
              <CardTitle className="text-base">Applicant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-cream-muted text-sm font-semibold text-ink">
                    {initials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    {displayName}
                  </p>
                  <p className="truncate text-xs text-ink/50">
                    {profile?.email || "No email on file"}
                  </p>
                </div>
              </div>
              <Separator />
              <dl className="space-y-3 text-sm">
                {[
                  {
                    term: "Account age",
                    value: formatAccountAge(profile?.createdAt),
                  },
                  {
                    term: "Previous attempts",
                    value:
                      detail.attempts > 1
                        ? `${detail.attempts - 1} · earlier attempt${detail.attempts > 2 ? "s" : ""}`
                        : "0",
                  },
                  {
                    term: "Watchlists",
                    value: decision
                      ? decision.amlHits
                        ? `${decision.amlHits} match${decision.amlHits === 1 ? "" : "es"}`
                        : "No matches"
                      : "Not checked",
                  },
                  {
                    term: "ID type",
                    value: formatIdTypeLabel(
                      decision?.documents.documentType ??
                        kyc.id_type ??
                        (isDidit ? null : kyc.document_type),
                    ),
                  },
                ].map((row) => (
                  <div
                    key={row.term}
                    className="flex items-center justify-between gap-4"
                  >
                    <dt className="text-ink/60">{row.term}</dt>
                    <dd className="text-right font-medium text-ink">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          {isDidit && detail.decisionError ? (
            <CalloutBanner
              variant="rust"
              icon={<AlertTriangle className="mt-0.5 h-4 w-4 text-rust" />}
              title="Didit isn't responding"
              description={`${detail.decisionError} Cached details are shown; you can still decide manually.`}
              action={
                <div className="flex flex-col gap-2">
                  <Button asChild size="sm" variant="ink">
                    <Link
                      href={`/dashboard/admin/users/kyc/${userId}?from=${tab}`}
                    >
                      Try again
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <a href="#record-check">Review manually</a>
                  </Button>
                </div>
              }
            />
          ) : decision && !decision.sessionFinished ? (
            <CalloutBanner
              variant="gold"
              title="Verification in progress"
              description="The applicant hasn't finished the Didit session yet. Decide once it completes."
            />
          ) : kyc.status === "approved" ? (
            <CalloutBanner
              variant="forest"
              icon={<CheckCircle className="mt-0.5 h-4 w-4 text-forest" />}
              title="Identity approved"
              description="The applicant is verified for payouts and referrals."
            />
          ) : kyc.status === "rejected" ? (
            <CalloutBanner
              variant="rust"
              title="Verification rejected"
              description={
                kyc.verification_notes ??
                "The applicant can resubmit from their settings."
              }
            />
          ) : kyc.status === "resubmitted" ? (
            <CalloutBanner
              variant="gold"
              title="Resubmission requested"
              description="Waiting for the applicant to redo the requested checks."
            />
          ) : failingReasons.length > 0 ? (
            <CalloutBanner
              variant="rust"
              icon={<AlertTriangle className="mt-0.5 h-4 w-4 text-rust" />}
              title="This case needs a closer look"
              description={`${failingReasons.join("; ")}. Ask for a resubmission or reject.`}
            />
          ) : (
            <CalloutBanner
              variant="forest"
              icon={<CheckCircle className="mt-0.5 h-4 w-4 text-forest" />}
              title="All automatic checks passed."
              description="Review the record check, then approve."
            />
          )}

          <Card variant="surface">
            <CardContent className="space-y-3 pt-6">
              <form action={approveAction}>
                <Button
                  type="submit"
                  variant="ink"
                  className="w-full"
                  aria-label="Approve KYC"
                  disabled={disableApprove || kyc.status === "approved"}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve identity
                </Button>
              </form>
              <div className="flex flex-wrap gap-2">
                {isDidit && (
                  <AskResubmitDialog
                    verificationId={kyc.id}
                    applicantFirstName={firstName}
                    messagePlaceholder={RESUBMIT_MESSAGE_PLACEHOLDER}
                  />
                )}
                <KycRejectionDialog
                  kycId={kyc.id}
                  applicantFirstName={firstName}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
