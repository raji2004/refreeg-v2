# Refreeg: instructions for AI coding agents

Applies to any agent (Claude Code, Cursor, Codex, Copilot, Gemini, others).

1. Code structure and style: follow [docs/CODE_STANDARDS.mdx](docs/CODE_STANDARDS.mdx).
   Checklist version: [.agents/skills/refreeg-code-standards/SKILL.md](.agents/skills/refreeg-code-standards/SKILL.md).
2. Visual design (colors, type, shared UI): follow [docs/DESIGN_GUIDE.md](docs/DESIGN_GUIDE.md).
3. When asked to review, rate or fix changes "against the standard", run the review
   procedure at the end of the checklist file.
4. Before finishing: `pnpm lint` and `pnpm tsc --noEmit`.
