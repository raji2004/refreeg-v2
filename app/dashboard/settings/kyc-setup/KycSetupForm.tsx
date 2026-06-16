"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, ArrowRight } from "lucide-react";
import StepPersonalDetails from "./StepPersonalDetails";
import StepDocumentUpload from "./StepDocumentUpload";
import StepProgress from "./StepProgress";
import StepSuccess from "./StepSuccess";
import { uploadKycDocument } from "@/actions/kyc-actions";
import ProgressNav from "./components/ProgressNav";
import StepAddressDetails from "./StepAddressDetails";
import type { KycVerification } from "@/types/kyc-types";
import {
  clearKycDraft,
  persistKycDraft,
  resolveInitialKycState,
  type KycFormData,
} from "./kyc-setup-utils";

type KycSetupFormProps = {
  userId: string;
  rejectedKyc: KycVerification | null;
  kycFetchError: string | null;
};

export default function KycSetupForm({
  userId,
  rejectedKyc,
  kycFetchError,
}: KycSetupFormProps) {
  const initialState = resolveInitialKycState(rejectedKyc);

  console.log("[KYC Setup] Client form initialized with:", {
    userId,
    rejectedKyc,
    kycFetchError,
    initialState,
  });

  const [step, setStepState] = useState(initialState.step);
  const [selectedDoc, setSelectedDocState] = useState(initialState.selectedDoc);
  const [formData, setFormDataState] = useState<KycFormData>(
    initialState.formData,
  );
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const persistCurrentDraft = (
    nextFormData: KycFormData,
    nextSelectedDoc: string,
    nextStep: number,
  ) => {
    persistKycDraft({
      formData: nextFormData,
      selectedDoc: nextSelectedDoc,
      step: nextStep,
    });
  };

  const setStep = (nextStep: number) => {
    setStepState(nextStep);
    persistCurrentDraft(formData, selectedDoc, nextStep);
  };

  const setSelectedDoc = (nextSelectedDoc: string) => {
    setSelectedDocState(nextSelectedDoc);
    persistCurrentDraft(formData, nextSelectedDoc, step);
  };

  const setFormData = (
    updater: KycFormData | ((prev: KycFormData) => KycFormData),
  ) => {
    setFormDataState((prev) => {
      const nextFormData =
        typeof updater === "function" ? updater(prev) : updater;
      persistCurrentDraft(nextFormData, selectedDoc, step);
      return nextFormData;
    });
  };

  const validateIdentityDetails = () => {
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.dobDay ||
      !formData.dobMonth ||
      !formData.dobYear ||
      !formData.phone
    ) {
      setError("Please fill in all identity details, including date of birth.");
      return false;
    }
    setError(null);
    return true;
  };

  const validateAddressDetails = () => {
    if (
      !formData.address ||
      !formData.city ||
      !formData.state ||
      !formData.postal ||
      !formData.country
    ) {
      setError("Please fill in all address details.");
      return false;
    }
    setError(null);
    return true;
  };

  const validateDocument = () => {
    if (!selectedDoc) {
      setError("Please select a document type.");
      return false;
    }
    if (!file) {
      setError("Please upload a document file.");
      return false;
    }
    setError(null);
    return true;
  };

  const handleUpload = async () => {
    setUploadError(null);
    console.log("[KYC Setup] Submitting KYC upload for user:", userId);

    const dob =
      formData.dobYear && formData.dobMonth && formData.dobDay
        ? `${formData.dobYear}-${String(formData.dobMonth).padStart(2, "0")}-${String(formData.dobDay).padStart(2, "0")}`
        : "";

    try {
      const { documentUrl, error: uploadErr } = await uploadKycDocument(
        userId,
        file!,
        selectedDoc,
        {
          fullName: `${formData.firstName} ${formData.lastName}`,
          dob,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          postal: formData.postal,
          country: formData.country,
        },
      );

      console.log("[KYC Setup] Upload response:", { documentUrl, uploadErr });

      if (uploadErr) {
        setUploadError(uploadErr);
        setStep(4);
        return;
      }

      clearKycDraft();
      setStep(4);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to submit KYC";
      console.error("[KYC Setup] Upload failed:", err);
      setUploadError(message);
      setStep(4);
    }
  };

  const showProgressNav = step <= 2;

  return (
    <div className="flex w-full h-screen bg-white">
      {showProgressNav && (
        <div className="w-[380px] border-r hidden md:block">
          <ProgressNav currentStep={step} />
        </div>
      )}
      <div className="flex-1 flex items-start md:px-10">
        <Card className="w-full h-full border-none shadow-none flex flex-col">
          <CardHeader>
            <CardTitle className="text-neutral-950 text-4xl font-bold font-montserrat">
              {step === 0 && "Upload a proof of your identity"}
              {step === 1 && "Address Information"}
              {step === 2 && "Upload your document"}
            </CardTitle>
            <CardDescription className="font-montserrat">
              {step === 0 &&
                "This helps us verify who you are and keep the platform safe for everyone."}
              {step === 1 &&
                "Enter your address details as they appear on your document."}
              {step === 2 && "Upload a valid document to verify your identity."}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-grow space-y-6 pb-32 overflow-auto">
            {kycFetchError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Could not load previous KYC data: {kycFetchError}
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {step === 0 && (
              <StepPersonalDetails
                formData={formData}
                setFormData={setFormData}
              />
            )}
            {step === 1 && (
              <StepAddressDetails
                formData={formData}
                setFormData={setFormData}
              />
            )}
            {step === 2 && (
              <StepDocumentUpload
                selectedDoc={selectedDoc}
                setSelectedDoc={setSelectedDoc}
                file={file}
                setFile={setFile}
              />
            )}
            {step === 3 && <StepProgress onComplete={handleUpload} />}
            {step === 4 && (
              <>
                <StepSuccess />
                {uploadError && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertDescription>{uploadError}</AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </CardContent>

          <div className="mt-auto flex justify-end px-6 pb-8 gap-4 bg-white z-10 border-t border-neutral-100">
            {step > 0 && step < 3 && (
              <Button
                variant="outline"
                className="w-full h-12 text-sm px-6 md:w-64 md:h-16 md:px-10 md:text-md font-montserrat flex items-center gap-2"
                onClick={() => setStep(step - 1)}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            )}
            {step === 0 && (
              <Button
                className="w-full h-12 text-sm px-6 md:w-64 md:h-16 md:px-10 md:text-md bg-primaryShades-700 text-white font-semibold font-montserrat flex items-center gap-2"
                onClick={() => validateIdentityDetails() && setStep(1)}
              >
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            )}
            {step === 1 && (
              <Button
                className="w-full h-12 text-sm px-6 md:w-64 md:h-16 md:px-10 md:text-md bg-primaryShades-700 text-white font-semibold font-montserrat flex items-center gap-2"
                onClick={() => validateAddressDetails() && setStep(2)}
              >
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            )}
            {step === 2 && (
              <Button
                className="w-full h-12 text-sm px-6 md:w-64 md:h-16 md:px-10 md:text-md bg-primaryShades-700 text-white font-semibold font-montserrat flex items-center gap-2"
                onClick={() => validateDocument() && setStep(3)}
              >
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
