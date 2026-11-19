import type { UseCase } from "@/types/crowdfund-types";

export const crowdfundUseCases: UseCase[] = [
  {
    id: "healthcare",
    categoryId: "health",
    label: "Healthcare",
    heading: "Medical bills, treatment and",
    emphasis: "care.",
    summary:
      "Give hope a platform. Raise for a loved one's treatment or a community health project, with every release backed by proof.",
    cta: "Start a healthcare cause",
    example: {
      title: "Kidney transplant for Amaka",
      location: "Lagos",
      goal: 6_500_000,
      raised: 4_200_000,
      milestones: [
        {
          label: "Pre-surgery tests, paid to LUTH",
          amount: 900_000,
          released: true,
        },
        {
          label: "Transplant surgery deposit",
          amount: 3_000_000,
          released: true,
        },
        { label: "Post-op medication", amount: 2_600_000, released: false },
      ],
    },
    ideas: [
      {
        title: "Urgent treatment",
        description:
          "Surgeries, transplants and critical care when time matters most.",
      },
      {
        title: "Clinics and equipment",
        description:
          "Medical equipment, facilities and staff training for local clinics.",
      },
      {
        title: "Community health drives",
        description:
          "Vaccination drives, maternal care and rural healthcare outreach.",
      },
      {
        title: "Ongoing care",
        description:
          "Long-term therapy and medication, funded in milestones donors can follow.",
      },
    ],
  },
  {
    id: "disaster-relief",
    categoryId: "disaster",
    label: "Disaster relief",
    heading: "Fast, accountable",
    emphasis: "relief.",
    summary:
      "Rally urgent support for communities hit by floods, fires and conflict, and show donors exactly where the aid went.",
    cta: "Start a relief cause",
    image: {
      src: "/routed-funds.jpg",
      alt: "Volunteers serving food to families at an outdoor relief station",
    },
    example: {
      title: "Flood relief for Maiduguri families",
      location: "Borno",
      goal: 12_000_000,
      raised: 9_800_000,
      milestones: [
        {
          label: "Food and water for 400 families",
          amount: 4_000_000,
          released: true,
        },
        { label: "Temporary shelter kits", amount: 5_000_000, released: true },
        { label: "School repairs", amount: 3_000_000, released: false },
      ],
    },
    ideas: [
      {
        title: "Rapid response",
        description:
          "Share what happened and what is needed, and start receiving support in minutes.",
      },
      {
        title: "Shelter and supplies",
        description:
          "Food, water, medicine and temporary shelter for displaced families.",
      },
      {
        title: "Proof on the ground",
        description:
          "Photos, videos and field reports that show aid reaching survivors.",
      },
      {
        title: "Rebuilding",
        description:
          "Homes, schools and livelihoods after the emergency has passed.",
      },
    ],
  },
  {
    id: "nonprofits",
    categoryId: "community",
    label: "Nonprofits",
    heading: "Raise more,",
    emphasis: "reach more.",
    summary:
      "Build trust with transparent fundraising tools that help nonprofits grow their donor communities.",
    cta: "Start a nonprofit cause",
    image: {
      src: "/about/hands.jpg",
      alt: "Many hands stacked together against a blue sky",
    },
    example: {
      title: "Girls' coding clubs in 10 schools",
      location: "Abuja",
      goal: 8_000_000,
      raised: 3_100_000,
      milestones: [
        {
          label: "Laptops for the first 3 schools",
          amount: 2_400_000,
          released: true,
        },
        {
          label: "Trainer stipends, term one",
          amount: 1_600_000,
          released: false,
        },
        {
          label: "Expansion to 7 more schools",
          amount: 4_000_000,
          released: false,
        },
      ],
    },
    ideas: [
      {
        title: "Programme funding",
        description:
          "Fund a specific programme so donors know what their money builds.",
      },
      {
        title: "Verified organisation",
        description:
          "KYC and cause verification give donors the confidence to give more.",
      },
      {
        title: "Transparent reporting",
        description:
          "Milestone releases and receipts replace the annual report nobody reads.",
      },
      {
        title: "Returning supporters",
        description:
          "Updates and progress keep donors coming back for the next campaign.",
      },
    ],
  },
  {
    id: "businesses",
    categoryId: "business",
    label: "Businesses",
    heading: "Back an idea, or a",
    emphasis: "community.",
    summary:
      "Launch CSR campaigns, fund a new venture from your network, and connect with customers who care about impact.",
    cta: "Start a business cause",
    image: {
      src: "/images/studygroup.jpg",
      alt: "A smiling group of young professionals",
    },
    example: {
      title: "Solar kiosks for market traders",
      location: "Kano",
      goal: 15_000_000,
      raised: 11_250_000,
      milestones: [
        { label: "Prototype kiosk", amount: 2_500_000, released: true },
        { label: "First 20 kiosks", amount: 7_500_000, released: true },
        { label: "Rollout to 3 markets", amount: 5_000_000, released: false },
      ],
    },
    ideas: [
      {
        title: "Launch funding",
        description:
          "Share your vision, attract early supporters and validate your market.",
      },
      {
        title: "CSR campaigns",
        description:
          "Run community-driven campaigns your customers and staff can join.",
      },
      {
        title: "Progress in public",
        description:
          "Updates and milestones that build trust and bring repeat contributions.",
      },
      {
        title: "Supporters anywhere",
        description:
          "Accept contributions in local currency, dollars or crypto.",
      },
    ],
  },
  {
    id: "creators",
    categoryId: "creative",
    label: "Creators",
    heading: "Get backed by your",
    emphasis: "audience.",
    summary:
      "Fund your next project, tour or release with a page your audience can find, share and trust.",
    cta: "Start a creator cause",
    image: {
      src: "/about/people-behind.jpg",
      alt: "Four friends laughing together against a bright blue background",
    },
    example: {
      title: "Recording my debut EP",
      location: "Port Harcourt",
      goal: 3_000_000,
      raised: 2_700_000,
      milestones: [
        { label: "Studio time, 5 tracks", amount: 1_500_000, released: true },
        { label: "Mixing and mastering", amount: 900_000, released: true },
        { label: "Music video", amount: 600_000, released: false },
      ],
    },
    ideas: [
      {
        title: "Your own page",
        description:
          "A unique tag and URL that make you easy to find and share.",
      },
      {
        title: "Share everywhere",
        description:
          "Post updates and media, and share to every platform in one click.",
      },
      {
        title: "Verified and trusted",
        description:
          "Verification tells supporters your cause is authentic and safe.",
      },
      {
        title: "See what works",
        description: "Built-in analytics show where your support comes from.",
      },
    ],
  },
];
