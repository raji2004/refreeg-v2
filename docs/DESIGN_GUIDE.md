# RefreeG Design System & Guide

> **Visual Language for RefreeG Surfaces**  
> This system defines the palette, typography, controls, cards, navigation, and interaction rules across RefreeG's verification, wallet, discover, petitions, bounties, and settings surfaces. It is **additive**: existing navy/white legacy screens remain supported, while all new and refreshed pages use this system.

---

## 1. Palette & Color Tokens

The RefreeG palette is warm, utilitarian, and restrained. It pairs earth neutrals with purposeful functional accents, never purely decorative ones.

All colors are declared as CSS variables in `app/globals.css` (`:root`) and mapped in `tailwind.config.ts`. **Never hardcode hex values in components** — use the corresponding token classes.

### Primary Palette

| Token | Hex Anchor | Role | Tailwind Classes |
|---|---|---|---|
| `--ink` | `#0e1b14` | Dark surfaces, money summaries, dark cards, headers, borders, primary text | `bg-ink`, `text-ink`, `border-ink` |
| `--forest` | `#0b5d3b` | Trust, primary brand identity, active elements, success states, total raised | `bg-forest`, `text-forest`, `border-forest` |
| `--lime` | `#cff454` | The single primary action / submit button on a page, active progress indicator | `bg-lime`, `text-lime`, `border-lime` |
| `--blue-accent` | `#0a3cb5` | Hyperlinks, informational icons, system notices, tech tags | `bg-blue-accent`, `text-blue-accent` |

### Secondary Palette

| Token | Hex Anchor | Role | Tailwind Classes |
|---|---|---|---|
| `--sand` | `#f0deae` | Secondary warm neutral, soft callouts, badge fills | `bg-sand`, `text-sand-foreground`, `border-sand` |
| `--gold` | `#f4c95d` | Pending, under-review, waiting on user action, held balances | `bg-gold`, `text-gold-foreground`, `border-gold` |
| `--amber` | `#c7951f` | Secondary warnings, held funds, warm accents | `bg-amber`, `text-amber-foreground`, `border-amber` |
| `--rust` | `#c8401c` | Urgent warnings, destructive actions, critical notifications | `bg-rust`, `text-rust`, `border-rust` |
| `--cyan` | `#0eb7f1` | Light info badges, tech tags, public verify indicators | `bg-cyan`, `text-cyan-foreground` |

### Neutrals

| Token | Hex Anchor | Role | Tailwind Classes |
|---|---|---|---|
| `--cream` | `#faf9f6` | Default page background (warm off-white) | `bg-cream`, `text-cream-foreground` |
| `--bone` | `#f7f6f2` | Secondary surface, subtle card backgrounds, tab list pill | `bg-bone`, `text-bone-foreground` |
| `--surface` | `#ffffff` | Card surface, modal sheets, input backgrounds | `bg-surface`, `text-surface-foreground` |
| `--cream-muted` | `#f2f2ee` | Inactive controls, subtle borders, divider fills | `bg-cream-muted`, `border-cream-muted` |
| `--warm-neutral` | `#efebe1` | Soft panel container, category tags | `bg-warm-neutral` |
| `--parchment` | `#f0ece4` | **Petition surfaces only** — warm paper aesthetic | `bg-parchment` |
| `--hairline` | `#e0e0dc` | Soft card/row borders, subtle dividers | `border-hairline`, `divide-hairline` |

