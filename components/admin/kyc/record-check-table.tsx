import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RecordCheckResult, RecordCheckRow } from "@/lib/didit";

const resultConfig: Record<
  RecordCheckResult,
  { label: string; variant: "verified" | "pending" | "critical" } | null
> = {
  match: { label: "Match", variant: "verified" },
  partial: { label: "Partial", variant: "pending" },
  differs: { label: "Differs", variant: "critical" },
  unknown: null,
};

const headClassName =
  "text-xs uppercase tracking-[0.12em] text-ink/50 font-semibold";

/**
 * The designer's "Record check" table: submitted vs official record with a
 * per-field result pill. Rows without official values render a submitted
 * details view instead.
 */
export function RecordCheckTable({ rows }: { rows: RecordCheckRow[] }) {
  const showOfficial = rows.some((row) => row.official);
  return (
    <div className="rounded-lg border border-hairline">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-hairline hover:bg-transparent">
            <TableHead className={headClassName}>Field</TableHead>
            <TableHead className={headClassName}>Submitted</TableHead>
            {showOfficial && (
              <TableHead className={headClassName}>Official record</TableHead>
            )}
            {showOfficial && (
              <TableHead className={`${headClassName} text-right`}>
                Result
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const result = showOfficial ? resultConfig[row.result] : null;
            return (
              <TableRow key={row.field} className="border-b border-hairline">
                <TableCell className="text-sm text-ink/60">
                  {row.field}
                </TableCell>
                <TableCell className="text-sm font-medium text-ink">
                  {row.submitted ?? "—"}
                </TableCell>
                {showOfficial && (
                  <TableCell className="text-sm font-medium text-ink">
                    {row.official ?? "—"}
                  </TableCell>
                )}
                {showOfficial && (
                  <TableCell className="text-right">
                    {result ? (
                      <Badge variant={result.variant}>{result.label}</Badge>
                    ) : (
                      <span className="text-xs text-ink/40">—</span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
