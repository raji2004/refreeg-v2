"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Shield,
  Lock,
  Eye,
  Database,
  UserCheck,
  Mail,
  Scale,
  Trash2,
} from "lucide-react";
import { useAnimateInView } from "@/hooks/use-animate-In-view";
import { DATA_RETENTION_POLICY } from "@/lib/config/retention";

const sections = [
  {
    icon: Eye,
    title: "1. Information We Collect",
    content: [
      {
        subtitle: "Personal & Profile Information",
        text: "When you create an account on RefreeG, we collect your name, email address, phone number, profile photo, and payout bank details (when you register as a cause creator). This information is required to provide crowdfunding services and route funds securely.",
      },
      {
        subtitle: "Identity Verification (KYC) Data",
        text: "If you apply to verify your identity as a campaign creator, we and our identity verification partner (Didit) collect your government-issued ID details, residential address, date of birth, and a live selfie/biometric liveness check solely for identity verification and fraud prevention.",
      },
      {
        subtitle: "Cause, Petition & Community Content",
        text: "When you create a cause, petition, or comment, we collect the title, story, funding goals, uploaded images/videos, and supporting verification documents.",
      },
      {
        subtitle: "Transaction & Device Data",
        text: "We collect records of donations, pledges, and settlements (amount, currency, payment reference, and optional donor note), as well as device push notification tokens (Firebase Cloud Messaging) and basic technical diagnostics needed to keep the service secure.",
      },
    ],
  },
  {
    icon: Database,
    title: "2. How We Use Your Information",
    content: [
      {
        subtitle: "Service Delivery & Direct Settlement",
        text: "We use your information to manage your account, process fiat and cryptocurrency donations, verify campaign creators, and settle raised funds directly to verified creators.",
      },
      {
        subtitle: "Safety, Moderation & Fraud Prevention",
        text: `We use identity and activity data to prevent fraud, enforce our Terms of Service, and review user-reported content within ${DATA_RETENTION_POLICY.MODERATION_SLA_HOURS} hours.`,
      },
      {
        subtitle: "Notifications & Updates",
        text: "We send transactional updates about your donations, pledges, KYC verification status, and campaigns. You can manage push and email notification preferences in your account settings at any time.",
      },
    ],
  },
  {
    icon: Lock,
    title: "3. How We Protect Your Information",
    content: [
      {
        subtitle: "Encryption in Transit & at Rest",
        text: "All personal data, KYC documents, and payment communications are transmitted over HTTPS/TLS and stored in encrypted databases and access-controlled Amazon Web Services (AWS S3) storage using short-lived presigned URLs.",
      },
      {
        subtitle: "No Raw Card Storage",
        text: "RefreeG does not store full credit/debit card numbers or CVV codes. Card and bank payments are processed directly by PCI-DSS compliant payment partners.",
      },
      {
        subtitle: "Strict Access Controls",
        text: "Only authorized compliance and support personnel can review KYC submissions or moderation reports, and only when necessary for verification or safety enforcement.",
      },
    ],
  },
  {
    icon: UserCheck,
    title: "4. Third-Party Service Providers",
    content: [
      {
        subtitle: "Payment & Crypto Settlement Partners (Paystack & Breet)",
        text: "Fiat NGN donations and recurring pledges are processed via Paystack. One-way cryptocurrency donations (such as USDT) are processed and settled via Breet. RefreeG is not a cryptocurrency exchange or custodial wallet.",
      },
      {
        subtitle: "Identity Verification (Didit)",
        text: "Creator identity verification and facial liveness checks are processed securely through Didit.",
      },
      {
        subtitle: "Authentication, Push Notifications & Cloud Storage",
        text: "We use Google Sign-In and Firebase Cloud Messaging (FCM) for authentication and push notifications, and AWS S3 for secure media storage.",
      },
      {
        subtitle: "Legal Compliance",
        text: "We may disclose information when required by applicable law, court order, or financial regulatory authorities.",
      },
    ],
  },
  {
    icon: Trash2,
    title: "5. Account Deletion & Data Retention",
    content: [
      {
        subtitle: "Self-Service Account Deletion (Mobile & Web)",
        text: "You can permanently delete your account at any time directly inside the RefreeG mobile app (open the You tab -> tap Delete account) or on the web (Dashboard -> Settings -> Delete Account). You can also view full instructions at refreeg.com/delete-account.",
      },
      {
        subtitle: "What Is Deleted Immediately",
        text: "When you delete your account, we immediately and permanently delete your personal profile information (name, email, phone number, bio, social links, saved bank details), KYC verification records and uploaded ID/selfie images, Didit verification sessions, push notification device tokens, saved cards, comments, petitions, and any unfunded campaigns.",
      },
      {
        subtitle: "Financial Record Anonymization & Retention Period",
        text: `To comply with financial audit, anti-money-laundering (AML), and tax regulations, completed donation, pledge, and settlement records are not deleted; instead, they are permanently anonymized (unlinked from your user ID, with your name replaced by "${DATA_RETENTION_POLICY.DELETED_ACCOUNT_DISPLAY_NAME}" and your email replaced with a non-identifiable placeholder) and retained for ${DATA_RETENTION_POLICY.FINANCIAL_RECORDS_RETENTION_YEARS} years. Security and moderation audit logs are retained for up to ${DATA_RETENTION_POLICY.SECURITY_LOGS_RETENTION_DAYS} days.`,
      },
      {
        subtitle: "Active Funded Campaigns",
        text: "If you have an active, unpaused campaign that has raised funds from donors, you must pause or close the campaign before deleting your account so donor transparency is preserved.",
      },
    ],
  },
  {
    icon: Scale,
    title: "6. Your Rights and Choices",
    content: [
      {
        subtitle: "Access, Correction & Portability",
        text: "You can access and update your personal details at any time in your profile settings, or contact us to request a copy of your personal data.",
      },
      {
        subtitle: "Content Reporting & User Blocking",
        text: `You can report inappropriate campaigns, petitions, or comments and block abusive users directly in the app. Our moderation team reviews all reports within ${DATA_RETENTION_POLICY.MODERATION_SLA_HOURS} hours.`,
      },
    ],
  },
  {
    icon: Mail,
    title: "7. Cookies and Session Storage",
    content: [
      {
        subtitle: "Essential Authentication Cookies & Tokens",
        text: "We use secure session cookies on the web and encrypted token storage on mobile devices strictly to keep you signed in and protect your account.",
      },
      {
        subtitle: "Analytics & Performance",
        text: "We use aggregate performance metrics to diagnose crashes and improve platform reliability.",
      },
    ],
  },
];

