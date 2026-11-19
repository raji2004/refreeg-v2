"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clearBankDetails } from "@/actions/users/profile-actions";
import { useToast } from "@/hooks/use-toast";
import { BankAccountDialog } from "./bank-account-dialog";
import {
  emptyAccount,
  hasAccount,
  maskAccount,
  type BankProfile,
} from "./bank-account.shared";
import { RemoveBankAccountDialog } from "./remove-bank-account-dialog";

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
    setAccount({
      account_number: profile.account_number,
      bank_name: profile.bank_name,
      account_name: profile.account_name,
      sub_account_code: profile.sub_account_code,
    });
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

      <Card
        variant="surface"
        className="overflow-hidden rounded-2xl shadow-none"
      >
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-semibold text-ink">Saved accounts</p>
            <Button
              variant="bare"
              size="bare"
              type="button"
              onClick={() => setEditor("create")}
              className="text-sm font-medium text-blue-accent hover:underline"
            >
              Add account
            </Button>
          </div>

          {saved ? (
            <div className="flex items-center gap-3 rounded-xl bg-cream-muted/70 px-3 py-3 sm:px-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-ink/70">
                <Building2 className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">Bank transfer</p>
                <p className="truncate text-sm text-ink/50">
                  {account.bank_name} ·{" "}
                  {maskAccount(account.account_number || "")}
                </p>
              </div>
              <span className="rounded-md bg-bone px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink/55">
                Default
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="bare"
                    size="bare"
                    type="button"
                    aria-label="Bank account options"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-ink/45 hover:bg-surface hover:text-ink"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
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
                No account yet. Donations to your causes are paid here once you
                add one.
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

      <RemoveBankAccountDialog
        open={confirmDelete}
        account={account}
        isDeleting={isDeleting}
        onOpenChange={setConfirmDelete}
        onConfirm={handleDelete}
      />
    </div>
  );
}
