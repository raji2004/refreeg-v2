"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { Check, ChevronsUpDown } from "lucide-react";

interface BankDetailsFormProps {
  profile: {
    account_number: string | null;
    bank_name: string | null;
    account_name: string | null;
    sub_account_code: string | null;
  };
  user: {
    id: string;
  };
}

export function BankDetailsForm({ profile, user }: BankDetailsFormProps) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  
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
    userId: user.id,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await handleBankSubmit(e);
      // Send email notification after successful submission
      await sendBankAccountAddedEmail({
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        accountName: formData.accountName,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save bank details. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bank Details</CardTitle>
        <CardDescription>
          Add your bank account details for receiving donations.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account Number</Label>
            <Input
              id="accountNumber"
              name="accountNumber"
              placeholder="Your Nigerian bank account number"
              value={formData.accountNumber}
              onChange={(e) =>
                handleBankChange(e.target.value, "accountNumber")
              }
              required
            />
          </div>

          <div className="space-y-2 flex flex-col">
            <Label htmlFor="bankName">Bank Name</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                  disabled={isLoadingBanks}
                >
                  {isLoadingBanks ? (
                    "Loading banks..."
                  ) : formData.bankName ? (
                    formData.bankName
                  ) : (
                    "Select your bank"
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Search bank..." />
                  <CommandList>
                    <CommandEmpty>No bank found.</CommandEmpty>
                    <CommandGroup>
                      {banks.map((bank) => (
                        <CommandItem
                          key={`${bank.code}-${bank.name}`}
                          value={bank.name}
                          onSelect={(currentValue) => {
                            handleBankChange(
                              currentValue === formData.bankName ? "" : currentValue,
                              "bankName"
                            );
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.bankName === bank.name
                                ? "opacity-100"
                                : "opacity-0"
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
            <Label htmlFor="accountName">Account Name</Label>
            <div className="relative">
              <Input
                id="accountName"
                name="accountName"
                placeholder={
                  isVerifying
                    ? "Validating account..."
                    : verificationFailed
                      ? "Verification failed. Enter name manually"
                      : "Name on your bank account"
                }
                value={isVerifying ? "" : formData.accountName}
                onChange={(e) => handleBankChange(e.target.value, "accountName")}
                readOnly={isVerifying || (!!formData.accountName && !verificationFailed)}
                className={cn(
                  isVerifying && "bg-muted/50 text-muted-foreground italic"
                )}
                required
              />
              {isVerifying && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Icons.spinner className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            {verificationFailed && (
              <p className="text-xs text-destructive">
                We couldn't verify this account. Please enter the name exactly as it appears on your bank statement.
              </p>
            )}
          </div>

          <div className="rounded-md bg-blue-50 p-4 dark:bg-blue-900/20">
            <div className="flex">
              <div className="flex-shrink-0">
                <Icons.help
                  className="h-5 w-5 text-blue-400"
                  aria-hidden="true"
                />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-400">
                  About Bank Details
                </h3>
                <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                  <p>
                    Your bank details are used to receive donations from your
                    causes. Funds will be automatically transferred to this
                    account when donations are made.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Bank Details"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
