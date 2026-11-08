# Admin analytics UI handoff

Run `pnpm install` and `pnpm dev`, then open `/admin-analytics`.
This standalone route displays local sample data for October 2026. It does not
require sign-in, call APIs, track activity, or connect to a database. The existing
application still uses its normal providers on other routes.

## Files

- `app/admin-analytics/page.tsx`: route and metadata.
- `components/admin/standalone-analytics.tsx`: local period, comparison, detail,
  campaign-dialog and CSV-export state.
- `components/admin/analytics-sidebar.tsx`: RefreeG branding, desktop navigation
  and mobile drawer. Analytics, Community, Users and EIZA stay within the UI;
  the remaining menu entries are disabled placeholders.
- `components/admin/workspace/`: sample data, types, navigation configuration,
  analytics/detail views, charts, shared presentation components and styles.
- `lib/admin-workspace.ts`: browser-safe CSV escaping utility.
- `app/providers.tsx` and `components/client-layout.tsx`: isolate this route from
  authentication/notification providers and the normal application chrome.

## Backend integration

All displayed figures are sample values, including sidebar counts and detail
views. CSV export downloads the four summary metrics for the selected period;
no data is saved. Changing a sidebar view or opening a campaign is local state.

Start integration at `StandaloneAnalytics`. Load reporting data in a separate
container or hook and pass typed values to the presentation components. Replace
`sample-data.ts` consumers in `AnalyticsContent` and `DetailContent` with props,
including chart series, campaign totals, ambassadors, users and EIZA statistics.
`Metric`, `Period` and `WorkItem` define the existing UI shapes in `types.ts`.
Decide authentication and permissions before exposing real admin data.

The Day, Month and Year controls currently choose fixed demo datasets. Real
reporting windows, comparisons, currency units and loading/error/empty states
should be defined with the backend integration. No new endpoints, server
actions, migrations or payment integrations are included in this UI change.

## Checks

```sh
pnpm test --config jest.config.js --runInBand --coverage=false tests/components/standalone-analytics.test.tsx tests/lib/admin-workspace.test.ts
```
