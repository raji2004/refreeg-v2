# Email system (admin)

Admin page: `/dashboard/admin/notifications` (Compose, Triggers, History).

## Compose

An admin picks an audience, writes a title and message, optionally picks a page
for the button, and sends now or schedules. "Send test to me" mails the admin
only. Creating an announcement writes one `EmailAnnouncement` row.

- **Send now** starts straight away (`after()` in `createAnnouncement`).
- **Scheduled** rows are sent by a poller the server starts on boot
  (`lib/email/announcement-poller.ts`, started from `instrumentation.ts`). Once a
  minute it calls the app's own `POST /api/cron/send-announcements` over
  `127.0.0.1:$PORT`, so no outside scheduler is needed. It needs `CRON_SECRET`
  in production: without it the poller does not start and logs a warning.
  Set `ANNOUNCEMENT_POLLER=off` if something else already calls that route
  (for example EventBridge). Running several instances is safe, because a row
  is claimed with a conditional update and only one instance sends it.
- The sender works in batches of 100, five emails at a time, and saves its
  position after each batch. A run that dies is picked up again after 10
  minutes and continues; at most one batch can be sent twice.
- Only `scheduled` rows past their time, and `sending` rows stuck for 10
  minutes, are picked up. A conditional update claims a row, so two callers
  cannot send the same announcement.

Audiences are defined in `lib/options/email-audience.options.ts` and resolved in
`lib/email/audience.ts`. Blocked users and users without an email are never
included. "Identity verified" means an approved KYC record.

## Triggers

`lib/options/email-trigger.options.ts` lists the events. Required events always
send. For the others, an admin switch is stored in `EmailTrigger` and checked by
`sendMail` (`lib/email/triggers.ts`) before any email built from that event's
templates goes out. Switches are cached for 30 seconds per server instance.
If the lookup fails the email is sent anyway.

To put a new email behind a switch, add its template name to the event's
`templates`.

## Limits

- SMTP is the existing nodemailer transport. A large announcement is bounded by
  the mail provider's sending limits.
- There is no unsubscribe link, no open tracking, and no push or SMS.
