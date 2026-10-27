import Link from "next/link";
import { Trash2, ShieldCheck, AlertCircle, Smartphone, Globe } from "lucide-react";
import { DATA_RETENTION_POLICY } from "@/lib/config/retention";

export const metadata = {
  title: "Delete Your Account | RefreeG",
  description:
    "Instructions for deleting your RefreeG account and understanding what personal data is deleted and how financial records are anonymized.",
};

export default function DeleteAccountInfoPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-red-50 text-red-600">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                RefreeG Account &amp; Data Deletion
              </h1>
              <p className="text-sm text-slate-500">
                Self-service account deletion for mobile and web users
              </p>
            </div>
          </div>

          <p className="text-slate-600 leading-relaxed">
            You can permanently delete your RefreeG account and personal data at
            any time directly from the RefreeG mobile app or the RefreeG website.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 font-semibold text-slate-900 mb-3">
              <Smartphone className="w-5 h-5 text-blue-600" />
              <h2>In the RefreeG Mobile App</h2>
            </div>
            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
              <li>Sign in to the RefreeG mobile app.</li>
              <li>
                Open the <strong>You</strong> tab from the bottom navigation bar.
              </li>
              <li>
                Scroll to the bottom and tap <strong>Delete account</strong>.
              </li>
              <li>
                Confirm your choice in the dialog to permanently delete your
                account.
              </li>
            </ol>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 font-semibold text-slate-900 mb-3">
              <Globe className="w-5 h-5 text-blue-600" />
              <h2>On the RefreeG Website</h2>
            </div>
            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 mb-4">
              <li>Sign in to your account at refreeg.com.</li>
              <li>
                Go to <strong>Dashboard &rarr; Settings</strong>.
              </li>
              <li>
                Open the <strong>Delete Account</strong> section and click{" "}
                <strong>Delete Account</strong>.
              </li>
            </ol>
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              Go to Account Settings
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">
                What Data Is Permanently Deleted Immediately
              </h2>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-600">
                <li>
                  Your profile information (full name, username, email address,
                  phone number, bio, profile photo, and social links)
                </li>
                <li>
                  KYC verification records, uploaded government ID images, live
                  selfie files in cloud storage, and Didit verification sessions
                </li>
                <li>
                  Saved payout bank details, saved payment card tokens, and push
                  notification device tokens
                </li>
                <li>
                  Comments, petitions, bookmarks, saved searches, and unfunded
                  campaigns
                </li>
              </ul>
            </div>
          </div>

          <div className="flex items-start gap-3 pt-4 border-t border-slate-100">
            <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">
                What Financial Records Are Anonymized &amp; Retained
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-2">
                To comply with financial audit, tax, and anti-fraud regulations,
                historical transaction records (donations, recurring pledges, and
                crypto donation settlements) are{" "}
                <strong>anonymized rather than deleted</strong>:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-600">
                <li>
                  Your user ID is unlinked, your name is replaced with{" "}
                  <code>{DATA_RETENTION_POLICY.DELETED_ACCOUNT_DISPLAY_NAME}</code>,
                  and your email is replaced with a non-identifiable placeholder.
                </li>
                <li>
                  Anonymized financial ledger entries are retained for{" "}
                  <strong>
                    {DATA_RETENTION_POLICY.FINANCIAL_RECORDS_RETENTION_YEARS} years
                  </strong>
                  .
                </li>
                <li>
                  If you have an active, unpaused campaign that has raised funds,
                  you must pause or close that campaign before deleting your
                  account.
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-slate-500">
          Need help or unable to sign in? Email{" "}
          <a
            href={`mailto:${DATA_RETENTION_POLICY.SUPPORT_EMAIL}?subject=Account%20Deletion%20Request`}
            className="text-blue-600 hover:underline font-medium"
          >
            {DATA_RETENTION_POLICY.SUPPORT_EMAIL}
          </a>{" "}
          or review our{" "}
          <Link href="/privacy" className="text-blue-600 hover:underline font-medium">
            Privacy Policy
          </Link>
          .
        </div>
      </div>
    </div>
  );
}

