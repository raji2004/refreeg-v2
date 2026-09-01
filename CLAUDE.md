# RefreeG

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
