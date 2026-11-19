import type { LeaderboardEntry } from "@/actions/users/leaderboard-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";

export function LeaderboardIdentity({
  entry,
  size,
}: {
  entry: LeaderboardEntry;
  size: "sm" | "lg";
}) {
  return (
    <div className={cn("flex items-center gap-3", size === "lg" && "mt-6")}>
      <Avatar className={size === "lg" ? "h-12 w-12" : "h-9 w-9"}>
        <AvatarImage
          src={entry.profilePhoto ?? undefined}
          alt={entry.fullName}
        />
        <AvatarFallback className="bg-warm-neutral text-xs font-semibold text-ink">
          {getInitials(entry.fullName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink md:text-base">
          {entry.fullName}
        </p>
        {entry.username && (
          <p className="truncate text-xs text-ink/50">@{entry.username}</p>
        )}
      </div>
    </div>
  );
}
