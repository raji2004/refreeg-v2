import { useState } from "react";
import { motion } from "framer-motion";
import { MessagesSquare, ChevronDown } from "lucide-react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { CauseDetail, TabKey } from "../types/types";
import { TABS, DEFAULT_FAQS, fadeUp } from "../types/types";
import type { Comment } from "@/types/common-types";

const CommentsSection = dynamic(
  () =>
    import("@/components/comments/comment-section").then(
      (mod) => mod.CommentsSection,
    ),
  { loading: () => <Skeleton className="h-40 w-full rounded-xl" /> },
);

export function TabsCard({
  cause,
  formattedDate,
  comments,
  currentUserId,
  activeTab,
  setActiveTab,
}: {
  cause: CauseDetail;
  formattedDate: string;
  comments: Comment[];
  currentUserId?: string;
  activeTab: TabKey;
  setActiveTab: (value: TabKey) => void;
}) {
  const commentCount = comments.length;

  return (
    <motion.div
      className="overflow-hidden rounded-2xl border border-[#DDE3EA] bg-white sm:rounded-[20px]"
      variants={fadeUp}
    >
      <div className="border-b border-[#E8EDF2] px-4 py-4 sm:hidden">
        <select
          className="w-full rounded-xl border border-[#DDE3EA] bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#10233F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#235DA7]"
          value={activeTab}
          onChange={(event) => setActiveTab(event.target.value as TabKey)}
        >
          {TABS.map((tab) => (
            <option key={tab} value={tab}>
              {tab}
            </option>
          ))}
        </select>
      </div>

      <div className="hidden items-center gap-1 overflow-x-auto border-b border-[#E8EDF2] px-6 py-4 sm:flex">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 whitespace-nowrap rounded-[10px] px-4 py-2.5 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#235DA7] ${
              activeTab === tab
                ? "bg-[#ECF5FF] text-[#235DA7]"
                : "text-[#53647A] hover:bg-[#F8FAFC] hover:text-[#10233F]"
            }`}
            aria-pressed={activeTab === tab}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-5 sm:p-7">
        {activeTab === "Comments" && (
          <div className="rounded-2xl bg-[#F8FAFC] p-4 sm:p-5">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MessagesSquare className="h-4 w-4 text-emerald-500" />
              {commentCount} comments
            </div>
            <div className="mt-4">
              <CommentsSection
                comments={comments}
                causeId={cause.id}
                currentUserId={currentUserId}
                entityType="cause"
              />
            </div>
          </div>
        )}

        {activeTab === "FAQ" && (
          <motion.div
            key="faq"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold text-[#0F172A]">
              Frequently Asked Questions
            </h3>
            <div className="space-y-3">
              {(cause.faqs && cause.faqs.length > 0
                ? cause.faqs
                : DEFAULT_FAQS
              ).map((faq, idx) => (
                <details
                  key={idx}
                  className="rounded-[14px] border border-[#E5E7EB] bg-white p-4 shadow-sm"
                >
                  <summary className="flex cursor-pointer items-center justify-between font-medium text-[#0F172A]">
                    {faq.question}
                    <ChevronDown className="h-5 w-5 text-[#64748B]" />
                  </summary>
                  <p className="mt-2 text-sm text-[#64748B]">{faq.answer}</p>
                </details>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
