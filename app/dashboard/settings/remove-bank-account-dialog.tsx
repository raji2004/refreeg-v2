"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icons } from "@/components/icons";
import {
  dialogClass,
  maskAccount,
  type BankProfile,
} from "./bank-account.shared";

export function RemoveBankAccountDialog({
  open,
  account,
  isDeleting,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  account: BankProfile;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                {account.bank_name} ·{" "}
                {maskAccount(account.account_number || "")}
              </span>{" "}
              until you add another account.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="surface"
              size="lg"
              onClick={() => onOpenChange(false)}
              disabled={isDeleting}
            >
              Keep account
            </Button>
            <Button
              type="button"
              variant="rust"
              size="lg"
              onClick={onConfirm}
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
  );
}
