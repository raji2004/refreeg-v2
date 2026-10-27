/**
 * Centralized Data Retention, Deletion & Moderation Policy Configuration.
 *
 * Single source of truth for legal retention windows, anonymization placeholders,
 * and moderation SLA commitments across backend APIs, web pages, and mobile endpoints.
 * Update values here when legal counsel adjusts retention periods.
 */
export const DATA_RETENTION_POLICY = {
  /**
   * Number of years anonymized financial transaction records (donations, pledges,
   * crypto settlements, and audit logs) are retained for tax, accounting, and
   * regulatory compliance after an account is deleted.
   */
  FINANCIAL_RECORDS_RETENTION_YEARS: 7,

  /**
   * Number of days server/security logs are retained before rotation.
   */
  SECURITY_LOGS_RETENTION_DAYS: 90,

  /**
   * Display name substituted on historical donations, pledges, and archived
   * records when a user deletes their account.
   */
  DELETED_ACCOUNT_DISPLAY_NAME: "Deleted User",

  /**
   * Domain used to generate unique, non-routable anonymized email placeholders
   * on historical records whose database schema requires a non-null email string.
   */
  DELETED_ACCOUNT_EMAIL_DOMAIN: "deleted.refreeg.com",

  /**
   * Maximum turnaround time (in hours) promised to users for reviewing reported
   * user-generated content (campaigns, comments, petitions, and profiles).
   */
  MODERATION_SLA_HOURS: 48,

  /**
   * Support email displayed in deletion and moderation notices.
   */
  SUPPORT_EMAIL: "support@refreeg.com",
} as const;

/**
 * Generates a deterministic or unique non-PII placeholder email for anonymized rows.
 */
export function buildAnonymizedEmail(idOrSuffix: string): string {
  const clean = idOrSuffix.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16).toLowerCase();
  return `deleted-${clean || Date.now()}@${DATA_RETENTION_POLICY.DELETED_ACCOUNT_EMAIL_DOMAIN}`;
}

