import ComingSoonPage from "../ComingSoonPage";

const pageConfig: Record<string, any> = {
  businesses: {
    emoji: "🌍",
    pageTitle: "RefreeG for Businesses",
    pageDescription:
      "Launch business campaigns, support community-driven causes, and connect with customers who care about impact.",
    titleColor: "text-green-600",
  },
  "disaster-relief": {
    emoji: "🌪️",
    pageTitle: "RefreeG for Disaster Relief",
    pageDescription:
      "Rally urgent support for communities hit by disasters and get aid to those who need it; quickly and securely.",
    titleColor: "text-amber-700",
  },
  creators: {
    emoji: "🎨",
    pageTitle: "RefreeG for Creators",
    pageDescription:
      "Turn your influence into impact. Get your unique tag, share your story, and receive donations directly from your fans in fiat or crypto.",
    titleColor: "text-blue-600",
  },
  healthcare: {
    emoji: "🏥",
    pageTitle: "RefreeG for Healthcare",
    pageDescription:
      "Give hope a platform. Raise funds for medical bills, healthcare projects, or critical treatments with transparency and community support.",
    titleColor: "text-red-600",
  },
};

interface PageProps {
  params: {
    slug?: string[];
  };
}

export default function DynamicComingSoon({ params }: PageProps) {
  const slug = params.slug?.[0] || "default";

  const config = pageConfig[slug] || {
    emoji: "🚀",
    pageTitle: "This Feature",
    pageDescription: "We're working hard to bring you something amazing.",
    titleColor: "text-gray-700",
  };

  return <ComingSoonPage {...config} />;
}

export async function generateStaticParams() {
  return Object.keys(pageConfig).map((slug) => ({
    slug: [slug],
  }));
}
