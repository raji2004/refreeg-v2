"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "react-qr-code";
import { AnimatePresence, motion } from "framer-motion";
import { Copy } from "lucide-react";

import {
  sectionVariant,
  stagger,
  fadeUp,
  hoverSoft,
  mobileHover,
  floating,
  lineGrow,
} from "./animations";

import { useAuth } from "@/hooks/use-auth";
import { getReferralDashboardData } from "@/actions/referral-actions";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

type StepProps = {
  src: string;
  alt: string;
  text: string;
  mobile?: boolean;
};

type ReferralRow = {
  id: string;
  referrer_id?: string | null;
  referee_id?: string | null;
  registered: boolean | null;
  referee_email: string | null;
  created_at: string | null;
  reward?: string | null;
  profiles?: {
    first_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
};

type DebugInfo = {
  userId?: string;
  userEmail?: string | null;
  rowCount: number;
};

/* -------------------------------------------------------------------------- */
/*                              Reusable Components                           */
/* -------------------------------------------------------------------------- */

const Step: React.FC<StepProps> = ({ src, alt, text, mobile = false }) => (
  <motion.div
    variants={fadeUp}
    className="flex flex-col items-center"
    initial="rest"
    whileHover="hover"
    animate="rest"
  >
    <motion.div variants={mobile ? mobileHover : hoverSoft}>
      <Image src={src} width={70} height={70} alt={alt} />
    </motion.div>
    <p className="mt-3 w-48 text-center text-sm text-gray-700">{text}</p>
    {mobile && <div className="mt-6 h-16 w-1 bg-blue-600" />}
  </motion.div>
);

const CopyToast: React.FC<{ visible: boolean }> = ({ visible }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="fixed bottom-7 left-1/2 z-[50] -translate-x-1/2 rounded-full bg-black px-4 py-2 text-sm text-white shadow-lg"
      >
        Copied!
      </motion.div>
    )}
  </AnimatePresence>
);

/* -------------------------------------------------------------------------- */
/*                               Referral Page                                */
/* -------------------------------------------------------------------------- */

