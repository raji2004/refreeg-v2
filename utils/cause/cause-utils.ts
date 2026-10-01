import { Cause } from "@/types";

export function calculateDaysLeft(cause: Cause): number {
  const now = new Date();

  if (cause.end_date) {
    const endDate = new Date(cause.end_date);
    const diffTime = endDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  const totalDuration = Number(
    cause.days_active && cause.days_active > 0 ? cause.days_active : 30,
  );

  // Measure campaign timeline from start_date or approval date (updated_at), falling back to created_at
  const startDate = cause.start_date
    ? new Date(cause.start_date)
    : cause.updated_at && cause.status === "approved"
      ? new Date(cause.updated_at)
      : new Date(cause.created_at);

  const diffTime = now.getTime() - startDate.getTime();
  const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, totalDuration - daysPassed);
}

export function isCauseExpired(cause: Cause): boolean {
  if (cause.status === "expired") return true;

  if (cause.end_date) {
    return new Date(cause.end_date).getTime() < Date.now();
  }

  // Only consider expired if an explicit days_active duration has elapsed
  if (cause.days_active && cause.days_active > 0) {
    return calculateDaysLeft(cause) <= 0;
  }

  return false;
}
