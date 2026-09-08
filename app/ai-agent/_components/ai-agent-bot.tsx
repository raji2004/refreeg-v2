"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LifeBuoy,
  MessageSquareText,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SupportTopic = {
  id: string;
  question: string;
  answer: string;
  href?: string;
  hrefLabel?: string;
  icon: ReactNode;
  keywords: string[];
};

type LauncherConfig = {
  eyebrow: string;
  title: string;
  nudgeTitle: string;
  nudgeBody: string;
  primaryHref: string;
  primaryLabel: string;
};

type SupportShortcut = {
  id: string;
  label: string;
  href: string;
};

const supportTopics: SupportTopic[] = [
  {
    id: "create-campaign",
    question: "How do I create a campaign?",
    answer:
      "Sign in, complete your profile, then open the cause creation flow and fill in your title, story, goal amount, category, and cover image. Your submission goes through review before it becomes publicly visible.",
    href: "/dashboard/causes/create",
    hrefLabel: "Start a cause",
    icon: <Sparkles className="h-4 w-4" />,
    keywords: ["campaign", "cause", "create", "launch", "start", "fundraiser"],
  },
  {
    id: "kyc-required",
    question: "Do I need KYC before launching?",
    answer:
      "Yes. RefreeG gates cause and petition creation behind approved KYC and a complete profile. That keeps fundraising safer for donors and reduces fraud on the platform.",
    href: "/dashboard/settings/kyc",
    hrefLabel: "Open KYC settings",
    icon: <ShieldCheck className="h-4 w-4" />,
    keywords: ["kyc", "verification", "verify", "identity", "approved"],
  },
  {
    id: "donation-methods",
    question: "How do donations work on RefreeG?",
    answer:
      "Users can donate to active causes using supported payment rails such as local payments and selected crypto options. Each contribution is attached to a cause so donors can see where support is going.",
    href: "/causes",
    hrefLabel: "Explore causes",
    icon: <Wallet className="h-4 w-4" />,
    keywords: ["donate", "donation", "pay", "payment", "crypto", "naira"],
  },
  {
    id: "cause-legit",
    question: "How do I know a cause is legitimate?",
    answer:
      "Causes are reviewed by the moderation team, and approved causes can surface trust indicators such as verification status. RefreeG also uses transparent transaction tracking to strengthen accountability.",
    href: "/#faq",
    hrefLabel: "Read more FAQs",
    icon: <CheckCircle2 className="h-4 w-4" />,
    keywords: ["verified", "legit", "safe", "scam", "fraud", "trust"],
  },
  {
    id: "support-contact",
    question: "What if I still need help?",
    answer:
      "Start with the answers in this assistant. If your issue is account-specific or looks like a bug, contact the team through the support channel so they can inspect your case directly.",
    href: "/faq",
    hrefLabel: "Open help page",
    icon: <LifeBuoy className="h-4 w-4" />,
    keywords: ["support", "help", "contact", "bug", "issue", "admin"],
  },
];

const hiddenPrefixes = [
  "/auth/signin",
  "/auth/signup",
  "/onboarding",
  "/docs/api",
];

const supportShortcuts: SupportShortcut[] = [
  {
    id: "crowdfund",
    label: "Crowdfund with us 💙",
    href: "/causes",
  },
  {
    id: "rewards",
    label: "Earn EIZA rewards",
    href: "/ai-agent",
  },
  {
    id: "launch",
    label: "Help me launch my cause",
    href: "/dashboard/causes/create",
  },
];

const getLauncherConfig = (pathname: string): LauncherConfig => {
  if (pathname.startsWith("/dashboard/causes/create")) {
    return {
      eyebrow: "Launch Support",
      title: "Need help launching?",
      nudgeTitle: "Need help launching?",
      nudgeBody: "Ask about KYC, setup, or campaign requirements.",
      primaryHref: "/dashboard/causes/create",
      primaryLabel: "Launch flow",
    };
  }

  if (pathname.startsWith("/dashboard")) {
    return {
      eyebrow: "Dashboard Help",
      title: "Need help here?",
      nudgeTitle: "Need help in your dashboard?",
      nudgeBody: "Ask about KYC, campaigns, or common setup issues.",
      primaryHref: "/dashboard",
      primaryLabel: "Open dashboard",
    };
  }

  return {
    eyebrow: "Support",
    title: "Need help?",
    nudgeTitle: "Need help?",
    nudgeBody: "Ask about campaigns, KYC, or donations.",
    primaryHref: "/dashboard/causes/create",
    primaryLabel: "Launch flow",
  };
};

