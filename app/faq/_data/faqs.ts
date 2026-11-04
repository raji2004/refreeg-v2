export type FaqCategory = {
  id: string;
  name: string;
  items: FaqItem[];
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export const COMMUNITY_LINK = "https://t.me/+ibsgFy6SL0AwYmE8";

export const faqCategories: FaqCategory[] = [
  {
    id: "general",
    name: "General",
    items: [
      {
        id: "what-is-refreeg",
        question: "What is Refreeg?",
        answer:
          "Refreeg is a crowdfunding platform for causes that build socio-economic growth in African communities, with every donation recorded on the blockchain.",
      },
      {
        id: "transparency",
        question: "How does Refreeg keep giving transparent?",
        answer:
          "Every donation is written to the blockchain, so it is public and can't be edited after the fact. You can follow your money from your wallet to the milestone it paid for.",
      },
      {
        id: "causes-supported",
        question: "What kinds of causes can I support?",
        answer:
          "Healthcare, education, disaster relief, community development, climate and small business funding, with a focus on African communities.",
      },
      {
        id: "different",
        question: "How is Refreeg different from other platforms?",
        answer:
          "Funds sit in escrow and are released on milestones with proof, every transaction is publicly verifiable, and every campaign is identity-verified before it goes live.",
      },
    ],
  },
  {
    id: "donations",
    name: "Donations",
    items: [
      {
        id: "milestone-releases",
        question: "How do milestone releases work?",
        answer:
          "Funds are held in escrow and released only when a milestone is met, with photo proof or receipts. You get an update each time.",
      },
      {
        id: "payment-methods",
        question: "Can I pay with card or bank transfer?",
        answer:
          "Yes. You can give with a card, a bank transfer or a crypto wallet. Whichever you choose, the donation is recorded on-chain.",
      },
      {
        id: "receipts",
        question: "Will I get a receipt?",
        answer:
          "Yes. Every donation produces a receipt in your name that links to the on-chain record, so you can verify it any time.",
      },
    ],
  },
  {
    id: "campaigns",
    name: "Campaigns",
    items: [
      {
        id: "start-a-cause",
        question: "How do I start a cause?",
        answer:
          "Sign up, verify your identity, then create your campaign with a story, a goal and milestones. We review it before it goes live.",
      },
      {
        id: "fees",
        question: "What fees does Refreeg charge?",
        answer:
          "Our fee policy lists every fee up front, with no hidden charges. See the fee policy page for the current breakdown.",
      },
      {
        id: "payout-speed",
        question: "How fast do funds reach my cause?",
        answer:
          "Donations settle on-chain in seconds. Payouts to your cause are released as each milestone is approved.",
      },
    ],
  },
];
