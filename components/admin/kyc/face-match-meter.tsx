import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { KYC_FACE_MATCH_THRESHOLD } from "@/lib/options/kyc-review.options";

export function FaceMatchMeter({
  score,
  compact = false,
}: {
  score: number | null;
  compact?: boolean;
}) {
  if (score == null) {
    return <span className="text-sm text-ink/40">—</span>;
  }
  const passing = score >= KYC_FACE_MATCH_THRESHOLD;
  return (
    <div className="flex items-center gap-2">
      <Progress
        value={score}
        className={compact ? "h-1.5 w-24" : "h-2 w-40"}
        indicatorVariant={passing ? "forest" : "default"}
        indicatorClassName={passing ? undefined : "bg-rust"}
        aria-label={`Face match ${score}%`}
      />
      <span className="text-sm font-semibold text-ink">{score}%</span>
      {!compact && (
        <Badge variant={passing ? "verified" : "critical"}>
          {passing ? "Strong" : `Below ${KYC_FACE_MATCH_THRESHOLD}%`}
        </Badge>
      )}
    </div>
  );
}
