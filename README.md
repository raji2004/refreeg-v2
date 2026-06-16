# RefreeG ![RefreeG Logo](public/logo.svg)

[![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.17-38B2AC)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-latest-2D3748)](https://prisma.io/)
[![NextAuth](https://img.shields.io/badge/NextAuth-5-purple)](https://next-auth.js.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## Empower Communities, Build a Better World

RefreeG is a blockchain-powered crowdfunding platform designed to empower communities through transparent and secure fundraising. Support causes that foster socioeconomic growth, from education and healthcare to disaster relief and social justice initiatives. With RefreeG, anyone can start or support verified causes, track donations in real-time, and drive measurable impact across Africa and beyond.

![RefreeG Hero](public/hero1.png)

## 🌟 Features

<!-- - **Blockchain Transparency**: Every donation is recorded on the blockchain for immutable tracking and accountability. -->

- **Global Accessibility**: Support causes from anywhere in the world with our secure, web-based platform.
- **Crypto & Fiat Donations**: Donate using traditional methods (Paystack) or cryptocurrencies (Ethereum, Solana, etc.).
- **Petition System**: Start or sign petitions to drive awareness and change on social, political, or community issues.
- **Cause Verification**: All causes undergo rigorous vetting to ensure legitimacy and prevent fraud.
- **User Dashboards**: Manage your donations, petitions, and profiles with personalized dashboards.
- **Real-Time Tracking**: Monitor donation progress and fund allocation in real-time.
- **KYC Integration**: Secure user verification for donors and recipients.
- **AI Agent Assistance**: Smart AI agent to guide users, help with onboarding, and answer platform queries.
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices.
- **Multi-Language Support**: Built with internationalization in mind.
- **Community Engagement**: Share causes, leave comments, and build a network of changemakers.

## 🚀 Tech Stack

### Frontend

- **Framework**: [Next.js 15](https://nextjs.org/) - React-based full-stack framework
- **Language**: [TypeScript 5](https://www.typescriptlang.org/) - Type-safe JavaScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- **UI Components**:
  - [Radix UI](https://www.radix-ui.com/) - Accessible, unstyled UI primitives
  - [HeroUI](https://heroui.com/) - Beautiful React components
- **Animations**: [Framer Motion](https://www.framer.com/motion/) - Production-ready motion library
- **Icons**: [Lucide React](https://lucide.dev/) & [Tabler Icons](https://tabler-icons.io/)

### Backend & Database

- **ORM & Database**: [Prisma](https://prisma.io/) with PostgreSQL (Self-hosted on AWS EC2)
- **Authentication**: [NextAuth.js (Auth.js)](https://next-auth.js.org/) with Prisma Adapter (Credentials, OTP, Google OAuth)
- **File Storage**: [AWS S3](https://aws.amazon.com/s3/) (Private Buckets with Pre-signed URLs)
- **API**: Next.js Server Actions and API routes

### Payments & Blockchain

- **Fiat Payments**: [Paystack](https://paystack.com/) - Nigerian payment processor
- **Crypto Payments**:
  - [Ethers.js](https://docs.ethers.org/) - Ethereum blockchain interaction
  - [Solana Web3.js](https://solana.com/docs/clients/javascript-api) - Solana blockchain
  - [MetaMask](https://metamask.io/) - Ethereum wallet integration
- **Blockchain**: Immutable transaction logging for transparency

### Development Tools

- **Package Manager**: [pnpm](https://pnpm.io/) - Fast, disk-efficient package manager
- **Linting**: [ESLint](https://eslint.org/) - Code quality tool
- **Email Service**: [Nodemailer](https://nodemailer.com/) - Email sending
- **Form Handling**: [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/) validation
- **State Management**: [TanStack Query](https://tanstack.com/query/) - Data fetching and caching
- **Charts**: [Recharts](https://recharts.org/) - Composable charting library

## 📋 Prerequisites

Before running this project, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (version 18 or higher)
- [pnpm](https://pnpm.io/) (recommended) or npm
- A PostgreSQL Database (Local or AWS EC2)
- AWS Account with S3 bucket and IAM permissions
- Paystack account for fiat payments
- MetaMask or compatible crypto wallet for crypto donations

## 🛠️ Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/your-username/refreeg-v2.git
   cd refreeg-v2
   ```

2. **Install dependencies**:

   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env.local` file in the root directory and add the following:

   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/refreeg"
   AUTH_SECRET="your_nextauth_secret"
   GOOGLE_CLIENT_ID="your_google_id"
   GOOGLE_CLIENT_SECRET="your_google_secret"
   AWS_REGION="your_aws_region"
   AWS_S3_BUCKET="your_s3_bucket_name"
   # If not using EC2 IAM Role, also provide:
   # AWS_ACCESS_KEY_ID="your_aws_access_key"
   # AWS_SECRET_ACCESS_KEY="your_aws_secret_key"
   PAYSTACK_SECRET_KEY=your_paystack_secret_key
   NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
   ETHEREUM_RPC_URL=your_ethereum_rpc_url
   SOLANA_RPC_URL=your_solana_rpc_url
   EMAIL_USER=your_email_user
   EMAIL_PASS=your_email_password
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

4. **Set up Database & ORM**:

   - Create a local PostgreSQL database or connect to your AWS EC2 instance.
   - Run Prisma migrations:
     ```bash
     npx prisma generate
     npx prisma db push
     ```

5. **Set up AWS S3**:

   - Create a new private S3 bucket on AWS
   - Ensure the bucket has Block Public Access turned ON
   - If deploying to EC2, attach an IAM Role to the instance with `s3:GetObject` and `s3:PutObject` permissions
   - Alternatively, add your AWS Access Keys to the `.env.local` file

## 🚀 Usage

1. **Start the development server**:

   ```bash
   pnpm dev
   # or
   npm run dev
   ```

2. **Open your browser** and navigate to [http://localhost:3000](http://localhost:3000)

3. **Key workflows**:
   - **Browse Causes**: Visit the homepage to explore featured and urgent causes
   - **Start a Cause**: Sign up, go to Dashboard > Create Cause, fill in details
   - **Donate**: Select a cause, choose payment method (Paystack or Crypto), complete transaction
   - **Track Donations**: View your donation history and cause progress in your dashboard
   - **Petitions**: Start or sign petitions from the Petitions page

## 📁 Project Structure

```
refreeg-v2/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── dashboard/         # User dashboard pages
│   ├── causes/            # Causes listing and detail pages
│   ├── petitions/         # Petitions pages
│   └── ...
├── components/            # Reusable React components
│   ├── ui/               # UI component library
│   ├── home/             # Homepage components
│   └── ...
├── lib/                  # Utility functions and configurations
│   ├── auth/             # NextAuth configuration and logic
│   ├── prisma.ts         # Prisma client instance
│   ├── s3/               # AWS S3 client and proxy utilities
│   ├── utils.ts          # General utilities
│   └── ...
├── prisma/               # Prisma schema definitions and migrations
├── services/             # External service integrations
│   ├── paystack.ts       # Paystack payment service
│   ├── mail.ts           # Email service
│   └── ...
├── public/               # Static assets
├── styles/               # Global styles
└── types/                # TypeScript type definitions
```

## 🤝 Contributing

We welcome contributions from RefreeG Developers! Here's how you can get involved:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes** and ensure tests pass
4. **Commit your changes**: `git commit -m 'Add some feature'`
5. **Push to the branch**: `git push origin feature/your-feature-name`
6. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style and conventions
- Write clear, concise commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all linting passes: `pnpm lint`

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Contact

- **Website**: [https://www.refreeg.com](https://www.refreeg.com)
- **Email**: support@refreeg.com
- **Twitter**: [@RefreeG](https://twitter.com/RefreeG)
- **LinkedIn**: [RefreeG](https://linkedin.com/company/refreeg)

## 🙏 Acknowledgments

- Special thanks to AWS, Paystack, and the blockchain communities for their amazing tools
- Inspired by the need for transparent, impactful crowdfunding in Africa

---

**Join the movement. Start your cause today.** 🚀
