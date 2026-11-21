import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ReceiptFieldRow } from "@/types/receipt-types";

const headClassName =
  "text-xs uppercase tracking-[0.12em] text-ink/50 font-semibold";

/** Creator-entered values against what the receipt says; differing values turn rust. */
export function ReceiptFieldTable({ rows }: { rows: ReceiptFieldRow[] }) {
  return (
    <div className="rounded-lg border border-hairline">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-hairline hover:bg-transparent">
            <TableHead className={headClassName}>Field</TableHead>
            <TableHead className={headClassName}>Creator entered</TableHead>
            <TableHead className={headClassName}>On receipt</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const differs = row.result === "differs";
            return (
              <TableRow key={row.field} className="border-b border-hairline">
                <TableCell className="text-sm text-ink/60">
                  {row.field}
                </TableCell>
                <TableCell
                  className={cn("text-sm text-ink", differs && "font-semibold")}
                >
                  {row.entered ?? "—"}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-sm",
                    differs ? "font-semibold text-rust" : "text-ink",
                    row.onReceipt == null && "text-ink/40",
                  )}
                >
                  {row.onReceipt ?? "Not read"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
