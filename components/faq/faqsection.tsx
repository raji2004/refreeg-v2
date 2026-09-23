"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ChevronDownIcon, PlusIcon, MinusIcon } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as any },
  },
};

type FAQItem = {
  id: string;
  question: string;
  answer: string;
  icon: string;
};

type FAQCategory = {
  name: string;
  items: FAQItem[];
};

const faqData: FAQCategory[] = [
  {
    name: "General",
    items: [
      {
        id: "what-is-refreeg",
        question: "What is RefreeG?",
        answer:
          "RefreeG is a crowdfunding platform dedicated to supporting various causes with a strong focus on fostering socio-economic growth in African communities through blockchain transparency.",
        icon: "ℹ️",
      },
      {
        id: "transparency",
        question: "How does RefreeG ensure transparency?",
        answer:
          "RefreeG uses blockchain technology to ensure complete transparency in all transactions. Every donation is recorded on the blockchain, making it publicly verifiable and tamper-proof. Donors can track exactly where their funds go.",
        icon: "💖",
      },
      {
        id: "causes-supported",
        question: "What types of causes does RefreeG support?",
        answer:
          "RefreeG supports a wide range of causes including healthcare, education, disaster relief, community development, environmental initiatives, and small business funding, with a particular focus on African communities.",
        icon: "📄",
      },
      {
        id: "get-involved",
        question: "How can I get involved with RefreeG?",
        answer:
          "You can get involved by creating a cause, donating to existing causes, sharing campaigns on social media, or volunteering your skills. Simply create an account to get started.",
        icon: "👥",
      },
      {
        id: "different",
        question:
          "What makes RefreeG different from other crowdfunding platforms?",
        answer:
          "RefreeG stands out through its blockchain transparency, focus on African communities, fund streaming protection, zero withdrawal fees, and comprehensive donor guarantee system that ensures accountability.",
        icon: "📊",
      },
    ],
  },
  {
    name: "Features",
    items: [
      {
        id: "fund-streaming",
        question: "How does fund streaming work?",
        answer:
          "Fund streaming releases donations gradually to cause owners based on milestones. This ensures accountability and allows donors to monitor progress before all funds are released.",
        icon: "🔄",
      },
      {
        id: "crypto-support",
        question: "Do you support cryptocurrency donations?",
        answer:
          "Yes, RefreeG supports multiple cryptocurrencies including Bitcoin, Ethereum, and other major digital assets, in addition to traditional payment methods.",
        icon: "₿",
      },
    ],
  },
  {
    name: "Resources",
    items: [
      {
        id: "getting-started",
        question: "How do I get started as a cause creator?",
        answer:
          "Creating a cause is simple: sign up, complete your profile verification, create your campaign with compelling story and goals, and submit for review. Our team will help you launch successfully.",
        icon: "🚀",
      },
      {
        id: "support",
        question: "Where can I get help and support?",
        answer:
          "You can contact our support team at support@refreeg.com, check our help center, or use the live chat feature on our website for immediate assistance.",
        icon: "💬",
      },
    ],
  },
];

export default function FAQSection() {
  const [activeTab, setActiveTab] = useState("General");
  const [expandedItem, setExpandedItem] = useState<string>("what-is-refreeg");

  const activeCategory =
    faqData.find((cat) => cat.name === activeTab) || faqData[0];

  const toggleExpanded = (itemId: string) => {
    setExpandedItem(expandedItem === itemId ? "" : itemId);
  };

  return (
    <motion.div
      className="w-full h-auto px-6 md:px-0 mt-16"
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
    >
      <div className="max-w-4xl mx-auto">
        {}
        <motion.div
          className="flex justify-center mb-8"
          variants={itemVariants}
        >
          <div className="inline-flex bg-gray-100 rounded-lg p-1">
            {faqData.map((category) => (
              <button
                key={category.name}
                onClick={() => setActiveTab(category.name)}
                className={`px-6 py-3 rounded-md font-medium text-sm transition-all duration-300 ${
                  activeTab === category.name
                    ? "bg-blue-500 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </motion.div>

        {/* FAQ Items */}
        <motion.div className="space-y-4" variants={itemVariants}>
          {activeCategory.items.map((item, index) => (
            <div
              key={item.id}
              className="border-b border-gray-200 rounded-lg overflow-hidden bg-white"
            >
              <motion.button
                className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
                onClick={() => toggleExpanded(item.id)}
                whileHover={{ scale: 1.001 }}
                whileTap={{ scale: 0.999 }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-lg font-medium text-gray-900">
                    {item.question}
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: expandedItem === item.id ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {expandedItem === item.id ? (
                    <MinusIcon className="w-5 h-5 text-blue-500" />
                  ) : (
                    <PlusIcon className="w-5 h-5 text-gray-400" />
                  )}
                </motion.div>
              </motion.button>

              <AnimatePresence>
                {expandedItem === item.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 pl-16 text-gray-600 leading-relaxed">
                      {item.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
