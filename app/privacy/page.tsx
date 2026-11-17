"use client";

import { motion } from "framer-motion";
import {
  Shield,
  Lock,
  Eye,
  Database,
  UserCheck,
  Mail,
  Scale,
} from "lucide-react";
import { useAnimateInView } from "@/hooks/use-animate-In-view";

const sections = [
  {
    icon: Eye,
    title: "1. Information We Collect",
    content: [
      {
        subtitle: "Personal Information",
        text: "When you create an account on RefreeG, we collect information such as your name, email address, phone number, and payment details. This information is necessary to provide you with our crowdfunding services and ensure secure transactions.",
      },
      {
        subtitle: "Cause Information",
        text: "When you create a cause or petition, we collect details including the cause title, description, goals, images, and supporting documentation. This information is made public to help you raise funds and awareness.",
      },
      {
        subtitle: "Transaction Data",
        text: "We collect information about your donations and withdrawals, including transaction amounts, payment methods, and blockchain transaction records for transparency purposes.",
      },
      {
        subtitle: "Usage Data",
        text: "We automatically collect information about how you interact with our platform, including your IP address, browser type, device information, and pages visited to improve our services.",
      },
    ],
  },
  {
    icon: Database,
    title: "2. How We Use Your Information",
    content: [
      {
        subtitle: "Service Delivery",
        text: "We use your information to create and manage your account, process donations, verify causes, and facilitate secure fund transfers between donors and cause creators.",
      },
      {
        subtitle: "Communication",
        text: "We may send you important updates about your account, causes you support, platform changes, and promotional materials (which you can opt out of at any time).",
      },
      {
        subtitle: "Security and Fraud Prevention",
        text: "We use your information to verify identities, prevent fraudulent activities, and ensure compliance with our policies and applicable laws.",
      },
      {
        subtitle: "Platform Improvement",
        text: "We analyze usage data to understand user behavior, improve our features, and enhance the overall user experience on RefreeG.",
      },
    ],
  },
  {
    icon: Lock,
    title: "3. How We Protect Your Information",
    content: [
      {
        subtitle: "Encryption",
        text: "All sensitive data, including payment information and personal details, is encrypted using industry-standard SSL/TLS protocols during transmission and storage.",
      },
      {
        subtitle: "Blockchain Security",
        text: "Transaction records are stored on the blockchain, providing an immutable and transparent ledger that enhances security and accountability.",
      },
      {
        subtitle: "Access Controls",
        text: "We implement strict access controls to ensure that only authorized personnel can access your personal information, and only when necessary for legitimate business purposes.",
      },
      {
        subtitle: "Regular Security Audits",
        text: "Our systems undergo regular security assessments and audits to identify and address potential vulnerabilities.",
      },
    ],
  },
  {
    icon: UserCheck,
    title: "4. Sharing Your Information",
    content: [
      {
        subtitle: "Public Information",
        text: "Information about causes, petitions, and public donations (excluding personal donor information if anonymous) is displayed publicly on our platform to promote transparency.",
      },
      {
        subtitle: "Payment Processors",
        text: "We share necessary payment information with our payment partners (like Paystack) to process transactions securely. These partners are bound by strict confidentiality agreements.",
      },
      {
        subtitle: "Legal Requirements",
        text: "We may disclose your information if required by law, court order, or governmental regulations, or to protect the rights and safety of RefreeG and our users.",
      },
      {
        subtitle: "Business Transfers",
        text: "In the event of a merger, acquisition, or sale of assets, your information may be transferred to the new entity, subject to the same privacy protections.",
      },
    ],
  },
  {
    icon: Scale,
    title: "5. Your Rights and Choices",
    content: [
      {
        subtitle: "Access and Update",
        text: "You have the right to access, review, and update your personal information at any time through your account settings.",
      },
      {
        subtitle: "Data Deletion",
        text: "You can request deletion of your account and associated data by contacting our support team. Note that some information may be retained for legal or legitimate business purposes.",
      },
      {
        subtitle: "Communication Preferences",
        text: "You can opt out of promotional emails at any time by clicking the unsubscribe link in our emails or adjusting your notification settings.",
      },
      {
        subtitle: "Cookie Management",
        text: "You can control cookie preferences through your browser settings, though this may affect some platform functionalities.",
      },
    ],
  },
  {
    icon: Mail,
    title: "6. Cookies and Tracking",
    content: [
      {
        subtitle: "Essential Cookies",
        text: "We use cookies that are necessary for the platform to function properly, including session management and security features.",
      },
      {
        subtitle: "Analytics Cookies",
        text: "We use analytics tools to understand how users interact with our platform, helping us improve user experience and identify issues.",
      },
      {
        subtitle: "Marketing Cookies",
        text: "With your consent, we may use cookies to deliver personalized content and advertisements based on your interests and browsing behavior.",
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
        className="bg-gradient-to-r from-palette-primary to-[#0055aa] text-white py-20"
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
              Your privacy matters to us. Learn how we collect, use, and protect
              your personal information.
            </p>
            <p className="text-sm text-blue-200 mt-4">
              Last Updated: January 9, 2026
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
              Policy explains how we collect, use, share, and safeguard your
              data when you use our blockchain-powered crowdfunding platform.
            </p>
            <p className="text-gray-700 leading-relaxed">
              By using RefreeG, you agree to the terms outlined in this Support
              Policy. If you have any questions or concerns, please contact us
              at{" "}
              <a
                href="mailto:support@refreeg.com"
                className="text-blue-600 hover:underline font-medium"
              >
                support@refreeg.com
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
