# Admin analytics

`/admin-analytics` shows live platform analytics to admins and managers. Signed-out
visitors are sent to sign-in; other roles get a 404.

## Files

- `app/admin-analytics/page.tsx`: auth/role check, `?period=day|month|year`, loads data.
- `lib/admin-analytics/workspace-data.ts`: all Prisma queries, cached for 2 minutes
  (`unstable_cache`, tag `admin-analytics`).
- `lib/admin-analytics/period.ts`: reporting windows and chart buckets in Lagos time.
- `components/admin/standalone-analytics.tsx`: page shell, period switching, CSV export.
- `components/admin/workspace/`: analytics and detail views, charts, shared UI.
- `app/providers.tsx` and `components/client-layout.tsx`: skip the normal app chrome
  and client providers on this route.

## Where the numbers come from

| Panel                            | Source                                                                                                               |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Donations, donors, average gift  | completed `donations` + `crypto_donations` (naira)                                                                   |
| Pledge → donation                | `pledges` created in the window that are `fulfilled`                                                                 |
| Campaign status                  | approved, unended `causes`; inactive = no gift for 21 days; paused = `paused` or `compliance_paused`                 |
| EIZA issued                      | `reward_transactions` grouped by `transaction_type`                                                                  |
| Who holds EIZA                   | `profiles.total_points`                                                                                              |
| Ambassadors                      | `donor_referral_attributions` (donations driven), `referrals_v1` (referrals, sign-up rate), `referral_bonus` rewards |
| Active users, retention, cohorts | `events` (logins, comments, shares, donations)                                                                       |
| Sidebar counts                   | pending `causes`, `kyc_verifications`, `petitions`                                                                   |

Windows: Day = today vs same time last week; Month = month to date vs the same span
of last month; Year = year to date vs the same span last year.

## Checks

```sh
pnpm exec jest --runInBand --coverage=false tests/components/standalone-analytics.test.tsx tests/lib/admin-workspace.test.ts tests/lib/admin-analytics-period.test.ts
```

Migration `20261111120000_admin_analytics_indexes` adds the date-range indexes these
queries rely on.
