---
name: refreeg-code-standards
description: Refreeg code standard for writing and reviewing code. Use when writing or changing components, hooks, server actions, forms or dialogs, or when asked to review, rate or fix uncommitted changes against the standard.
---

Tool-agnostic: works for any AI coding agent or human reviewer. Full rules with examples: `docs/CODE_STANDARDS.mdx`. Visual rules: `docs/DESIGN_GUIDE.md`. Read the mdx when a rule is unclear.

## Checklist

1. **Actions do only the work.** `actions/*` authenticate, validate, run one operation, return `{ success, error }` or data. Parsing, view shaping and side effects (toast, open tab) go in a hook under `hooks/`.
2. **No intermediary layers.** Plain call, backend pagination, API filters. No fetch-all-pages wrappers, no single-use helpers, no needless mappers.
3. **Real errors only.** Show `result.error` or `query.error?.message` directly. No error helper, no `*_ERRORS` maps, no generic fallback strings at call sites. Fix bad messages in the action.
4. **One state object per form.** One `useState` object plus a `setFormFields(key, value)` updater. No per-field `useState`. Forms using React Hook Form skip this.
5. **Zod for forms.** Schema in `lib/schemas/<feature>.schema.ts`, `useForm` plus `zodResolver`, `components/ui/form.tsx` messages under fields. Do not hardcode limits the server owns.
6. **One dialog per file.** Named for its job, exported by name. Sections only import and open them. Try `ConfirmationModal` first.
7. **Options files.** `{ label, value }` lists in `lib/options/<feature>.options.ts` as `xxxOptions`, `as const satisfies readonly Option[]`.
8. **Say it once.** Repeated expression, lookup or branch in a file becomes a variable or same-file helper.
9. **Use what exists.** Check `components/ui/` before raw HTML. Use `EmptyState`, `CalloutBanner`, `Eyebrow`, `Card`, `Button`, `Badge`. Vary the empty message by state, no extra empty-state ternary. Design tokens, never hardcoded colors.
10. **Small and flat.** One component per file, about 200 lines max, early returns, no dead code, comments explain why only.

## When writing

Apply the checklist while writing, not after. For ported or stashed code, run the checklist on it before finishing.

## When reviewing or rating

1. List changed and untracked files (read-only git commands, never commit or push unless asked).
2. Check each file against rules 1 to 10 and the design guide. Specifically hunt raw HTML where a shared component exists.
3. Report each hit as `file:line`, rule number, fix. End with a short verdict.
4. If asked to fix, fix every hit, then review again until clean. Run `pnpm lint` and `pnpm tsc --noEmit`.

Old files that break a rule stay as-is unless the change touches them.

## When corrected

If the user or a reviewer corrects a pattern, add it as a rule to `docs/CODE_STANDARDS.mdx` and to this checklist so it is not repeated.
