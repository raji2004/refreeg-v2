"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eyebrow } from "@/components/ui/eyebrow";
import { CalloutBanner } from "@/components/ui/callout-banner";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Icons } from "@/components/icons";
import { useBank } from "@/hooks/use-bank";
import { sendBankAccountAddedEmail } from "@/services/mail";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  dialogClass,
  fieldClass,
  type BankProfile,
} from "./bank-account.shared";

export function BankAccountDialog({
  open,
  mode,
  profile,
  userId,
  businessEmail,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  mode: "create" | "edit";
  profile: BankProfile;
  userId: string;
  businessEmail: string;
  onOpenChange: (open: boolean) => void;
  onSaved: (account: BankProfile) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-design-dialog
        overlayClassName="bg-ink/40"
        className={dialogClass}
      >
        {open ? (
          <BankAccountFields
            key={`${mode}-${profile.account_number ?? "new"}`}
            mode={mode}
            profile={profile}
            userId={userId}
            businessEmail={businessEmail}
            onSaved={onSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function BankAccountFields({
  mode,
  profile,
  userId,
  businessEmail,
  onSaved,
}: {
  mode: "create" | "edit";
  profile: BankProfile;
  userId: string;
  businessEmail: string;
  onSaved: (account: BankProfile) => void;
}) {
  const { toast } = useToast();
  const [bankOpen, setBankOpen] = useState(false);
  const {
    isSubmitting,
    isVerifying,
    banks,
    isLoadingBanks,
    verificationFailed,
    formData,
    handleBankChange,
    handleBankSubmit,
  } = useBank({
    initialData: profile,
    userId,
    businessEmail,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const saved = await handleBankSubmit(e);
      if (!saved) return;

      await sendBankAccountAddedEmail({
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        accountName: formData.accountName,
      }).catch(() => undefined);

      onSaved({
        account_number: formData.accountNumber,
        bank_name: formData.bankName,
        account_name: formData.accountName,
        sub_account_code: formData.sub_account_code,
      });
    } catch {
      toast({
        title: "Could not save bank account",
        description: "Check the details and try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="px-6 pb-6 pt-7 sm:px-7 sm:pb-7 sm:pt-8"
    >
      <DialogHeader className="space-y-2 text-left">
        <DialogTitle className="font-fraunces text-[28px] font-semibold leading-tight text-ink">
          {mode === "edit" ? "Edit bank account" : "Add bank account"}
        </DialogTitle>
        <DialogDescription className="text-sm leading-6 text-ink/60">
          Donations to causes you list are paid into this Nigerian account.
        </DialogDescription>
      </DialogHeader>

      <div className="mt-6 space-y-5">
        <div className="space-y-2">
          <Eyebrow className="text-ink/45">Account number</Eyebrow>
          <Input
            id="accountNumber"
            name="accountNumber"
            inputMode="numeric"
            placeholder="10-digit NUBAN"
            value={formData.accountNumber}
            onChange={(e) => handleBankChange(e.target.value, "accountNumber")}
            className={fieldClass}
            required
          />
        </div>

        <div className="flex flex-col space-y-2">
          <Eyebrow className="text-ink/45">Bank</Eyebrow>
          <Popover open={bankOpen} onOpenChange={setBankOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="surface"
                role="combobox"
                aria-expanded={bankOpen}
                className="h-11 w-full justify-between rounded-md bg-bone font-normal shadow-subtle"
                disabled={isLoadingBanks}
              >
                {isLoadingBanks
                  ? "Loading banks..."
                  : formData.bankName || "Select your bank"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-ink/40" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] rounded-lg border-hairline bg-surface p-0 text-ink shadow-elevated">
              <Command className="bg-surface text-ink">
                <CommandInput
                  placeholder="Search bank..."
                  className="text-ink placeholder:text-ink/35"
                />
                <CommandList>
                  <CommandEmpty>No bank found.</CommandEmpty>
                  <CommandGroup>
                    {banks.map((bank) => (
                      <CommandItem
                        key={`${bank.code}-${bank.name}`}
                        value={bank.name}
                        className="rounded-md text-ink data-[selected=true]:bg-bone data-[selected=true]:text-ink"
                        onSelect={(currentValue) => {
                          handleBankChange(
                            currentValue === formData.bankName
                              ? ""
                              : currentValue,
                            "bankName",
                          );
                          setBankOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            formData.bankName === bank.name
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        {bank.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Eyebrow className="text-ink/45">Account name</Eyebrow>
          <div className="relative">
            <Input
              id="accountName"
              name="accountName"
              placeholder={
                isVerifying
                  ? "Checking this account..."
                  : verificationFailed
                    ? "Enter the name on the account"
                    : "Filled in after the account is checked"
              }
              value={isVerifying ? "" : formData.accountName}
              onChange={(e) => handleBankChange(e.target.value, "accountName")}
              readOnly={
                isVerifying || (!!formData.accountName && !verificationFailed)
              }
              className={cn(
                fieldClass,
                isVerifying && "bg-bone text-ink/50 italic",
              )}
              required
            />
            {isVerifying ? (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Icons.spinner className="h-4 w-4 animate-spin text-ink/40" />
              </div>
            ) : null}
          </div>
          {verificationFailed ? (
            <p className="text-sm text-rust">
              The name on this account could not be confirmed. Enter it exactly
              as it appears on the bank record.
            </p>
          ) : null}
        </div>

        <CalloutBanner
          variant="forest"
          title="Paid out to this account"
          description="When someone gives to a cause you list, the donation is sent here."
        />

        <Button
          type="submit"
          variant="ink"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              Saving
            </>
          ) : mode === "edit" ? (
            "Save changes"
          ) : (
            "Save bank account"
          )}
        </Button>
      </div>
    </form>
  );
}
