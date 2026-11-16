# Refreeg

## Design system

New UI work, and any substantial rework of an existing page, must follow
[docs/DESIGN_GUIDE.md](docs/DESIGN_GUIDE.md) — colors (`cream`/`ink`/`lime`/`gold`
tokens), typography (Fraunces headings, Montserrat body), and the shared
components in `components/ui/` (`Eyebrow`, `CalloutBanner`, `Stepper`,
`EmptyState`, plus the `outlined`/`ink` `Card` variants and `lime`/`ink`
`Button` variants). Read it before hardcoding a color or building a one-off
banner/status-chip/stepper — the pattern likely already exists.

The existing navy/white theme (`--primary`, `--secondary`, `--brand`, etc.)
still drives untouched pages; the two systems coexist until pages are
deliberately migrated.

## Code standards

All new code, and any file you substantially change, must follow
[docs/CODE_STANDARDS.mdx](docs/CODE_STANDARDS.mdx) and apply the
`refreeg-code-standards` skill (`.claude/skills/refreeg-code-standards/` / `.agents/skills/refreeg-code-standards/`):

### Where code lives
- `actions/<feature>-actions.ts`: Auth check, input check, one Prisma or provider call, return `{ success, error }` or data.
- `services/`, `lib/`: Provider clients (Paystack, Flutterwave, Breet, mail). No UI knowledge.
- `hooks/use-<feature>.ts`: React Query wiring and post-processing.
- `lib/schemas/<feature>.schema.ts`: One zod schema per form.
- `lib/options/<feature>.options.ts`: `{ label, value }` option lists (`xxxOptions`).
- `components/<feature>/`: Thin UI rendering, hook calls, local UI state.

### Ten Rules
1. **Actions only do the work:** Authenticate, validate, perform one operation, return `{ success, error }` or data. No display formatting or UI side effects.
2. **No intermediary layers:** Use backend pagination/filters directly; no fetch-all wrappers, needless field-renaming mappers, or single-use helpers.
3. **Show the real error, no error maps:** Show `result.error` / `query.error?.message` directly; fix bad messages in the action.
4. **One state object per form:** Share one `useState` object + `setFormFields(key, value)` updater (no per-field `useState`). Non-form flags stay separate.
5. **Validate with a zod schema:** Put form schema in `lib/schemas/<feature>.schema.ts`, validate via `useValidator({ store: form, schema })`, show `errors.<field>`. Keep `zodResolver` on existing RHF forms. Don't duplicate server-owned limits.
6. **One dialog per file:** Export named dialogs from dedicated files; reuse `ConfirmationModal` for simple confirms/deletes.
7. **Option lists go in options files:** Export `xxxOptions` with `as const satisfies readonly Option[]` from `lib/options/<feature>.options.ts`.
8. **Say it once:** Deduplicate repeated expressions, lookups, or branches within a file.
9. **Use what exists:** Reuse `EmptyState`, `CalloutBanner`, `Eyebrow`, `Card`, `Button`, `Badge`, `ConfirmationModal`, and design tokens.
10. **Small and flat:** One component per file (~200 lines max), early returns, no dead code or commented-out blocks, comments explain *why* not *what*.

Before finishing: run `pnpm lint` and `pnpm tsc --noEmit`.
