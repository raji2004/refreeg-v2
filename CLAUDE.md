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
[docs/CODE_STANDARDS.mdx](docs/CODE_STANDARDS.mdx): actions only do the work,
no intermediary layers, real backend errors only, one state object per form,
zod validation, one dialog per file, options files, say-it-once, use existing
components. The `refreeg-code-standards` skill (`.claude/skills/`) applies it
when writing and when reviewing changes "against the standard".
