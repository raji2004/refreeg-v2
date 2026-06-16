"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Icons } from "@/components/icons";
import { useAuth } from "@/hooks/use-auth";
import { useSignature } from "@/hooks/use-signature";
import { useProfile } from "@/hooks/use-profile";
import { sendPetitionSignedEmailToUser } from "@/services/mail";
import { ShareModal } from "@/components/share-modal"; // Add this import
import { getBaseURL } from "@/lib/utils"; // Add this import

interface SignatureFormProps {
  petitionId: string;
  profile: {
    email?: string;
    name?: string;
    id?: string;
  };
  subaccount?: string;
  status: "pending" | "rejected" | "approved" | "expired";
  petitionData?: {
    title?: string;
    creatorId?: string;
    creatorEmail?: string | null;
    creatorName?: string;
  };
  hasSigned: boolean;
  onSuccess?: () => void;
}

export function SignatureForm({
  petitionId,
  profile,
  status,
  subaccount,
  petitionData = {},
  hasSigned,
  onSuccess,
}: SignatureFormProps) {
  const { createUserSignature, isLoading } = useSignature();
  const [friendlyError, setFriendlyError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: profile?.name || "",
    email: profile?.email || "",
    message: "",
    isAnonymous: false,
  });

  const baseUrl = getBaseURL();

  // Check if form should be disabled
  // Note: Signatures can continue even after the petition goal is reached
  // The form is only disabled if the user has already signed, or if the petition status is pending or rejected
  const isFormDisabled =
    hasSigned || status === "pending" || status === "rejected" || status === "expired";

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (isFormDisabled) return;

    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    if (isFormDisabled) return;
    setFormData((prev) => ({ ...prev, isAnonymous: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent submission if already signed
    if (hasSigned) {
      setFriendlyError("You have already signed this petition.");
      return;
    }

    try {
      const ok = await createUserSignature(petitionId, profile.id || "", {
        amount: 1,
        email: formData.email,
        name: formData.name,
        message: formData.message,
        isAnonymous: formData.isAnonymous,
      });

      if (!ok) {
        setFriendlyError(
          "We couldn't process your signature. Please try again.",
        );
        return;
      }

      setFriendlyError(null);

      // Call the onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Send confirmation email to the signer
      try {
        await sendPetitionSignedEmailToUser(
          formData.email,
          formData.isAnonymous ? "Supporter" : formData.name,
          petitionData.title || "the petition",
          `${window.location.origin}/petitions/${petitionId}`,
          formData.isAnonymous,
        );
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError);
      }

      // Note: Notification to petition creator is now handled in the backend
      // when the petition goal is reached, not on every signature
    } catch (error) {
      console.error("Error submitting signature:", error);
      setFriendlyError("We couldn't process your signature. Please try again.");
    }
  };

  const signatureAmount = 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign a petition</CardTitle>
        <CardDescription>
          {hasSigned
            ? "Thank you for signing this petition! Share it to help reach the goal."
            : "Your contribution helps make a difference"}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {hasSigned && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">
                ✓ You've already signed this petition
              </p>
            </div>
          )}

          {friendlyError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{friendlyError}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Your Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Enter your name"
              value={formData.name}
              onChange={handleChange}
              required={!formData.isAnonymous}
              disabled={formData.isAnonymous || isFormDisabled}
              className={isFormDisabled ? "bg-gray-100 cursor-not-allowed" : ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isFormDisabled}
              className={isFormDisabled ? "bg-gray-100 cursor-not-allowed" : ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              name="message"
              placeholder="Leave a message of support"
              value={formData.message}
              onChange={handleChange}
              disabled={isFormDisabled}
              className={isFormDisabled ? "bg-gray-100 cursor-not-allowed" : ""}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="anonymous"
              checked={formData.isAnonymous}
              onCheckedChange={handleSwitchChange}
              disabled={isFormDisabled}
            />
            <Label
              htmlFor="anonymous"
              className={isFormDisabled ? "text-gray-400" : ""}
            >
              Sign anonymously
            </Label>
          </div>

          {signatureAmount > 0 && (
            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Signature</span>
                <span>{signatureAmount.toLocaleString()}</span>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          {hasSigned ? (
            <>
              <ShareModal
                url={`${baseUrl}/petitions/${petitionId}`}
                title={petitionData.title || "Petition"}
                entityId={petitionId}
                entityType="petition"
              />
              <div className="text-center text-sm text-muted-foreground">
                Thank you for your support! Help spread the word by sharing this
                petition.
              </div>
            </>
          ) : (
            <Button
              type="submit"
              disabled={isLoading || isFormDisabled}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Sign Now"
              )}
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
