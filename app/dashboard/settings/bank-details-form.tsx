"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronsUpDown, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Card, CardContent } from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Icons } from "@/components/icons";
import { useBank } from "@/hooks/use-bank";
import { clearBankDetails } from "@/actions/profile-actions";
import { sendBankAccountAddedEmail } from "@/services/mail";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
type BankProfile = {
  account_number: string | null;
  bank_name: string | null;
  account_name: string | null;
  sub_account_code: string | null;
};

const emptyAccount: BankProfile = {
  account_number: null,
  bank_name: null,
  account_name: null,
  sub_account_code: null,
};

const fieldClass =
  "h-11 rounded-md border-hairline bg-bone text-ink shadow-subtle placeholder:text-ink/35 focus-visible:border-forest focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-forest/25 focus-visible:ring-offset-0";

const dialogClass =
  "gap-0 max-h-[90vh] overflow-y-auto rounded-3xl border-hairline bg-surface p-0 shadow-sheet sm:max-w-md sm:rounded-3xl [&>button]:right-5 [&>button]:top-5 [&>button]:rounded-full [&>button]:text-ink/50 [&>button]:opacity-100 [&>button]:ring-offset-surface [&>button]:hover:bg-bone [&>button]:hover:text-ink [&>button]:focus:ring-forest/30";

function maskAccount(accountNumber: string) {
  const digits = accountNumber.replace(/\s/g, "");
  if (digits.length < 7) return digits;
  return `${digits.slice(0, 4)} •• ${digits.slice(-3)}`;
}

function hasAccount(account: BankProfile) {
  return Boolean(account.account_number && account.bank_name);
}

export function BankDetailsForm({
  profile,
  user,
}: {
  profile: BankProfile;
  user: { id: string; email: string };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [account, setAccount] = useState(profile);
  const [editor, setEditor] = useState<"create" | "edit" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setAccount(profile);
  }, [
    profile.account_number,
    profile.bank_name,
    profile.account_name,
    profile.sub_account_code,
  ]);

  const saved = hasAccount(account);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await clearBankDetails(user.id);
      setAccount(emptyAccount);
      setConfirmDelete(false);
      toast({
        title: "Bank account removed",
        description: "Donations will not be paid out until you add an account.",
      });
      router.refresh();
    } catch {
      toast({
        title: "Could not remove account",
        description: "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-fraunces text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Payments
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-ink/55">
          Donations to causes you list are paid into this account.
        </p>
      </div>

      <Card variant="surface" className="overflow-hidden rounded-2xl shadow-none">
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-semibold text-ink">Saved accounts</p>
            <button
              type="button"
              onClick={() => setEditor("create")}
              className="text-sm font-medium text-blue-accent hover:underline"
            >
              Add account
            </button>
          </div>

          {saved ? (
            <div className="flex items-center gap-3 rounded-xl bg-cream-muted/70 px-3 py-3 sm:px-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-ink/70">
                <Building2 className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">Bank transfer</p>
                <p className="truncate text-sm text-ink/50">
                  {account.bank_name} · {maskAccount(account.account_number || "")}
                </p>
              </div>
              <span className="rounded-md bg-bone px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink/55">
                Default
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Bank account options"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-ink/45 hover:bg-surface hover:text-ink"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-36">
                  <DropdownMenuItem onSelect={() => setEditor("edit")}>
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-rust focus:text-rust"
                    onSelect={() => setConfirmDelete(true)}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="rounded-xl bg-cream-muted/70 px-4 py-4">
              <p className="text-sm font-semibold text-ink">Bank transfer</p>
              <p className="mt-0.5 text-sm text-ink/50">
                No account yet. Donations to your causes are paid here once you add one.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <BankAccountDialog
        open={editor !== null}
        mode={editor ?? "create"}
        profile={editor === "edit" ? account : emptyAccount}
        userId={user.id}
        businessEmail={user.email}
        onOpenChange={(next) => {
          if (!next) setEditor(null);
        }}
        onSaved={(next) => {
          setAccount(next);
          setEditor(null);
          router.refresh();
        }}
      />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent
          data-design-dialog
          overlayClassName="bg-ink/40"
          className={dialogClass}
        >
          <div className="px-6 pb-6 pt-7 sm:px-7 sm:pb-7 sm:pt-8">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="font-fraunces text-2xl font-semibold leading-tight text-ink">
                Remove this account
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 text-ink/60">
                Donations to causes you list will stop being paid to{" "}
                <span className="font-medium text-ink">
                  {account.bank_name} · {maskAccount(account.account_number || "")}
                </span>{" "}
                until you add another account.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="surface"
                size="lg"
                onClick={() => setConfirmDelete(false)}
                disabled={isDeleting}
              >
                Keep account
              </Button>
              <Button
                type="button"
                variant="rust"
                size="lg"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Removing
                  </>
                ) : (
                  "Remove account"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BankAccountDialog({
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
    <form onSubmit={handleSubmit} className="px-6 pb-6 pt-7 sm:px-7 sm:pb-7 sm:pt-8">
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
                            currentValue === formData.bankName ? "" : currentValue,
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
              className={cn(fieldClass, isVerifying && "bg-bone text-ink/50 italic")}
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