export default function AIAgentBot() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const [hasNudged, setHasNudged] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  const hideBot = hiddenPrefixes.some((prefix) => pathname.startsWith(prefix));
  const animateOnHome = pathname === "/";
  const isCauseDetailPage =
    pathname.startsWith("/causes/") && !pathname.includes("/donate");
  const launcherConfig = useMemo(() => getLauncherConfig(pathname), [pathname]);

  useEffect(() => {
    setIsOpen(false);
    setShowNudge(false);
    setHasNudged(false);
    setSearch("");
    setSelectedId(null);
  }, [pathname]);

  useEffect(() => {
    if (hideBot || isOpen || hasNudged) return;

    const timeout = window.setTimeout(() => {
      setShowNudge(true);
      setHasNudged(true);
    }, 30000);

    return () => window.clearTimeout(timeout);
  }, [hasNudged, hideBot, isOpen]);

  useEffect(() => {
    if (!showNudge) return;

    const timeout = window.setTimeout(() => {
      setShowNudge(false);
    }, 7000);

    return () => window.clearTimeout(timeout);
  }, [showNudge]);

  const filteredTopics = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    if (!query) {
      return supportTopics;
    }

    return supportTopics.filter((topic) => {
      const haystack = [
        topic.question,
        topic.answer,
        topic.hrefLabel,
        ...topic.keywords,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [deferredSearch]);

  const selectedTopic = selectedId
    ? filteredTopics.find((topic) => topic.id === selectedId) ?? null
    : null;

  useEffect(() => {
    if (selectedId && !filteredTopics.some((topic) => topic.id === selectedId)) {
      setSelectedId(null);
    }
  }, [filteredTopics, selectedId]);

  const trackEvent = (event: string, detail?: Record<string, string>) => {
    if (typeof window === "undefined") return;

    window.dispatchEvent(
      new CustomEvent("refreeg-support-bot", {
        detail: { event, pathname, ...detail },
      }),
    );

    if (process.env.NODE_ENV === "development") {
      console.debug("[support-bot]", event, { pathname, ...detail });
    }
  };

  if (hideBot) return null;

  return (
    <div
      data-support-bot
      className={cn(
        "pointer-events-none fixed right-3 z-[120] flex max-w-[calc(100vw-1rem)] flex-col items-end sm:bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:right-6 sm:max-w-[calc(100vw-1.5rem)]",
        isCauseDetailPage
          ? "bottom-[calc(env(safe-area-inset-bottom)+4.75rem)]"
          : "bottom-[calc(env(safe-area-inset-bottom)+0.75rem)]",
      )}
    >
      {showNudge && !isOpen ? (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setShowNudge(false);
            trackEvent("nudge_open");
          }}
          className="pointer-events-auto mb-3 max-w-[14rem] rounded-2xl border border-blue-200 bg-white px-3 py-2 text-left shadow-[0_16px_32px_-28px_rgba(37,99,235,0.45)] transition hover:-translate-y-0.5"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
              <MessageSquareText className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-slate-900">
                {launcherConfig.nudgeTitle}
              </p>
              <p className="mt-1 text-[11px] leading-4 text-slate-600">
                {launcherConfig.nudgeBody}
              </p>
            </div>
          </div>
        </button>
      ) : null}

      {isOpen ? (
        <section className="pointer-events-auto w-[calc(100vw-1rem)] max-w-[21rem] overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_28px_90px_-42px_rgba(15,23,42,0.35)] ring-1 ring-slate-950/5 animate-[botSheetIn_220ms_ease-out] sm:w-[22rem] sm:max-w-none">
          <div className="border-b border-slate-200 bg-white px-4 py-3.5 text-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
                  <span
                    className={cn(
                      "flex h-full w-full items-center justify-center rounded-2xl transition-transform duration-300",
                      animateOnHome && isOpen && "home-bot-float",
                    )}
                  >
                    <Bot className="h-4.5 w-4.5" />
                  </span>
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {launcherConfig.eyebrow}
                  </p>
                  <h2 className="mt-0.5 text-base font-semibold leading-tight">
                    Ask a question
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close support bot"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex h-[min(31rem,62vh)] flex-col sm:h-[min(35rem,72vh)]">
            <div className="border-b border-slate-200 px-3.5 py-3">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    trackEvent("search_change", { query: event.target.value });
                  }}
                  placeholder="Search FAQs: KYC, campaign, donations..."
                  className="w-full bg-transparent text-[13px] text-slate-900 outline-none placeholder:text-slate-400"
                />
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3.5">
              {!selectedTopic ? (
                <div className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-2.5">
                  <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Popular topics
                  </p>
                  <div className="space-y-2 animate-[botFadeIn_180ms_ease-out]">
                    {filteredTopics.length > 0 ? (
                      filteredTopics.map((topic) => {
                        const isActive = topic.id === selectedId;

                        return (
                          <button
                            key={topic.id}
                            type="button"
                            onClick={() => {
                              setSelectedId(topic.id);
                              trackEvent("topic_open", { topic: topic.id });
                            }}
                            className={cn(
                              "w-full rounded-2xl border px-3 py-3 text-left transition",
                              isActive
                                ? "border-blue-200 bg-white text-slate-950 shadow-sm"
                                : "border-transparent bg-white/70 text-slate-700 hover:border-slate-200 hover:bg-white",
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={cn(
                                  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                                  isActive
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-100 text-slate-500",
                                )}
                              >
                                {topic.icon}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-[13px] font-semibold leading-5 text-balance">
                                    {topic.question}
                                  </p>
                                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-600">
                        <p>No FAQ matched that search.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {["KYC", "create campaign", "donations"].map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => {
                                setSearch(suggestion);
                                trackEvent("search_suggestion", { query: suggestion });
                              }}
                              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                            >
                              Try {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {!selectedTopic ? (
                <div className="mt-3 rounded-[20px] border border-blue-100 bg-blue-50/70 p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                    Quick actions
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {supportShortcuts.map((shortcut) => (
                      <Link
                        key={shortcut.id}
                        href={shortcut.href}
                        onClick={() =>
                          trackEvent("shortcut_click", {
                            shortcut: shortcut.id,
                            href: shortcut.href,
                          })
                        }
                        className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                      >
                        {shortcut.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {selectedTopic ? (
                <div className="mt-3 rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.45)] animate-[botFadeUp_180ms_ease-out]">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                        <Bot className="h-3.5 w-3.5" />
                      </span>
                      Recommended answer
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(null);
                        trackEvent("topic_back");
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 transition hover:text-blue-700"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Back
                    </button>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold leading-7 text-slate-950">
                    {selectedTopic.question}
                  </h3>
                  <p className="mt-3 text-[14px] leading-7 text-slate-600">
                    {selectedTopic.answer}
                  </p>

                  {selectedTopic.href && selectedTopic.hrefLabel ? (
                    <Link
                      href={selectedTopic.href}
                      onClick={() =>
                        trackEvent("primary_cta", { href: selectedTopic.href || "" })
                      }
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-600 px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-blue-700"
                    >
                      {selectedTopic.hrefLabel}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : null}
                </div>
              ) : null}

              {!selectedTopic ? (
                <div className="mt-3 rounded-[20px] border border-blue-100 bg-blue-50/70 p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                    Good first questions
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {supportTopics.slice(0, 4).map((topic) => (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => {
                          setSearch("");
                          setSelectedId(topic.id);
                          trackEvent("quick_topic", { topic: topic.id });
                        }}
                        className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-[12px] text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                      >
                        {topic.question}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-3 rounded-[20px] border border-slate-200 bg-slate-50 px-3.5 py-3.5">
                <p className="text-[13px] font-semibold text-slate-900">
                  Still blocked?
                </p>
                <p className="mt-1 text-[12px] leading-5 text-slate-600">
                  Use the next best action for this page.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={launcherConfig.primaryHref}
                    onClick={() =>
                      trackEvent("footer_primary", {
                        href: launcherConfig.primaryHref,
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-blue-700"
                  >
                    {launcherConfig.primaryLabel}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/faq"
                    onClick={() => trackEvent("footer_help_center", { href: "/faq" })}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[12px] font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                  >
                    Help center
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {!isOpen ? (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setShowNudge(false);
            trackEvent("launcher_open");
          }}
          aria-label="Open support bot"
          className="pointer-events-auto group relative flex items-center justify-center gap-2 text-left text-slate-900 transition duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 sm:rounded-full sm:border sm:border-white/90 sm:bg-white sm:px-2.5 sm:py-2 sm:shadow-[0_18px_40px_-24px_rgba(15,23,42,0.55)] sm:ring-1 sm:ring-slate-950/8"
        >
          <span
            className={cn(
              "relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/90 bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.55)] ring-1 ring-slate-950/8 transition-transform duration-300 group-hover:scale-[1.03] [transform:translateZ(0)] sm:h-[52px] sm:w-[52px]",
              animateOnHome && isOpen && "home-bot-float",
            )}
          >
            <span className="absolute inset-0 rounded-full animate-[botPulse_3.4s_ease-in-out_infinite] border border-white/30" />
            <Bot className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.4} />
          </span>

          <span className="hidden pr-0.5 sm:block">
            <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-blue-700 ring-1 ring-blue-100">
              Support
            </span>
            <span className="mt-1 hidden text-sm font-semibold leading-5 text-slate-950 sm:block">
              {launcherConfig.title}
            </span>
          </span>
        </button>
      ) : null}
      <style jsx>{`
        @keyframes botPulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.65;
          }
          50% {
            transform: scale(1.08);
            opacity: 1;
          }
        }

        .home-bot-float {
          animation: botPulse 3.4s ease-in-out infinite,
            botFloat 4.8s ease-in-out infinite;
        }

        @keyframes botSheetIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes botFadeUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes botFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes botFloat {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          25% {
            transform: translate3d(-1px, -4px, 0);
          }
          50% {
            transform: translate3d(2px, -7px, 0);
          }
          75% {
            transform: translate3d(-1px, -3px, 0);
          }
        }
      `}</style>
    </div>
  );
}
