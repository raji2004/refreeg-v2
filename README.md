# RefreeG ![RefreeG Logo](public/logo.svg)

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748)](https://prisma.io/)

A crowdfunding and petition platform for verified community causes. Organisations and individuals raise funds in fiat (Paystack, Flutterwave) or crypto (Breet), with KYC-verified recipients, proof updates, and donation tracking. Built for communities in Africa and beyond.

## Quick start

Requires Node.js 18.18+ and pnpm 10.

```bash
pnpm install
npx prisma generate
npx prisma db push
pnpm dev                           # http://localhost:3000
```

Start with the core variables below and add integration variables as you need them.

## Environment

Create `.env.local` in the repository root. Core variables:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/refreeg"
AUTH_SECRET="your_auth_secret"
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Optional integrations, enabled by their variables:

| Integration                 | Variables                                                                                                   |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Google OAuth                | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`                                                                  |
| Paystack payments           | `PAYSTACK_SECRET_KEY`                                                                                       |
| Flutterwave payments        | `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_HASH`                                                        |
| Breet crypto donations      | `BREET_APP_ID`, `BREET_APP_SECRET`, `BREET_ASSET_ID`, `BREET_BASE_URL`, `BREET_ENV`, `BREET_WEBHOOK_SECRET` |
| Didit KYC                   | `DIDIT_API_KEY`, `DIDIT_CLIENT_SECRET`, `DIDIT_WORKFLOW_ID`, `DIDIT_WEBHOOK_SECRET`                         |
| AI agent                    | `DEEPSEEK_API_KEY`                                                                                          |
| Email (SMTP)                | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE`, `EMAIL_FROM`                         |
| AWS S3 uploads              | `AWS_REGION`, `AWS_S3_BUCKET` (or an EC2 instance role)                                                     |
| ConvertKit newsletter       | `CONVERTKIT_API_KEY`, `CONVERTKIT_API_SECRET`, `CONVERTKIT_FORM_ID`                                         |
| Cron and internal endpoints | `CRON_SECRET`, `INTERNAL_API_KEY`, `REVALIDATION_SECRET`                                                    |

Payment webhooks need a public URL during development; run `ngrok http 3000` and point the provider dashboards at it.

## Scripts

| Command              | What it does                                |
| -------------------- | ------------------------------------------- |
| `pnpm dev`           | Development server                          |
| `pnpm build`         | `prisma generate` then `next build`         |
| `pnpm start`         | Production server                           |
| `pnpm lint`          | ESLint                                      |
| `pnpm tsc --noEmit`  | Type check                                  |
| `pnpm test`          | Jest unit tests                             |
| `pnpm test:e2e`      | Playwright end-to-end tests                 |
| `pnpm test:e2e:prod` | Playwright against https://apps.refreeg.com |

## Project structure

```
refreeg/
├── app/            # Next.js App Router pages and API routes
├── actions/        # Server actions (causes, donations, petitions, admin, KYC, ...)
├── components/     # React components, grouped by domain
├── lib/            # Auth, Prisma, S3, Breet, rate limiting, health, schemas
├── services/       # External integrations (Paystack, Flutterwave, mail, ConvertKit, DeepSeek)
├── prisma/         # Schema and migrations (PostgreSQL)
├── e2e/            # Playwright specs
├── infra/ nginx/   # Deployment configuration
├── docs/           # Engineering docs (see below)
├── styles/         # Global styles
└── types/          # Shared TypeScript types
```

## Engineering handbook

Detailed documentation lives in [`docs/`](docs/) and [`AGENTS.md`](AGENTS.md):

- [Code standards](docs/CODE_STANDARDS.mdx)
- [Design guide](docs/DESIGN_GUIDE.md)
- [Error reporting](docs/ERROR_REPORTING.md)
- [Admin analytics](docs/ADMIN_ANALYTICS.md)
- [AWS scaling plan](docs/AWS_SCALING_PLAN.md)

Before opening a pull request: `pnpm lint`, `pnpm tsc --noEmit`, and relevant tests must pass. Branch from `main`, use a descriptive prefix (`feature/`, `fix/`, `chore/`), and keep commits focused.

## Contact

- Website: [https://www.refreeg.com](https://www.refreeg.com)
- Email: support@refreeg.com
