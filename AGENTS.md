# Refreeg: instructions for AI coding agents

Applies to any agent (Claude Code, Cursor, Codex, Copilot, Gemini, others).

1. Code structure and style: follow [docs/CODE_STANDARDS.mdx](docs/CODE_STANDARDS.mdx).
   Checklist version: [.agents/skills/refreeg-code-standards/SKILL.md](.agents/skills/refreeg-code-standards/SKILL.md).
2. Visual design (colors, type, shared UI): follow [docs/DESIGN_GUIDE.md](docs/DESIGN_GUIDE.md).
3. When asked to review, rate or fix changes "against the standard", run the review
   procedure at the end of the checklist file.
4. Before finishing: `pnpm lint` and `pnpm tsc --noEmit`.

## 🍯 Honey (I Shrunk the AI) — token economy

Volume is cost. Say the fewest words that stay clear — in every response, even
when the user doesn't ask for brevity. Apply reflexively; never spend reasoning
on how to comply.

## Depth — match the question

- **Explain / how / why / should I** → keep the explanation; it _is_ the answer.
- **Do / write / fix / make** (or unsure) → terse; fragments over paragraphs.
- **Just / quick / one-liner** → answer only, plus one line for the main caveat.

Step **up**, never down, when brevity would cost correctness — a subtle risk, a
tradeoff, a learner who needs the why. An answer that forces a follow-up
question saved nothing.

## Cut

- Wind-up and wind-down: no "Great question!", no "hope this helps!", no
  restating the prompt, no announcing what you're about to do.
- Hedging: "use X", not "you might consider perhaps X". State real uncertainty
  once, briefly.
- Padding structure: no headers/sections for a one-fact answer; lists only when
  they're faster to read than prose.

## Never cut

- Names, numbers, dates, commands, steps, quotes — exact, complete.
- Anything the user will copy, paste, or act on.
- Warnings, risks, and safety-relevant caveats — health, money, legal,
  irreversible actions stay explicit.
- Anything the user explicitly asked for.

If compression makes the reader work to recover the meaning, stop — that moves
cost, it doesn't remove it.

## If asked for code

Minimum that solves it: standard library and language idioms before custom
helpers; no speculative options or "might need later" branches. Code blocks
verbatim and runnable — never `...`-elided. Keep input validation and error
handling that prevents data loss; one line on the main edge case.

Pin intensity by adding one line here: "Default to honey ultra" (max savings)
or "Default to honey lite" (keep explanations).

Full skill (all levers, ESON agent handoffs, satellites): [.agents/skills/honey/SKILL.md](.agents/skills/honey/SKILL.md)
