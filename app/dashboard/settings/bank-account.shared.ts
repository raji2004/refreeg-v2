export type BankProfile = {
  account_number: string | null;
  bank_name: string | null;
  account_name: string | null;
  sub_account_code: string | null;
};

export const emptyAccount: BankProfile = {
  account_number: null,
  bank_name: null,
  account_name: null,
  sub_account_code: null,
};

export const fieldClass =
  "h-11 rounded-md border-hairline bg-bone text-ink shadow-subtle placeholder:text-ink/35 focus-visible:border-forest focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-forest/25 focus-visible:ring-offset-0";

export const dialogClass =
  "gap-0 max-h-[90vh] overflow-y-auto rounded-3xl border-hairline bg-surface p-0 shadow-sheet sm:max-w-md sm:rounded-3xl [&>button]:right-5 [&>button]:top-5 [&>button]:rounded-full [&>button]:text-ink/50 [&>button]:opacity-100 [&>button]:ring-offset-surface [&>button]:hover:bg-bone [&>button]:hover:text-ink [&>button]:focus:ring-forest/30";

export function maskAccount(accountNumber: string) {
  const digits = accountNumber.replace(/\s/g, "");
  if (digits.length < 7) return digits;
  return `${digits.slice(0, 4)} •• ${digits.slice(-3)}`;
}

export function hasAccount(account: BankProfile) {
  return Boolean(account.account_number && account.bank_name);
}
