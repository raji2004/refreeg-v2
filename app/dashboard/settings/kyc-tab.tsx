"use client";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { getVerificationStatus } from "@/actions/kyc-actions";
import {
  Shield,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  User,
  Calendar,
  Phone,
  MapPin,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/types";
import Image from "next/image";
import NavigationLoader from "@/components/NavigationLoader";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";

interface KycTabProps {
  profile: Profile;
  user: any;
}

export function KycTab({ profile, user }: KycTabProps) {
  const [kycData, setKycData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const router = useRouter();

  useEffect(() => {
    async function fetchKycStatus() {
      try {
        const { status, error: kycError } = await getVerificationStatus(
          user.id,
        );
        if (kycError) {
          setError(kycError);
        } else {
          setKycData(status);
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch KYC status");
      } finally {
        setLoading(false);
      }
    }

    if (user?.id) {
      fetchKycStatus();
    }
  }, [user?.id]);

  const getStatusIcon = () => {
    if (!kycData) return <Shield className="h-8 w-8 text-gray-400" />;

    switch (kycData.status) {
      case "approved":
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case "rejected":
        return <XCircle className="h-8 w-8 text-red-500" />;
      case "pending":
        return <Clock className="h-8 w-8 text-yellow-500" />;
      default:
        return <Shield className="h-8 w-8 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    if (!kycData) return <Badge variant="outline">Not Submitted</Badge>;

    switch (kycData.status) {
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Approved
          </Badge>
        );
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Pending Review
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusMessage = () => {
    if (!kycData) return "You haven't submitted KYC verification yet.";

    switch (kycData.status) {
      case "approved":
        return "Your KYC has been approved! You can now list causes and access all features.";
      case "rejected":
        return "Your KYC was rejected. Please review the requirements and resubmit your application.";
      case "pending":
        return "Your KYC is under review. We'll notify you once it's processed.";
      default:
        return "Unknown status.";
    }
  };

  if (loading) {
    return <NavigationLoader />;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Main Status Card */}
      {!kycData ? (
        <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-slate-50/50 pointer-events-none" />
          <CardContent className="p-8 md:p-12 text-center relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-blue-100">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight mb-4">
              Secure Your RefreeG Account
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto mb-10 text-base md:text-lg">
              Identity verification keeps the RefreeG community safe and trusted. 
              By verifying your identity, you unlock the ability to create petitions, launch donation campaigns, and access all premium platform features.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl mb-12 text-left">
              <div className="p-5 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <Shield className="h-6 w-6 text-blue-500 mb-3" />
                <h4 className="font-semibold text-slate-900 mb-2">Platform Trust</h4>
                <p className="text-sm text-slate-500 leading-relaxed">Show supporters you are a verified creator, increasing engagement and donations.</p>
              </div>
              <div className="p-5 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <CheckCircle className="h-6 w-6 text-emerald-500 mb-3" />
                <h4 className="font-semibold text-slate-900 mb-2">Unlock Features</h4>
                <p className="text-sm text-slate-500 leading-relaxed">Gain full access to campaign creation, wallet withdrawals, and premium tools.</p>
              </div>
              <div className="p-5 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <Clock className="h-6 w-6 text-amber-500 mb-3" />
                <h4 className="font-semibold text-slate-900 mb-2">Fast Process</h4>
                <p className="text-sm text-slate-500 leading-relaxed">Our automated system verifies your identity securely in just a few minutes.</p>
              </div>
            </div>

            <Button
              onClick={() => router.push("/dashboard/settings/kyc-setup")}
              className="bg-slate-900 hover:bg-slate-800 text-white transition-all duration-200 px-8 py-6 text-base rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              <Shield className="h-5 w-5 mr-3" />
              Start RefreeG Verification
            </Button>
            <p className="text-xs text-slate-400 mt-4">
              Your data is encrypted and securely processed.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
          <div className="bg-slate-50/50 border-b border-slate-100 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100">
                {getStatusIcon()}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Identity Verification</h3>
                <p className="text-sm text-slate-500 mt-1">{getStatusMessage()}</p>
              </div>
            </div>
            <div className="flex-shrink-0">
              {getStatusBadge()}
            </div>
          </div>
          
          <CardContent className="p-6">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col sm:flex-row gap-4 items-center">
              {kycData?.status === "rejected" && (
                <Button
                  onClick={() => router.push("/dashboard/settings/kyc-setup")}
                  variant="destructive"
                  className="transition-colors duration-200 px-6"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Resubmit Application
                </Button>
              )}

              {kycData?.status === "pending" && (
                <div className="flex items-center gap-2 text-amber-700 bg-amber-50/80 px-4 py-2.5 rounded-lg border border-amber-200/50">
                  <Clock className="h-5 w-5" />
                  <span className="text-sm font-medium">Your application is in the review queue</span>
                </div>
              )}

              {kycData?.status === "approved" && (
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50/80 px-4 py-2.5 rounded-lg border border-emerald-200/50">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">All features unlocked</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legacy KYC Details - Hidden for Didit users */}
      {kycData && kycData.document_type !== "didit" && (
        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-400" />
              Legacy Submission Details
            </CardTitle>
            <CardDescription className="text-slate-500">
              Information provided via manual upload
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Personal Info */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Personal Information
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-500 w-24">Full Name</span>
                    <span className="text-sm text-slate-900">{kycData.full_name || "-"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-500 w-24">Date of Birth</span>
                    <span className="text-sm text-slate-900">{kycData.dob || "-"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-500 w-24">Phone</span>
                    <span className="text-sm text-slate-900">{kycData.phone || "-"}</span>
                  </div>
                </div>
              </div>

              {/* Address Info */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Address Information
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-500 w-24">Address</span>
                    <span className="text-sm text-slate-900">{kycData.address || "-"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-slate-400 opacity-0" />
                    <span className="text-sm font-medium text-slate-500 w-24">City/State</span>
                    <span className="text-sm text-slate-900">
                      {[kycData.city, kycData.state].filter(Boolean).join(", ") || "-"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-slate-400 opacity-0" />
                    <span className="text-sm font-medium text-slate-500 w-24">Postal/Country</span>
                    <span className="text-sm text-slate-900">
                      {[kycData.postal, kycData.country].filter(Boolean).join(", ") || "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="my-8" />

            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Document Preview
              </h4>

              {kycData?.document_url ? (
                <>
                  {kycData.document_url.endsWith(".pdf") ? (
                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 flex items-center gap-4 transition-colors hover:bg-slate-100">
                      <div className="w-10 h-10 bg-white border border-slate-200 flex items-center justify-center rounded shadow-sm">
                        <FileText className="h-5 w-5 text-blue-500" />
                      </div>
                      <a
                        href={getMediaUrl(kycData.document_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        View PDF Document
                      </a>
                    </div>
                  ) : (
                    <div
                      className="border border-slate-200 rounded-lg p-4 bg-slate-50 flex flex-col items-center cursor-pointer hover:bg-slate-100 transition-colors group"
                      onClick={() => setPreviewOpen(true)}
                    >
                      <Image
                        src={getMediaUrl(kycData.document_url)}
                        alt="KYC Document"
                        width={400}
                        height={300}
                        className="object-contain rounded max-h-64 opacity-90 group-hover:opacity-100 transition-opacity"
                        unoptimized={isProxyMediaUrl(getMediaUrl(kycData.document_url))}
                      />
                      <p className="text-xs text-slate-500 mt-3 font-medium">
                        Click image to view full size
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="border border-dashed border-slate-200 rounded-lg p-8 text-center text-sm text-slate-500">
                  No document uploaded
                </div>
              )}

              {previewOpen && (
                <div
                  className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 transition-all"
                  onClick={() => setPreviewOpen(false)}
                >
                  <div
                    className="relative max-w-5xl w-full max-h-[90vh] shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Image
                      src={getMediaUrl(kycData.document_url)}
                      alt="Full size document"
                      fill
                      className="object-contain rounded-lg bg-slate-950"
                      unoptimized={isProxyMediaUrl(getMediaUrl(kycData.document_url))}
                    />
                    <button
                      onClick={() => setPreviewOpen(false)}
                      className="absolute -top-4 -right-4 bg-white text-slate-900 rounded-full w-10 h-10 flex items-center justify-center hover:bg-slate-100 shadow-lg transition-transform hover:scale-105"
                    >
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              )}

              {kycData?.status === "rejected" && kycData?.verification_notes && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-lg mt-6">
                  <h3 className="text-sm font-semibold text-red-800 mb-1">
                    Rejection Reason
                  </h3>
                  <p className="text-sm text-red-600">
                    {kycData.verification_notes}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