export default function ReferralPage() {
  const { user } = useAuth();

  const [referralLink, setReferralLink] = useState("");
  const [copied, setCopied] = useState(false);

  const [points, setPoints] = useState(0);
  const [invites, setInvites] = useState(0);
  const [signUps, setSignUps] = useState(0);
  const [tier, setTier] = useState("Tier 1");

  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isQREnlarged, setIsQREnlarged] = useState(false);

  const [debug, setDebug] = useState<DebugInfo>({ rowCount: 0 });

  /* ------------------------------------------------------------------------ */
  /*                             Load All Referral Data                       */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await getReferralDashboardData();

        if (!data) {
          setLoading(false);
          return;
        }

        const baseUrl =
          typeof window !== "undefined" ? window.location.origin : "";
        const resolvedReferralLink = data.referralLink.startsWith("http")
          ? data.referralLink
          : `${baseUrl}${data.referralLink}`;

        setReferralLink(resolvedReferralLink);
        setReferrals(data.referrals as ReferralRow[]);
        setInvites(data.invites);
        setSignUps(data.signUps);
        setPoints(data.points);
        setTier(data.tier);
        setDebug({
          userId: user.id,
          userEmail: user.email,
          rowCount: data.referrals.length,
        });
      } catch (err) {
        console.error("Unexpected error loading referrals:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  /* ------------------------------------------------------------------------ */
  /*                               Event Handlers                             */
  /* ------------------------------------------------------------------------ */

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleInviteFriends = () => {
    if (!referralLink) return;
    setShareOpen(true);
  };

  /* ------------------------------------------------------------------------ */
  /*                                   Render                                 */
  /* ------------------------------------------------------------------------ */

  return (
    <main className="w-full overflow-x-hidden bg-[#F7F8FC] pb-28">
      {/* HERO */}
      <motion.section
        className="mx-auto max-w-6xl px-5 pt-16 text-center"
        variants={sectionVariant}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
      >
        <motion.div
          variants={fadeUp}
          className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-1.5 shadow-sm"
        >
          <motion.div {...floating}>
            <Image
              src="/images/referrals/Users.png"
              width={20}
              height={20}
              alt="users"
            />
          </motion.div>
          <span>Share your link for rewards</span>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="mt-6 text-3xl font-bold md:text-4xl"
        >
          RefreeG’s Referral Program
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mx-auto mt-3 max-w-xl text-sm text-gray-600 md:text-base"
        >
          At RefreeG, we believe in the power of community-driven change. Invite
          people you trust, support meaningful campaigns, and grow your impact
          together.
        </motion.p>

        <motion.button
          variants={fadeUp}
          className="mt-6 rounded-md bg-[#0B3B8A] px-6 py-2 text-white shadow transition hover:bg-[#0D46A5] active:scale-95 active:bg-[#0A336D]"
        >
          View All Rewards
        </motion.button>
      </motion.section>

      {/* HOW IT WORKS */}
      <motion.section
        className="mx-auto mt-14 max-w-6xl px-5"
        variants={sectionVariant}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
      >
        <motion.div
          variants={fadeUp}
          className="rounded-2xl bg-white p-8 shadow md:p-10"
        >
          <h2 className="mb-10 text-[26px] md:text-[32px] font-bold text-center w-full">
            How it works
          </h2>

          {/* Desktop timeline */}
          <div className="hidden items-start justify-between md:flex">
            <Step
              src="/images/referrals/message-notification.png"
              alt="Share"
              text="Share your referral link with friends and others"
            />

            <motion.div
              className="mt-10 flex w-[18%] items-center justify-center"
              variants={fadeUp}
            >
              <motion.div
                className="h-1 w-full max-w-[180px] origin-left rounded-full bg-blue-600"
                variants={lineGrow}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
              />
            </motion.div>

            <Step
              src="/images/referrals/faceless-man.png"
              alt="Register"
              text="Your family and friends register on RefreeG using your referral code"
            />

            <motion.div
              className="mt-10 flex w-[18%] items-center justify-center"
              variants={fadeUp}
            >
              <motion.div
                className="h-1 w-full max-w-[180px] origin-left rounded-full bg-blue-600"
                variants={lineGrow}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
              />
            </motion.div>

            <Step
              src="/images/referrals/yellow-trophy.png"
              alt="Rewards"
              text="They get bonus + status, you earn credit and unlock VIP perks"
            />
          </div>

          {/* Mobile stacked steps */}
          <motion.div
            className="mt-10 flex flex-col items-center gap-14 md:hidden"
            variants={stagger}
          >
            <Step
              mobile
              src="/images/referrals/message-notification.png"
              alt="Share"
              text="Share your referral link with friends and others"
            />
            <Step
              mobile
              src="/images/referrals/faceless-man.png"
              alt="Register"
              text="Your family and friends register on RefreeG using your referral code"
            />
            <Step
              mobile
              src="/images/referrals/yellow-trophy.png"
              alt="Rewards"
              text="They get bonus + status, you earn credit and unlock VIP perks"
            />
          </motion.div>

          {/* Referral Link + QR */}
          <motion.div className="mt-12" variants={stagger}>
            <p className="mb-2 text-sm font-semibold text-gray-700">
              Referral Link
            </p>

            <div className="flex flex-col items-center gap-3 md:flex-row">
              {/* Link box */}
              <motion.div
                variants={fadeUp}
                className="flex w-full items-center justify-between rounded-lg border bg-white px-4 py-2 shadow-sm"
              >
                <span className="truncate text-sm font-medium text-gray-600">
                  {referralLink || "Loading your referral link..."}
                </span>

                <button
                  onClick={handleCopy}
                  disabled={!referralLink}
                  className="active:scale-95 disabled:opacity-60"
                >
                  <Copy className="h-6 w-6 text-gray-600" />
                </button>
              </motion.div>

              {/* Invite CTA */}
              <motion.button
                variants={fadeUp}
                onClick={handleInviteFriends}
                disabled={!referralLink}
                className="w-full whitespace-nowrap rounded-md bg-[#0B3B8A] px-6 py-2 text-white shadow transition hover:bg-[#0D46A5] active:scale-95 active:bg-[#0A336D] disabled:opacity-60 md:w-auto"
              >
                Invite Friends
              </motion.button>

              {/* QR code */}
              <motion.div
                variants={fadeUp}
                animate={{
                  scale: [1, 1.05, 1],
                  transition: { duration: 2.8, repeat: Infinity },
                }}
                className="flex items-center justify-center rounded-xl bg-white p-3 shadow"
              >
                {referralLink && <QRCode value={referralLink} size={75} />}
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* STATS */}
      <motion.section
        className="mx-auto mt-14 max-w-6xl px-5"
        variants={sectionVariant}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
      >
        <motion.div
          variants={stagger}
          className="grid grid-cols-2 gap-4 md:grid-cols-4"
        >
          {[
            { img: "gaming-prize.png", label: "Your Tier", value: tier },
            {
              img: "arrows-in-cardinal.png",
              label: "Ref Points",
              value: points,
            },
            { img: "cloud-network.png", label: "Invites Sent", value: invites },
            { img: "share-network.png", label: "Sign Ups", value: signUps },
          ].map((item) => (
            <motion.div
              key={item.label}
              variants={fadeUp}
              whileHover={{
                y: -4,
                boxShadow: "0 16px 30px rgba(0,0,0,0.06)",
              }}
              className="flex flex-col items-center rounded-2xl bg-white p-5 shadow"
            >
              <motion.div {...floating}>
                <Image
                  src={`/images/referrals/${item.img}`}
                  width={50}
                  height={50}
                  alt={item.label}
                />
              </motion.div>
              <p className="mt-1 text-sm text-gray-600">{item.label}</p>
              <p className="text-xl font-bold">{item.value}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* TABLE */}
      <motion.section
        className="mx-auto mt-14 max-w-6xl px-5"
        variants={sectionVariant}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
      >
        <motion.div
          className="overflow-hidden rounded-2xl bg-white shadow"
          variants={fadeUp}
        >
          {/* Header */}
          <div className="grid grid-cols-4 bg-[#0065FF] px-3 py-2 text-[11px] font-medium text-white md:px-4 md:py-3 md:text-sm">
            <span>Friends Account</span>
            <span>Registered</span>
            <span>Reg Date</span>
            <span>Rewards</span>
          </div>

          {/* Divider */}
          <div className="h-[2px] w-full bg-black/40" />

          {/* Body */}
          {loading ? (
            <div className="py-10 text-center text-sm text-gray-500">
              Loading data...
            </div>
          ) : referrals.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">
              No referrals yet
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {referrals.map((ref) => {
                const profile = ref.profiles;
                const name =
                  profile?.first_name ||
                  ref.referee_email?.split("@")[0] ||
                  "Pending User";
                const email = ref.referee_email || "Unknown";
                const registered = !!ref.registered;
                const date = ref.created_at
                  ? new Date(ref.created_at).toLocaleDateString()
                  : "—";
                const reward = registered ? "+5 pts" : "Pending";

                return (
                  <div
                    key={ref.id}
                    className="grid grid-cols-4 items-center gap-2 px-3 py-2 text-[11px] text-gray-700 md:px-4 md:py-3 md:text-sm"
                  >
                    <div className="flex flex-col">
                      <span className="truncate font-medium text-xs md:text-sm">
                        {name}
                      </span>
                      <span className="truncate text-[10px] text-gray-500 md:text-xs">
                        {email}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-semibold md:text-sm ${
                        registered
                          ? "text-green-700 [text-shadow:0_0_14px_rgba(34,197,94,0.7)]"
                          : "text-gray-600 [text-shadow:0_0_14px_rgba(107,114,128,0.5)]"
                      }`}
                    >
                      {registered ? "Yes" : "No"}
                    </span>
                    <span className="text-xs md:text-sm">{date}</span>
                    <span
                      className={`text-xs font-semibold md:text-sm ${
                        registered
                          ? "text-green-700 [text-shadow:0_0_14px_rgba(34,197,94,0.7)]"
                          : "text-gray-600 [text-shadow:0_0_14px_rgba(107,114,128,0.5)]"
                      }`}
                    >
                      {reward}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </motion.section>

      {/* COPY TOAST */}
      <CopyToast visible={copied} />

      {/* SHARE MODAL */}
      <AnimatePresence>
        {shareOpen && referralLink && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setShareOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-[90%] max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            >
              <h2 className="mb-1 text-center text-lg font-semibold">
                Share Your Link
              </h2>
              <p className="mb-4 text-center text-xs text-gray-500">
                Invite friends to join RefreeG with your personal link.
              </p>

              <div className="mb-4 flex items-center gap-2 rounded-full border bg-gray-50 px-3 py-1.5 text-[11px] text-gray-500">
                <span className="truncate">{referralLink}</span>
              </div>

              {/* QR Code in Modal */}
              <div className="mb-6 flex flex-col items-center justify-center">
                <p className="mb-2 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                  Your QR Code
                </p>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsQREnlarged(true)}
                  className="cursor-pointer rounded-2xl bg-white p-4 shadow-md border border-gray-100"
                >
                  <QRCode value={referralLink} size={120} />
                  <p className="mt-2 text-center text-[10px] text-blue-600 font-medium">
                    Click to enlarge
                  </p>
                </motion.div>
              </div>

              <div className="space-y-3">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Join me on RefreeG! ${referralLink}`,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2 text-sm font-medium text-white transition hover:bg-[#1EB257]"
                >
                  <span>Share on WhatsApp</span>
                </a>

                <a
                  href={`mailto:?subject=${encodeURIComponent(
                    "Join me on RefreeG",
                  )}&body=${encodeURIComponent(referralLink)}`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] py-2 text-sm font-medium text-white transition hover:bg-[#1D4ED8]"
                >
                  <span>Share via Email</span>
                </a>

                <button
                  onClick={handleCopy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
                >
                  <span>Copy Link</span>
                </button>
              </div>

              <button
                onClick={() => setShareOpen(false)}
                className="mt-4 w-full text-center text-xs text-gray-500 hover:underline"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ENLARGED QR OVERLAY */}
      <AnimatePresence>
        {isQREnlarged && referralLink && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-md"
            onClick={() => setIsQREnlarged(false)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative flex flex-col items-center rounded-3xl bg-white p-8 shadow-2xl"
            >
              <button
                onClick={() => setIsQREnlarged(false)}
                className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-500 shadow-lg hover:text-black"
              >
                ✕
              </button>
              <QRCode value={referralLink} size={280} />
              <p className="mt-6 text-center text-sm font-semibold text-gray-800">
                Scan to join RefreeG
              </p>
              <p className="mt-1 text-center text-xs text-gray-500">
                Share this QR code with your friends
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
