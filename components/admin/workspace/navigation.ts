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
      },
      {
        label: "KYC",
        icon: Contact,
      },
      {
        label: "Receipts",
        icon: ReceiptText,
      },
      {
        label: "Petitions & bounties",
        icon: Trophy,
      },
      {
        label: "Reports",
        icon: Flag,
      },
    ],
  },
  {
    label: "Money",
    items: [
      {
        label: "Fund releases",
        icon: ArrowRight,
      },
      {
        label: "Withdrawals",
        icon: Wallet,
      },
      { label: "Transactions", icon: List },
      {
        label: "EIZA coins",
        icon: CircleDollarSign,
      },
    ],
  },
  {
    label: "People & growth",
    items: [
      { label: "Users & orgs", icon: Users },
      { label: "Ads", icon: Contact },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "Rules engine",
        icon: SlidersHorizontal,
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
