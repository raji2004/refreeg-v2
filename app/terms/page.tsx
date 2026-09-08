"use client";

import { motion } from "framer-motion";
import {
  FileText,
  UserCheck,
  AlertCircle,
  DollarSign,
  Shield,
  Ban,
  Scale,
  CheckCircle,
  Info,
  Search,
  RefreshCw,
  Users,
  Lock,
  Globe,
} from "lucide-react";
import { useAnimateInView } from "@/hooks/use-animate-In-view";

const sections = [
  {
    icon: UserCheck,
    title: "1. Acceptance of Terms",
    content: [
      {
        subtitle: "Agreement to Terms",
        text: "By accessing or using RefreeG, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any part of these terms, you may not use our platform.",
      },
      {
        subtitle: "Eligibility",
        text: "You must be at least 18 years old to use RefreeG. By using our platform, you represent and warrant that you meet this age requirement and have the legal capacity to enter into these Terms.",
      },
      {
        subtitle: "Account Registration",
        text: "To use certain features of RefreeG, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.",
      },
    ],
  },
  {
    icon: CheckCircle,
    title: "2. User Responsibilities",
    content: [
      {
        subtitle: "Accurate Information",
        text: "You agree to provide accurate, current, and complete information when creating causes, making donations, or using our services. Misleading or false information may result in account suspension or termination.",
      },
      {
        subtitle: "Cause Verification",
        text: "If you create a cause, you must provide truthful information and supporting documentation. You are responsible for ensuring that all funds raised are used for their stated purpose.",
      },
      {
        subtitle: "Lawful Use",
        text: "You agree to use RefreeG only for lawful purposes and in accordance with these Terms. You may not use our platform to engage in any fraudulent, illegal, or harmful activities.",
      },
      {
        subtitle: "Content Ownership",
        text: "You retain ownership of any content you submit to RefreeG, but you grant us a license to use, display, and distribute that content on our platform for the purpose of operating our services.",
      },
    ],
  },
  {
    icon: Search,
    title: "3. Cause Vetting Process",
    content: [
      {
        subtitle: "Verification Requirements",
        text: "All causes created on RefreeG undergo a mandatory vetting process before going live. This includes identity verification of the cause creator, review of supporting documentation, and assessment of the cause's legitimacy and purpose.",
      },
      {
        subtitle: "Due Diligence",
        text: "RefreeG conducts due diligence on each cause to verify the authenticity of the campaign, the intended use of funds, and the credibility of the beneficiary. We reserve the right to request additional information or documentation at any time.",
      },
      {
        subtitle: "Right to Reject",
        text: "RefreeG reserves the right to reject, suspend, or remove any cause that fails our vetting process, contains false information, or appears fraudulent. We are committed to protecting our users from scams and malicious campaigns.",
      },
      {
        subtitle: "Ongoing Monitoring",
        text: "Causes may be subject to ongoing monitoring and review even after going live. We may investigate reports of misuse, fraud, or violation of these Terms and take appropriate action, including removing the cause or freezing funds.",
      },
      {
        subtitle: "No Guarantee of Authenticity",
        text: "While we take reasonable steps to vet all causes and prevent fraudulent activity, RefreeG cannot guarantee the absolute authenticity, truthfulness, or accuracy of every cause. We encourage users to exercise due diligence and report any suspicious activity immediately.",
      },
    ],
  },
  {
    icon: RefreshCw,
    title: "4. Fund Usage and Reporting",
    content: [
      {
        subtitle: "Transparency Requirements",
        text: "Cause creators are required to provide regular updates on how funds are being utilized. This includes sharing progress reports, receipts, and evidence of fund application to ensure donor trust and accountability.",
      },
      {
        subtitle: "Update Schedule",
        text: "Creators must provide updates at least once every 30 days or at key milestones of their project. Failure to provide timely updates may result in account suspension or removal of the cause from the platform.",
      },
      {
        subtitle: "Proof of Impact",
        text: "Donors have the right to request proof of fund utilization. Cause creators must maintain documentation and evidence of how funds are spent and make this available upon reasonable request.",
      },
      {
        subtitle: "Consequences of Misuse",
        text: "Misappropriation of funds, failure to provide updates, or inability to demonstrate proper use of donations may result in legal action, account termination, and reporting to relevant authorities.",
      },
    ],
  },
  {
    icon: Info,
    title: "5. Platform Nature and Funding",
    content: [
      {
        subtitle: "Platform Role",
        text: "RefreeG is a crowdfunding platform that provides a space for verified cause creators to present their campaigns to potential supporters. We are not an investor matching service, venture capital firm, or funding provider. We do not guarantee that any cause will receive contributions, reach its funding goal, or attract investors.",
      },
      {
        subtitle: "No Investment Obligations",
        text: "RefreeG does not have a board of investors, funding pool, or internal investment committee that reviews or donates to campaigns. We do not promise or imply that using our platform will result in funding from RefreeG or any affiliated entities. All contributions come from independent third-party donors and supporters.",
      },
      {
        subtitle: "Campaign Success Disclaimer",
        text: "Creating a cause on RefreeG does not guarantee that it will be funded. The success of any campaign depends on the appeal of the cause to the public and the promotional efforts of the campaign creator. We do not accept liability or responsibility for campaigns that fail to attract contributions.",
      },
      {
        subtitle: "No Funding Obligation",
        text: "RefreeG does not have an obligation to contribute to, invest in, or provide funding for any cause created on the platform. We are not responsible for sourcing investors or connecting cause creators with funding opportunities. Users should not create campaigns with the expectation that RefreeG will fund them.",
      },
      {
        subtitle: "User Acknowledgment",
        text: "By using RefreeG, you expressly acknowledge and agree that: (a) RefreeG is solely a technology platform; (b) we do not provide financial advice or investment services; (c) we are not an investor, lender, or funding source; and (d) any expectation of funding from RefreeG or its affiliates is unfounded and not part of this agreement.",
      },
    ],
  },
  {
    icon: Ban,
    title: "6. Prohibited Activities",
    content: [
      {
        subtitle: "Fraudulent Causes",
        text: "Creating causes with false, misleading, or deceptive information is strictly prohibited. This includes misrepresenting the purpose, beneficiary, or urgency of a cause, or implying that RefreeG has endorsed or will fund the cause.",
      },
      {
        subtitle: "Hate Speech and Discrimination",
        text: "RefreeG does not tolerate content that promotes violence, hatred, discrimination, or harassment based on race, ethnicity, religion, gender, sexual orientation, disability, or any other protected characteristic.",
      },
      {
        subtitle: "Illegal Activities",
        text: "You may not use RefreeG to raise funds for illegal activities, including but not limited to weapons, drugs, human trafficking, or any activity that violates local, national, or international law.",
      },
      {
        subtitle: "Platform Manipulation",
        text: "Attempting to manipulate our platform, including vote manipulation, fake donations, or circumventing our security measures, is prohibited and may result in legal action.",
      },
    ],
  },
  {
    icon: DollarSign,
    title: "7. Payments and Fees",
    content: [
      {
        subtitle: "Transaction Fees",
        text: "RefreeG charges a platform fee on donations to cover operational costs and maintain our services. The current fee structure is available on our Fees & Payouts page and may be updated from time to time.",
      },
      {
        subtitle: "Payment Processing",
        text: "Donations are processed through our payment partners (Paystack for fiat, blockchain networks for crypto). RefreeG is not responsible for delays or issues caused by third-party payment processors.",
      },
      {
        subtitle: "Withdrawals",
        text: "Cause creators can withdraw funds according to our withdrawal policy. Fiat withdrawals are typically processed within 1-3 business days, while crypto withdrawals depend on blockchain network confirmations.",
      },
      {
        subtitle: "Refund Policy",
        text: "All donations made on RefreeG are final and non-refundable except in cases of proven fraud or technical error. We encourage donors to carefully review causes before donating.",
      },
    ],
  },
  {
    icon: Shield,
    title: "8. Platform Security",
    content: [
      {
        subtitle: "Account Security",
        text: "You are responsible for maintaining the security of your account. Use a strong, unique password and enable two-factor authentication (2FA) for added protection.",
      },
      {
        subtitle: "Blockchain Transparency",
        text: "Cryptocurrency transactions on RefreeG are recorded on the blockchain, providing permanent and transparent records. This ensures accountability but also means transactions cannot be reversed.",
      },
      {
        subtitle: "Suspicious Activity",
        text: "If you notice any suspicious activity on your account or encounter fraudulent causes, report them immediately through our support channels. We take security concerns seriously.",
      },
    ],
  },
  {
    icon: AlertCircle,
    title: "9. Disclaimers and Limitations",
    content: [
      {
        subtitle: "No Guarantees",
        text: "RefreeG does not guarantee that any cause will reach its funding goal or that donations will be used exactly as intended. While we thoroughly vet all causes before they go live to minimize the risk of fraud and scams, we cannot control individual user behavior after funds are disbursed. However, we require regular updates from creators to maintain transparency and accountability.",
      },
      {
        subtitle: "Platform Availability",
        text: "While we strive for 100% uptime, RefreeG is provided 'as is' without warranties of any kind. We do not guarantee uninterrupted access and may perform maintenance that temporarily limits availability.",
      },
      {
        subtitle: "Third-Party Links",
        text: "Our platform may contain links to third-party websites or services. RefreeG is not responsible for the content, privacy practices, or terms of these external sites.",
      },
      {
        subtitle: "Limitation of Liability",
        text: "RefreeG and its affiliates shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform, to the fullest extent permitted by law, including but not limited to any loss of funding opportunities, failure to raise funds, or reliance on the platform as a funding source.",
      },
    ],
  },
  {
    icon: Scale,
    title: "10. Dispute Resolution",
    content: [
      {
        subtitle: "Governing Law",
        text: "These Terms are governed by the laws of Nigeria. Any disputes arising from these Terms or your use of RefreeG will be subject to the exclusive jurisdiction of the courts in Lagos, Nigeria.",
      },
      {
        subtitle: "Arbitration",
        text: "For disputes that cannot be resolved through direct negotiation, both parties agree to participate in good faith mediation before pursuing legal action.",
      },
      {
        subtitle: "User Disputes",
        text: "Disputes between users (donors and cause creators) should first be resolved directly. RefreeG may assist in mediation but is not responsible for resolving user-to-user conflicts.",
      },
    ],
  },
  {
    icon: FileText,
    title: "11. Changes to Terms",
    content: [
      {
        subtitle: "Modifications",
        text: "RefreeG reserves the right to modify these Terms of Service at any time. We will notify users of significant changes via email or platform notifications.",
      },
      {
        subtitle: "Continued Use",
        text: "Your continued use of RefreeG after changes to these Terms constitutes acceptance of the updated terms. If you do not agree to the changes, you should discontinue use of the platform.",
      },
      {
        subtitle: "Review Regularly",
        text: "We encourage you to review these Terms periodically to stay informed about your rights and responsibilities as a RefreeG user.",
      },
    ],
  },
];

export default function TermsOfService() {
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
              initial={{ scale: 0, rotate: -180 }}
              animate={headerInView ? { scale: 1, rotate: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-block mb-6"
            >
              <FileText className="w-20 h-20 mx-auto" />
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Terms of Service
            </h1>
            <p className="text-lg md:text-xl text-purple-100">
              Please read these terms carefully before using RefreeG&apos;s
              crowdfunding platform.
            </p>
            <p className="text-sm text-purple-200 mt-4">
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
              Welcome to RefreeG&apos;s Terms of Service
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              These Terms of Service (&quot;Terms&quot;) govern your access to and use of
              RefreeG&apos;s blockchain-powered crowdfunding platform. RefreeG
              connects verified cause creators with supporters to make a
              positive impact through transparent and secure fundraising.
            </p>
            <p className="text-gray-700 leading-relaxed">
              By creating an account or using our services, you acknowledge that
              you have read, understood, and agree to be bound by these Terms.
              For questions, contact us at{" "}
              <a
                href="mailto:legal@refreeg.com"
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
        <h2 className="text-2xl font-bold text-blue-900 flex-1">
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
