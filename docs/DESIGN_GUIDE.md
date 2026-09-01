# Design guide — fintech surface system

This documents the visual language introduced for RefreeG's verification, wallet,
discover, petitions, bounties, and settings surfaces, and the reusable components
that implement it. It is **additive**: the existing navy/white theme keeps working
on pages that haven't been rebuilt. New pages, and any page being substantially
reworked, should use this system instead of ad hoc colors.

Source: mockups for Verification, Saved, Discover, Wallet, Petitions, Bounties,
and Settings. Read those before designing a new screen in this system — the
conventions below were extracted from them, not invented independently.

## 1. Tokens

All colors are CSS variables in `app/globals.css` (`:root`), exposed as Tailwind
colors in `tailwind.config.ts`. Never hardcode a hex value in a component —
use the token.

| Token | Role | Tailwind classes |
|---|---|---|
| `--cream` | Page background (off-white, warm) | `bg-cream`, `text-cream-foreground` |
| `--ink` | Near-black surfaces: dark panels, borders, primary text | `bg-ink`, `text-ink`, `border-ink` |
| `--lime` | The one primary action / success state on a page | `bg-lime`, `text-lime-foreground` |
| `--gold` | Held funds, warnings, "waiting on you" states | `bg-gold`, `text-gold-foreground` |

Existing tokens (`--background`, `--primary`, `--secondary`, `--brand`, etc.) are
unchanged and still drive the current navy/white pages — don't repoint them.

**Rules:**
- **Lime is scarce.** One lime button per screen — the single next action.
  Two lime buttons on one view means the hierarchy is wrong, not that both
  actions are equally important.
- **Gold means "waiting," not "error."** Use `destructive` (existing red
  token) for actual failures (declined card, rejected verification). Gold is
  for money or process that is in flight and will resolve on its own.
- **Ink is a surface, not just a border.** A dark `ink` panel is reserved for
  money state — wallet balance, held bounty amount. Don't use it as a generic
  "dark card" for unrelated content.

## 2. Typography

- **Fraunces** (serif, `font-fraunces`) — page titles and section headings
  only ("Wallet", "Discover", "Verification"). One serif heading per screen,
  usually the `<h1>`.
- **Montserrat** (sans, existing default) — everything else: body copy, labels,
  buttons, form fields, table content.
- **Eyebrow labels** — small-caps tracked labels above a heading or grouping
  a control table ("STEP 1 OF 4", "WHAT LEVEL 2 UNLOCKS", "EVERY CONTROL ON
  THE PAGE"). Use the `<Eyebrow>` component or `.label-eyebrow` utility class,
  never a plain uppercase `<span>` — it carries the tracking/weight/size as a
  set.

## 3. Components

All components live in `components/ui/` alongside the existing shadcn
primitives and follow the same conventions (forwardRef, `cn()`, `cva` for
variants). Import from `@/components/ui/*`.

### Button (`button.tsx`)
New variants added to the existing set: `lime` (primary action) and `ink`
(secondary dark action, e.g. "Close it" on a destructive confirmation).
Existing variants (`default`, `outline`, `destructive`, etc.) are untouched.

### Badge (`badge.tsx`)
New status-chip variants: `cleared` (lime — "CLEARED", "VERIFIED"), `pending`
(gold — "PENDING", "UNDER REVIEW"), `held` (outline — "HELD FOR YOU"). Use
these instead of inventing new color combinations for status chips.

### Card (`card.tsx`)
Now takes a `variant` prop:
- `default` — unchanged, existing rounded/shadow card.
- `outlined` — flat, 2px black border, cream fill, no shadow. Use for
  verification steps, bounty listings, petition cards — content the user
  reads and acts on directly.
- `ink` — the dark money panel (wallet balance, held funds summary).

### Eyebrow (`eyebrow.tsx`)
Small-caps section label. `<Eyebrow>Step 1 of 4</Eyebrow>`.

### CalloutBanner (`callout-banner.tsx`)
The banner used at the top of a page to state one fact that's currently true
("Your ₦25,000 withdrawal is waiting on this"). Variants: `gold` (default,
waiting/held), `lime` (good news, cleared), `neutral`.

A banner **states a fact**; it is not the primary CTA. Give it at most one
inline text link (`action` prop) — the real primary action button belongs
below it in the page body, not inside the banner.

### Stepper (`stepper.tsx`)
Horizontal stage tracker for a multi-step wait (Sent → Being read → Decision
→ Withdrawal sent). Takes `steps: { label, status: "done" | "current" |
"upcoming" }[]`. Waiting is a state with a design — use this instead of a
spinner or blank panel whenever a user is waiting on a multi-stage process.

### EmptyState (`empty-state.tsx`)
For zero-data states ("Nothing saved yet"). Explains what the page becomes
once populated, not an apology. One action, no decorative illustration.

## 4. Interaction rules

These recur across every surface in the mockups and should hold for any new
screen in this system:

1. **One level at a time.** A multi-step flow (verification levels, bounty
   claim → submit → review → paid) shows exactly one active step; completed
   steps collapse to a summary, future steps are visible but inert.
2. **State the wait before the work.** When something is processing
   (documents under review, a bank transfer in flight), say how long it
   normally takes and what happens next — don't just show a spinner.
3. **Removal is reversible until it isn't.** Bookmarking, list membership,
   and draft edits undo silently (toast with "Undo"). Money movement,
   deleting a saved list, and account closure require a typed or explicit
   confirmation and are stated as irreversible.
4. **A rejection names the exact mismatch and offers the one-tap fix.**
   ("The name on the slip reads X, your account says Y") plus a button that
   resolves it directly, never just "try again."
5. **Confirmation dialogs restate the number.** Withdrawals, bulk actions,
   and account closure show the exact amount/count being acted on in the
   confirmation step, not just a generic "Are you sure?".

## 5. Extending this system

Before adding a new color or component:
- Check this file and `components/ui/` first — most patterns (status chip,
  banner, stepper, empty state) already exist.
- New tokens go in `app/globals.css` `:root` + `tailwind.config.ts`, never as
  a one-off hex in a component.
- If a new component variant is needed, extend the existing `cva()` variants
  object rather than creating a parallel component.