### Palette Usage Rules
1. **Lime is scarce.** One lime button per screen — the single next action. Two lime buttons on one view means the hierarchy is wrong.
2. **Lime marks the actual money-moving action, not "get to it."** On Discover, every Give/Pledge/Sign/Apply button in the grid, filter dialog, and search results is `ink` (or `outline` for secondary actions). Lime is reserved for the final submission button inside the payment or sign step (`QuickDonateForm`'s "Give ₦5,000" / "Donate ₦X").
3. **Gold means "waiting," not "error."** Use `rust` (`bg-rust` or `destructive`) for actual failures (declined card, rejected KYC). Gold is for money or process in flight that will resolve on its own.
4. **Ink is a surface, not just a border.** A dark `ink` panel is reserved for money state — wallet balance, held bounty amount. Don't use it as a generic "dark card" for unrelated content.
5. **Parchment is scoped to petitions.** It is the one part of the platform that moves no money, so it gets its own warm, paper-like background instead of `cream` — a visual cue that signing is a civic action, not a financial one.

---

## 2. Typography & Hierarchy

### Typefaces
- **Fraunces** (`font-fraunces`): Editorial serif with optical sizing. Reserved for:
  - Page titles (`<h1>`) ("Wallet", "Discover", "Verification", "Welcome, Adedayo")
  - Major section headings (`<h2>`) ("Redeem CBA", "Add proof")
  - Hero financial amounts (`₦41,200`, `₦2,400,000`)
- **Montserrat** (`font-montserrat` / sans default): Interface sans-serif. Used for:
  - Body copy, descriptions, helper text
  - Form labels, buttons, dropdown options
  - Data tables, transaction rows, list items
- **Eyebrow Labels** (`<Eyebrow>` or `.label-eyebrow`): Small-caps tracked labels above a heading or section (`"STEP 1 OF 4"`, `"WHAT LEVEL 2 UNLOCKS"`, `"FINANCIAL SUMMARY"`). Never use an un-tracked plain uppercase `<span>`.

---

## 3. Radius, Spacing & Elevation

### Radius Scale
- `rounded-none` (`0px`): Dividers, full-bleed tables
- `rounded-xs` (`2px`): Micro badges, tiny tag indicators
- `rounded-sm` (`4px`): Small badges, control items
- `rounded-md` (`8px`): Form inputs, standard buttons, select triggers
- `rounded-lg` (`12px`): Standard cards, dialogs
- `rounded-xl` (`16px`): Large surface cards, callout banners
- `rounded-2xl` (`20px`): Floating drawers, MultiSelectBar
- `rounded-3xl` (`24px`): Modal dialog containers
- `rounded-full` (`9999px`): Status pills, avatars, switch toggles, circular icon buttons

### Spacing Scale
Follows a standard 4px baseline: `4px` (`p-1`), `8px` (`p-2`), `12px` (`p-3`), `16px` (`p-4`), `24px` (`p-6`), `32px` (`p-8`), `48px` (`p-12`).

### Elevation & Shadows
- `shadow-flat`: `0 0 0 1px hsl(var(--hairline))` — clean, unshadowed hairline container
- `shadow-subtle`: `0 1px 2px 0 rgba(0, 0, 0, 0.05)` — inputs, dropdown menus, tooltips
- `shadow-card`: `0 2px 8px -2px rgba(14, 27, 20, 0.08)` — surface cards on hover
- `shadow-elevated`: `0 8px 24px -4px rgba(14, 27, 20, 0.12)` — floating MultiSelectBar, popovers
- `shadow-sheet`: `0 16px 32px -8px rgba(14, 27, 20, 0.16)` — side drawers, modals

---

## 4. Controls & Components

All components live in `components/ui/` and follow Radix / shadcn conventions (`forwardRef`, `cn()`, `cva`).

### Button (`button.tsx`)
```tsx
import { Button } from "@/components/ui/button"

// The single primary action on a money-moving screen
<Button variant="lime">Donate ₦5,000</Button>

// Primary standard button on fintech surfaces
<Button variant="ink">+ Add cause</Button>

// Trust / success action
<Button variant="forest">Confirm Verification</Button>

// Destructive / critical confirmation
<Button variant="rust">Delete project</Button>

// Surface secondary with subtle border
<Button variant="surface">Previous</Button>

// Subtle secondary in cards
<Button variant="subtle">Export</Button>
```

### Badge & Status Chips (`badge.tsx`)
```tsx
import { Badge } from "@/components/ui/badge"

<Badge variant="live">LIVE</Badge>
<Badge variant="cleared">CLEARED</Badge>
<Badge variant="pending">PENDING</Badge>
<Badge variant="held">HELD FOR YOU</Badge>
<Badge variant="critical">ACTION REQUIRED</Badge>
<Badge variant="forest">TRUSTED</Badge>
<Badge variant="cyan">PUBLIC VERIFY</Badge>
<Badge variant="blue">INFO</Badge>
<Badge variant="verified">VERIFIED</Badge>
```

### Card (`card.tsx`)
```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

// Outlined card: Flat 2px ink border, cream background (verification steps, bounties)
<Card variant="outlined">...</Card>

// Ink panel: Dark surface for money states (wallet balance, held funds)
<Card variant="ink">...</Card>

// Forest panel: Deep emerald surface for platform impact / total raised summaries
<Card variant="forest">
  <p className="text-xs uppercase tracking-wider text-white/70">Total Raised</p>
  <h2 className="font-fraunces text-3xl font-medium text-white">₦2,400,000</h2>
</Card>

// Sand callout card: Waiting on action, held balance summary
<Card variant="sand">...</Card>

// Surface card: Pure white card with subtle hairline border
<Card variant="surface">...</Card>

// Parchment card: Petition detail pages
<Card variant="parchment">...</Card>
```

### CalloutBanner (`callout-banner.tsx`)
States a single true fact at the top of a surface. Not a button, but can have an inline text link:
```tsx
import { CalloutBanner } from "@/components/ui/callout-banner"

<CalloutBanner
  variant="gold"
  title="Your ₦25,000 withdrawal is waiting on this"
  description="Complete Level 2 ID verification to release held funds."
  action={<a href="/verification" className="underline font-medium">Verify now</a>}
/>
```
Variants: `gold` (in-flight/waiting), `lime` (cleared/success), `rust` (urgent/rejected), `forest` (brand notice), `neutral`.

### Switch (`switch.tsx`)
Toggle switches use Forest green for checked states and warm neutral for unchecked states:
```tsx
import { Switch } from "@/components/ui/switch"

<Switch defaultChecked /> // active: bg-forest, inactive: bg-hairline
```

### Progress (`progress.tsx`)
```tsx
import { Progress } from "@/components/ui/progress"

<Progress value={65} indicatorVariant="cyan" />
<Progress value={80} indicatorVariant="forest" />
<Progress value={45} indicatorVariant="lime" />
<Progress value={90} indicatorVariant="blue" />
```

### Tabs (`tabs.tsx`)
Support standard tab styling and fintech `pill` style:
```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

<Tabs defaultValue="profile">
  <TabsList variant="pill">
    <TabsTrigger value="profile" variant="pill">Profile</TabsTrigger>
    <TabsTrigger value="donations" variant="pill">Donations</TabsTrigger>
    <TabsTrigger value="kyc" variant="pill">Verification</TabsTrigger>
  </TabsList>
  <TabsContent value="profile">...</TabsContent>
</Tabs>
```

### MultiSelectBar (`multi-select-bar.tsx`)
Bottom-docked batch action bar for lists (Saved campaigns, signers, rows):
```tsx
import { MultiSelectBar } from "@/components/ui/multi-select-bar"

<MultiSelectBar
  selectedCount={selectedIds.length}
  onClearSelection={() => setSelectedIds([])}
  actions={
    <>
      <Button variant="subtle" size="sm" onClick={handleMove}>Move to list</Button>
      <Button variant="rust" size="sm" onClick={handleRemove}>Remove</Button>
    </>
  }
/>
```

---

## 5. Interaction Rules

1. **One level at a time.** A multi-step flow (verification levels, bounty claim → submit → review → paid) shows exactly one active step; completed steps collapse to a summary, future steps are visible but inert.
2. **State the wait before the work.** When something is processing (documents under review, a bank transfer in flight), say how long it normally takes and what happens next — don't just show a spinner.
3. **Removal is reversible until it isn't.** Bookmarking, list membership, and draft edits undo silently (toast with "Undo"). Money movement, deleting a saved list, and account closure require a typed or explicit confirmation and are stated as irreversible.
4. **A rejection names the exact mismatch and offers the one-tap fix.** ("The name on the slip reads X, your account says Y") plus a button that resolves it directly, never just "try again."
5. **Confirmation dialogs restate the number.** Withdrawals, bulk actions, and account closure show the exact amount/count being acted on in the confirmation step, not just a generic "Are you sure?".
6. **A settings-style index has no sub-rail on narrow screens.** Settings (Profile, Notifications, Payments, Privacy, Security, Verification) is a flat index of full, independently-routed pages, not a persistent sub-navigation rail squeezed into a narrow column — the index page itself *is* the navigation.

---

## 6. Extending This System

- Before adding a new color or component, check this file and `components/ui/` first.
- New tokens belong in `app/globals.css` `:root` + `tailwind.config.ts`, never as arbitrary hardcoded hex codes.
- Extend `cva()` variant tables rather than creating parallel duplicate components.
