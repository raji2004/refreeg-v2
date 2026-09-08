"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ExternalLink,
  FileText,
  Globe2,
  Instagram,
  MapPin,
  Phone,
  Settings,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { FaFacebookF, FaTiktok, FaXTwitter } from "react-icons/fa6";
import { FaWhatsapp } from "react-icons/fa";
import { useQueryState } from "nuqs";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ProfileCards";
import { ExpandableCard } from "@/components/ExpandableCard";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";

type OrganizationPublicProfileProps = {
  organization: {
    name: string;
    slug: string;
    phone: string;
    address: string;
    industry: string;
    logoUrl: string;
    bio: string;
    websiteUrl: string;
    instagramUrl: string;
    twitterUrl: string;
    tiktokUrl: string;
    facebookUrl: string;
    whatsappNumber: string;
    memberCount: number;
    createdAt: string;
  };
  profile: any;
  causes: any[];
  petitions: any[];
  userId: string;
  isOwner: boolean;
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export default function OrganizationPublicProfile({
  organization,
  profile,
  causes,
  petitions,
  userId,
  isOwner,
}: OrganizationPublicProfileProps) {
  const [tab, setTab] = useQueryState("tab", {
    defaultValue: "causes",
    shallow: false,
  });
  const logoUrl = getMediaUrl(organization.logoUrl);
  const totalRaised = causes.reduce(
    (sum, cause) => sum + Number(cause.raised || 0),
    0,
  );
  const totalSignatures = petitions.reduce(
    (sum, petition) =>
      sum + Number(petition.signatures || petition.signature_count || 0),
    0,
  );
  const activeCauses = causes.filter(
    (cause) => !cause.ended && Number(cause.raised || 0) < Number(cause.goal || 1),
  ).length;
  const isVerified = profile.is_verified || false;
  const organizationHandle = organization.slug || "";

  const metrics = [
    {
      label: "Total raised",
      value: formatCurrency(totalRaised),
      icon: TrendingUp,
    },
    {
      label: "Active causes",
      value: activeCauses.toLocaleString(),
      icon: Globe2,
    },
    {
      label: "Petition signatures",
      value: totalSignatures.toLocaleString(),
      icon: FileText,
    },
    {
      label: "Team members",
      value: organization.memberCount.toLocaleString(),
      icon: UsersRound,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto flex h-44 max-w-6xl items-start justify-between px-4 pt-6 sm:px-6 lg:px-8">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="border border-white/15 text-slate-200 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Organisation profile
          </p>
        </div>
      </div>

      <main className="mx-auto -mt-20 max-w-6xl px-4 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-6 px-5 py-6 sm:px-8 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt={`${organization.name} logo`}
                    width={112}
                    height={112}
                    className="h-full w-full object-contain p-1.5"
                    unoptimized={isProxyMediaUrl(logoUrl)}
                    priority
                  />
                ) : (
                  <Building2 className="h-11 w-11 text-slate-400" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                    {organization.name}
                  </h1>
                  {isVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Verified owner
                    </span>
                  )}
                </div>
                {organizationHandle && (
                  <p className="mt-1 text-sm text-slate-500">
                    @{organizationHandle}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                  {organization.industry && (
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      {organization.industry}
                    </span>
                  )}
                  {organization.address && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {organization.address}
                    </span>
                  )}
                  {organization.phone && (
                    <a
                      href={`tel:${organization.phone}`}
                      className="flex items-center gap-1.5 hover:text-blue-700"
                    >
                      <Phone className="h-4 w-4 text-slate-400" />
                      {organization.phone}
                    </a>
                  )}
                </div>

                {organization.bio && (
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
                    {organization.bio}
                  </p>
                )}

                {(organization.websiteUrl ||
                  organization.instagramUrl ||
                  organization.twitterUrl ||
                  organization.tiktokUrl ||
                  organization.facebookUrl ||
                  organization.whatsappNumber) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {organization.websiteUrl && (
                      <a
                        href={organization.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Globe2 className="h-3.5 w-3.5" />
                        Website
                        <ExternalLink className="h-3 w-3 text-slate-400" />
                      </a>
                    )}
                    {organization.instagramUrl && (
                      <a
                        href={organization.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-pink-200 hover:bg-pink-50 hover:text-pink-700"
                      >
                        <Instagram className="h-3.5 w-3.5" />
                        Instagram
                      </a>
                    )}
                    {organization.twitterUrl && (
                      <a
                        href={organization.twitterUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100 hover:text-slate-950"
                      >
                        <FaXTwitter className="h-3.5 w-3.5" />
                        Twitter / X
                      </a>
                    )}
                    {organization.tiktokUrl && (
                      <a
                        href={organization.tiktokUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100 hover:text-slate-950"
                      >
                        <FaTiktok className="h-3.5 w-3.5" />
                        TikTok
                      </a>
                    )}
                    {organization.facebookUrl && (
                      <a
                        href={organization.facebookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <FaFacebookF className="h-3.5 w-3.5" />
                        Facebook
                      </a>
                    )}
                    {organization.whatsappNumber && (
                      <a
                        href={`https://wa.me/${organization.whatsappNumber.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                      >
                        <FaWhatsapp className="h-3.5 w-3.5" />
                        WhatsApp
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
              {isOwner ? (
                <Button asChild className="bg-blue-700 text-white hover:bg-blue-800">
                  <Link href="/dashboard/settings/organization">
                    <Settings className="mr-2 h-4 w-4" />
                    Edit organisation
                  </Link>
                </Button>
              ) : (
                <Button asChild className="bg-blue-700 text-white hover:bg-blue-800">
                  <Link href={`/causes?userId=${userId}&action=donate`}>
                    Support this organisation
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <div className="grid border-t border-slate-200 bg-slate-50/70 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="border-b border-slate-200 p-5 last:border-b-0 sm:border-r lg:border-b-0">
                  <Icon className="h-4 w-4 text-blue-700" />
                  <p className="mt-3 text-2xl font-semibold text-slate-950">{metric.value}</p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.1em] text-slate-500">
                    {metric.label}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Tabs value={tab} onValueChange={setTab}>
            <div className="border-b border-slate-200 px-4 sm:px-6">
              <TabsList className="h-auto gap-6 bg-transparent p-0">
                <TabsTrigger
                  value="causes"
                  className="rounded-none border-b-2 border-transparent px-1 py-4 text-sm font-semibold text-slate-500 data-[state=active]:border-blue-700 data-[state=active]:bg-transparent data-[state=active]:text-blue-700 data-[state=active]:shadow-none"
                >
                  Causes ({causes.length})
                </TabsTrigger>
                <TabsTrigger
                  value="petitions"
                  className="rounded-none border-b-2 border-transparent px-1 py-4 text-sm font-semibold text-slate-500 data-[state=active]:border-blue-700 data-[state=active]:bg-transparent data-[state=active]:text-blue-700 data-[state=active]:shadow-none"
                >
                  Petitions ({petitions.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-4 sm:p-6">
              <TabsContent value="causes">
                {causes.length === 0 ? (
                  <EmptyState
                    title="No public causes yet"
                    description={`${organization.name} has not published a cause yet.`}
                    cta="Explore causes"
                    ctaLink="/causes"
                  />
                ) : (
                  <ExpandableCard
                    items={causes.map((cause) => ({
                      id: cause.id,
                      slug: cause.slug,
                      title: cause.title,
                      description: cause.description,
                      image: cause.image,
                      goal: cause.goal || 0,
                      raised: cause.raised || 0,
                      category: cause.category || "Cause",
                      sections: cause.sections || [],
                    }))}
                    type="cause"
                  />
                )}
              </TabsContent>

              <TabsContent value="petitions">
                {petitions.length === 0 ? (
                  <EmptyState
                    title="No public petitions yet"
                    description={`${organization.name} has not published a petition yet.`}
                    cta="Explore petitions"
                    ctaLink="/petitions"
                  />
                ) : (
                  <ExpandableCard
                    items={petitions.map((petition) => ({
                      id: petition.id,
                      title: petition.title,
                      description: petition.description,
                      image: petition.image,
                      goal: petition.goal || 0,
                      signatures: petition.signatures || 0,
                      category: petition.category || "Petition",
                      sections: petition.sections || [],
                    }))}
                    type="petition"
                  />
                )}
              </TabsContent>
            </div>
          </Tabs>
        </section>
      </main>
    </div>
  );
}