export default function PrivacyPolicy() {
  const { ref: headerRef, isInView: headerInView } = useAnimateInView({
    once: true,
    margin: "-100px",
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <motion.div
        ref={headerRef}
        initial={{ opacity: 0, y: 30 }}
        animate={headerInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8 }}
        className="bg-gradient-to-r from-[#003366] to-[#0055aa] text-white py-20"
      >
        <div className="container px-6">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={headerInView ? { scale: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-block mb-6"
            >
              <Shield className="w-20 h-20 mx-auto" />
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Privacy Policy
            </h1>
            <p className="text-lg md:text-xl text-blue-100">
              Your privacy matters to us. Learn how we collect, use, protect,
              and delete your personal information.
            </p>
            <p className="text-sm text-blue-200 mt-4">
              Last Updated: October 2026
            </p>
          </div>
        </div>
      </motion.div>

      <div className="container px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-2xl shadow-lg p-8 mb-12 border border-blue-100"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome to RefreeG
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              At RefreeG, we are committed to protecting your privacy and
              ensuring the security of your personal information. This Privacy
              Policy explains how we collect, use, share, retain, and delete
              your data when you use the RefreeG web and mobile applications.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Need to delete your account and personal data? Visit our{" "}
              <Link
                href="/delete-account"
                className="text-blue-600 hover:underline font-medium"
              >
                Account & Data Deletion page
              </Link>{" "}
              or contact us at{" "}
              <a
                href={`mailto:${DATA_RETENTION_POLICY.SUPPORT_EMAIL}`}
                className="text-blue-600 hover:underline font-medium"
              >
                {DATA_RETENTION_POLICY.SUPPORT_EMAIL}
              </a>
              .
            </p>
          </motion.div>

          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <Section
                key={index}
                section={section}
                index={index}
                Icon={Icon}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Section({
  section,
  index,
  Icon,
}: {
  section: any;
  index: number;
  Icon: any;
}) {
  const { ref, isInView } = useAnimateInView({ once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100 hover:shadow-xl transition-shadow"
    >
      <div className="flex items-start gap-4 mb-6">
        <div className="bg-blue-100 p-3 rounded-lg">
          <Icon className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 flex-1">
          {section.title}
        </h2>
      </div>

      <div className="space-y-6">
        {section.content.map((item: any, idx: number) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: index * 0.1 + idx * 0.1 }}
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {item.subtitle}
            </h3>
            <p className="text-gray-600 leading-relaxed">{item.text}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
