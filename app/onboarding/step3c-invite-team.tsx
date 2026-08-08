"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Mail, Loader2, Send, X, UserPlus, Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  inviteOrganizationMember,
  revokeOrganizationInvitation,
} from "@/actions/organization-actions";
import { toast } from "@/components/ui/use-toast";

interface Step3CProps {
  user: any;
  onNext: () => void;
  onBack: () => void;
  onboardingData: any;
}

interface SentInvitation {
  id: string;
  email: string;
  role: string;
  status: "pending" | "revoking";
}

export default function Step3CInviteTeam({
  user,
  onNext,
  onBack,
  onboardingData,
}: Step3CProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [isSending, setIsSending] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [sentInvitations, setSentInvitations] = useState<SentInvitation[]>([]);

  const validateEmail = (value: string): boolean => {
    if (!value.trim()) {
      setEmailError("Email address is required");
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(value.trim())) {
      setEmailError("Enter a valid email address");
      return false;
    }
    // Check if already invited
    if (
      sentInvitations.some(
        (inv) =>
          inv.email.toLowerCase() === value.trim().toLowerCase() &&
          inv.status === "pending",
      )
    ) {
      setEmailError("This email has already been invited");
      return false;
    }
    return true;
  };

  const handleSendInvite = async () => {
    if (!validateEmail(email)) return;

    setIsSending(true);
    try {
      const result = await inviteOrganizationMember({
        email: email.trim(),
        role,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      setSentInvitations((prev) => [
        ...prev,
        {
          id: result.invitationId!,
          email: email.trim().toLowerCase(),
          role,
          status: "pending",
        },
      ]);

      setEmail("");
      setRole("member");
      setEmailError("");

      if (result.warning) {
        toast({
          title: "Invitation saved",
          description: result.warning,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Invitation sent!",
          description: `An invitation was sent to ${email.trim()}.`,
        });
      }
    } catch (error) {
      toast({
        title: "Failed to send invitation",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleRevoke = async (invitationId: string) => {
    setSentInvitations((prev) =>
      prev.map((inv) =>
        inv.id === invitationId ? { ...inv, status: "revoking" as const } : inv,
      ),
    );

    try {
      const result = await revokeOrganizationInvitation(invitationId);
      if (!result.success) {
        throw new Error(result.error);
      }
      setSentInvitations((prev) =>
        prev.filter((inv) => inv.id !== invitationId),
      );
    } catch (error) {
      // Revert status on failure
      setSentInvitations((prev) =>
        prev.map((inv) =>
          inv.id === invitationId
            ? { ...inv, status: "pending" as const }
            : inv,
        ),
      );
      toast({
        title: "Failed to revoke",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const pendingCount = sentInvitations.filter(
    (inv) => inv.status === "pending",
  ).length;

  return (
    <div className="flex h-full items-center justify-center bg-transparent px-0">
      <div className="w-full max-w-3xl">
        {/* Left Section: Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full"
        >
          <h1 className="mb-2 text-3xl font-semibold text-gray-900">
            Invite your team
          </h1>
          <p className="text-gray-500 mb-8">
            Add team members to collaborate on your causes. You can always do
            this later from Settings.
          </p>

          {/* Invite Form */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 flex flex-col space-y-2">
                <Label htmlFor="inviteEmail">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                  <Input
                    id="inviteEmail"
                    type="email"
                    placeholder="teammate@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSendInvite();
                      }
                    }}
                    className={`pl-10 ${emailError ? "border-red-500" : ""}`}
                  />
                </div>
                {emailError && (
                  <p className="text-sm text-red-500">{emailError}</p>
                )}
              </div>

              <div className="w-full md:w-36 flex flex-col space-y-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={handleSendInvite}
                  disabled={isSending || !email.trim()}
                  className="bg-blue-600 text-white hover:bg-blue-700 h-10 px-4"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-1" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Sent Invitations List */}
          {sentInvitations.length > 0 && (
            <div className="mt-8 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">
                Sent Invitations ({pendingCount})
              </h3>
              <div className="space-y-2">
                {sentInvitations.map((inv) => (
                  <motion.div
                    key={inv.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 border border-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <UserPlus className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {inv.email}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {inv.role}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {inv.status === "pending" ? (
                        <>
                          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                          <button
                            onClick={() => handleRevoke(inv.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            title="Revoke invitation"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-7 grid gap-3 border-l-2 border-blue-700 bg-slate-50 px-4 py-3 text-sm text-slate-600 sm:grid-cols-2">
            <p><span className="font-semibold text-slate-900">Admins</span> can manage workspace settings and members.</p>
            <p><span className="font-semibold text-slate-900">Members</span> can collaborate on organisation activity.</p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-10">
            <button
              type="button"
              onClick={onNext}
              className={`inline-flex h-12 flex-1 items-center justify-center rounded-md border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                sentInvitations.length === 0
                  ? "border-slate-300 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
                  : "border-blue-600 bg-blue-600 text-white hover:bg-blue-700 hover:text-white"
              }`}
            >
              {sentInvitations.length === 0 ? "Skip for now" : "Continue"}
            </button>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
