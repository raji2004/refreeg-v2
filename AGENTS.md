# Refreeg: instructions for AI coding agents

Applies to any agent (Antigravity, subagents, Claude Code, Cursor, Codex, Copilot, Gemini, others) working on `refreeg-v2`.

1. **Code structure & style:** Always follow [docs/CODE_STANDARDS.mdx](docs/CODE_STANDARDS.mdx) and activate the `refreeg-code-standards` skill ([.agents/skills/refreeg-code-standards/SKILL.md](.agents/skills/refreeg-code-standards/SKILL.md)) before writing or reviewing code.
2. **Visual design:** Follow [docs/DESIGN_GUIDE.md](docs/DESIGN_GUIDE.md) (colors, typography, shared UI components in `components/ui/`).
3. **Reviewing changes:** When asked to review, rate, or fix changes "against the standard", run the review procedure in [docs/CODE_STANDARDS.mdx](docs/CODE_STANDARDS.mdx) / `refreeg-code-standards`.
4. **Before finishing:** Run `pnpm lint` and `pnpm tsc --noEmit`.

## Where code lives (`refreeg-v2`)

| Layer | Location | Job |
| --- | --- | --- |
| Server actions | `actions/<feature>-actions.ts` | Auth check, input check, one Prisma or provider call, return `{ success, error }` or data. Nothing else. |
| Provider clients | `services/`, `lib/` | Talk to Paystack, Flutterwave, Breet, mail. No UI knowledge. |
| Hooks | `hooks/use-<feature>.ts` | React Query wiring and any post-processing of a result. |
| Schemas | `lib/schemas/<feature>.schema.ts` | One zod schema per form. |
| Options | `lib/options/<feature>.options.ts` | Label and value lists (`xxxOptions`). |
| Components | `components/<feature>/` | Thin. Render, call hooks, hold local UI state. |

## Core Rules (from `docs/CODE_STANDARDS.mdx`)

Follow these for all new code and any file you substantially change (do not mass-rewrite untouched legacy files):

1. **Actions only do the work, nothing around it:** Authenticate, validate, run one operation, and return `{ success, error }` or data. No formatting for display, toasting, or UI side effects inside actions; post-processing goes in `hooks/use-<feature>.ts`.
2. **No intermediary layers:** Use plain calls, backend pagination, and API filters. No fetch-all-pages wrappers, needless field-renaming mappers, or single-use helpers.
3. **Show the real error, no error maps:** Surface `result.error` or `query.error?.message` directly. No `*_ERRORS` maps, error translators, or generic fallback strings at call sites — fix poor messages in the action.
4. **One state object per form:** Forms/dialogs with related fields share one `useState` object and one `setFormFields(key, value)` updater (no per-field `useState`). Non-form flags (tabs, open, loading) stay separate. Shared forms reuse a hook (e.g., `hooks/use-pledge-form.ts`).
5. **Validate with a zod schema:** Store each form schema in `lib/schemas/<feature>.schema.ts` and validate via `useValidator({ store: form, schema })` (`hooks/use-validator.ts`), displaying `errors.<field>` with `FieldError`. Do not duplicate server-owned limits (fee caps, provider minimums, rate limits). Submit order: validate -> double-submit guard -> call action. Keep `zodResolver` on existing React Hook Form forms.
6. **One dialog per file:** Each dialog gets its own file named for its job (`create-pledge-dialog.tsx`), exported by name. Page/section files only import dialogs and control open state. Use `ConfirmationModal` for plain confirms/deletes.
7. **Option lists go in options files:** Put `{ label, value }` lists in `lib/options/<feature>.options.ts` as `xxxOptions` with `as const satisfies readonly Option[]` (never `UPPER_CASE`, never inline in components/constants). Components take `readonly` option arrays.
8. **Say it once:** If an expression, lookup, or branch appears twice in a file, extract a variable or small same-file helper.
9. **Use what exists:** Check `components/ui/` and shared components first (`EmptyState`, `CalloutBanner`, `Eyebrow`, `Card`, `Button`, `Badge`, `ConfirmationModal`). Never hardcode colors/fonts — use design tokens from `docs/DESIGN_GUIDE.md`. Do not duplicate empty states outside the list component.
10. **Small and flat:** One component per file (~200 lines max), early returns over deep nesting, no dead code or commented-out blocks, plain descriptive names, and comments that explain *why*, not *what*.
