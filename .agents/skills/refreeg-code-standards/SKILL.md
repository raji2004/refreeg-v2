---
name: refreeg-code-standards
description: Refreeg code standard for writing and reviewing code on the RefreeG web app (refreeg-v2). Use whenever writing, editing, or reviewing components, hooks, server actions, forms, schemas, options, or dialogs, or when asked to review, rate, or fix changes against the standard.
---

Tool-agnostic: works for any AI coding agent (Antigravity, subagents, Claude Code, Cursor, Codex, Copilot) or human reviewer. Source of truth: `docs/CODE_STANDARDS.mdx` in `refreeg-v2`. Visual rules: `docs/DESIGN_GUIDE.md`.

## Where code lives

| Layer | Location | Job |
| --- | --- | --- |
| Server actions | `actions/<feature>-actions.ts` | Auth check, input check, one Prisma or provider call, return `{ success, error }` or data. Nothing else. |
| Provider clients | `services/`, `lib/` | Talk to Paystack, Flutterwave, Breet, mail. No UI knowledge. |
| Hooks | `hooks/use-<feature>.ts` | React Query wiring and any post-processing of a result. |
| Schemas | `lib/schemas/<feature>.schema.ts` | One zod schema per form. |
| Options | `lib/options/<feature>.options.ts` | Label and value lists (`xxxOptions`). |
| Components | `components/<feature>/` | Thin. Render, call hooks, hold local UI state. |

## Checklist (10 Rules)

1. **Actions do only the work.** `actions/*` authenticate, validate, run one operation, and return `{ success, error }` or data. They do not format for display, toast, or trigger UI side effects. Parsing, view shaping, and side effects go in `hooks/use-<feature>.ts`.
2. **No intermediary layers.** Plain calls, backend pagination, and API filters. No fetch-all-pages wrappers, no single-use helpers, no needless mappers renaming fields.
3. **Real errors only.** Show `result.error` or `query.error?.message` directly. No error helper, no `*_ERRORS` maps, no per-status wording or generic fallback strings at call sites. Fix unclear messages in the action.
4. **One state object per form.** Forms and dialogs with related fields use one `useState` object plus a `setFormFields(key, value)` updater (no per-field `useState`). When one change sets two fields, call `setForm` directly in that handler. Non-form flags (`tab`, `open`, `loading`) stay separate. Forms sharing fields and submit flow share one hook (e.g. `hooks/use-pledge-form.ts`).
5. **Zod for forms.** One schema in `lib/schemas/<feature>.schema.ts`, checked with `useValidator({ store: form, schema })` (`hooks/use-validator.ts`); show `errors.<field>` under inputs (`FieldError`). Submit order: validate -> double-submit guard -> call action. Do not duplicate limits the server owns (fee caps, provider minimums, rate limits). Existing React Hook Form forms keep `zodResolver` — never mix both.
6. **One dialog per file.** Each dialog (`create`, `edit`, `delete`, `confirm`) gets its own file named for its job, exported by name. Section/page files only import and control open state. Try `ConfirmationModal` first before writing a new confirm/delete dialog.
7. **Options files.** Put `{ label, value }` lists in `lib/options/<feature>.options.ts` as `xxxOptions` with `as const satisfies readonly Option[]` (not `UPPER_CASE`, never inline in components/constants). Components accept `readonly` option arrays.
8. **Say it once.** Repeated expression, lookup, or type-based branch in a file becomes a variable or small same-file helper/hook. Scan every written file for repeats before finishing.
9. **Use what exists.** Check `components/ui/` before raw HTML. Reuse `EmptyState`, `CalloutBanner`, `Eyebrow`, `Card`, `Button`, `Badge`, `ConfirmationModal`. Vary the empty message on the single list component — no extra empty-state ternary. Use `DESIGN_GUIDE.md` tokens, never hardcoded colors or fonts.
10. **Small and flat.** One component per file (~200 lines max), early returns over nesting, no dead code/commented-out blocks/unused exports, plain names, and comments that explain *why* only.

## When writing

- Apply the checklist while writing, not after. For ported or stashed code, run the checklist on it before finishing.
- Do not mass-rewrite old files that predate these rules; apply the standard to new files and any file you substantially change.

## When reviewing or rating

1. List changed and untracked files (read-only git commands, never commit or push unless asked).
2. Check each file against rules 1 to 10 and `docs/DESIGN_GUIDE.md`. Specifically hunt raw HTML where a shared component exists, per-field `useState` in forms, inline options, and error maps.
3. Report each hit as `file:line`, rule number, and fix. End with a short verdict.
4. If asked to fix, fix every hit, then review again until clean. Run `pnpm lint` and `pnpm tsc --noEmit`.

## When corrected

If the user or a reviewer corrects a pattern, add it as a rule to `docs/CODE_STANDARDS.mdx` and mirror it in this `SKILL.md` so it is not repeated.
