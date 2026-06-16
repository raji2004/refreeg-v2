
import { Cause } from "@/types";

/**
 * Calculates the number of days remaining for a cause.
 * Prefers end_date if available, otherwise falls back to calculating 
 * from created_at and days_active.
 */
export function calculateDaysLeft(cause: Cause): number {
  const now = new Date();
  
  // 1. If we have an explicit end_date, use it for the most accurate calculation
  if (cause.end_date) {
    const endDate = new Date(cause.end_date);
    const diffTime = endDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  // 2. Fallback: Calculate from created_at and days_active
  // Use the approved date if possible (updated_at often changes on approval)
  // but for safety we use created_at as the "safe" floor.
  const totalDuration = Number(cause.days_active || 0);
  if (totalDuration <= 0) return 0;

  const startDate = new Date(cause.created_at);
  const diffTime = now.getTime() - startDate.getTime();
  const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, totalDuration - daysPassed);
}

/**
 * Checks if a cause has expired.
 */
export function isCauseExpired(cause: Cause): boolean {
  if (cause.status === 'expired') return true;
  return calculateDaysLeft(cause) <= 0 && (cause.days_active ?? 0) > 0;
}
