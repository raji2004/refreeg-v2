import {
  Activity,
  ArrowRight,
  BarChart3,
  CircleDollarSign,
  Clock,
  Flag,
  Heart,
  Home,
  List,
  Megaphone,
  ReceiptText,
  Server,
  Settings,
  SlidersHorizontal,
  Target,
  Trophy,
  Users,
  Wallet,
  Contact,
} from "lucide-react";

export const navigation = [
  {
    label: "",
    items: [
      {
        label: "Overview",
        icon: Home,
      },
    ],
  },
  {
    label: "Insights",
    items: [
      {
        label: "Analytics",
        icon: BarChart3,
      },
      {
        label: "Campaign analytics",
        icon: Activity,
      },
      { label: "Community", icon: Megaphone },
      {
        label: "Success metrics",
        icon: Target,
      },
    ],
  },
  {
    label: "Review",
    items: [
      {
        label: "Campaigns",
        icon: Heart,
        count: 14,
      },
      {
        label: "KYC",
        icon: Contact,
        count: 9,
      },
      {
        label: "Receipts",
        icon: ReceiptText,
        count: 23,
      },
      {
        label: "Petitions & bounties",
        icon: Trophy,
        count: 6,
      },
      {
        label: "Reports",
        icon: Flag,
        count: 11,
      },
    ],
  },
  {
    label: "Money",
    items: [
      {
        label: "Fund releases",
        icon: ArrowRight,
        count: 7,
      },
      {
        label: "Withdrawals",
        icon: Wallet,
        count: 3,
      },
      { label: "Transactions", icon: List },
      {
        label: "EIZA coins",
        icon: CircleDollarSign,
        count: 18,
      },
    ],
  },
  {
    label: "People & growth",
    items: [
      { label: "Users & orgs", icon: Users },
      { label: "Ads", icon: Contact, count: 2 },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "Rules engine",
        icon: SlidersHorizontal,
        count: 3,
      },
      {
        label: "System health",
        icon: Server,
      },
      {
        label: "Roles & settings",
        icon: Settings,
      },
      { label: "Audit log", icon: Clock },
    ],
  },
];
