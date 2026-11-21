import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** The campaign and milestone this receipt is meant to account for. */
export function ReceiptMilestoneCard({
  rows,
}: {
  rows: { term: string; value: string }[];
}) {
  return (
    <Card variant="surface">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Milestone</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-2.5 text-sm">
          {rows.map((row) => (
            <div
              key={row.term}
              className="flex items-center justify-between gap-4"
            >
              <dt className="text-ink/60">{row.term}</dt>
              <dd className="text-right font-medium text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
