import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FeaturedCauses } from "@/components/featured-causes"
import Hero from "@/components/home/hero"
import WhyUseUs from "@/components/home/whyUseUs"
import { H2, P, Ol } from "@/components/typograpy";
import YouTubeEmbed from "@/components/YoutubeEmbed";
import TransparencyEnsurance from "@/components/home/transparencyEnsurance"
import CausesSupported from "@/components/home/causesWeSupport"
import FAQ from "@/components/home/frequentlyAskedQuestions"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen mt-16">
      <Hero />

      <WhyUseUs />

      <section>
        <div className="pt-2 px-10 pb-8 mb-8">
          <H2 className="mt-8 font-semibold text-2xl">How it works</H2>
          <P className="text-xl mb-12">
            How donation on{" "}
            <Link
              href="https://www.refreeg.com"
              className="text-gray-500 text-xl font-semibold underline"
            >
              Refreeg
            </Link>{" "}
            works!
          </P>

          <div className="relative aspect-video w-full max-w-4xl mx-auto">
            <YouTubeEmbed
              videoId="lzAJXX99ew0"
              title="How Refreeg donations work"
              className="my-8"
            />
          </div>
        </div>
      </section>

      {/* Featured Causes */}
      <section className="w-full py-12 md:py-24 lg:py-20 bg-muted">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Featured Causes</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Discover and support these impactful initiatives.
              </p>
            </div>
          </div>
          <FeaturedCauses />
          <div className="flex justify-center mt-8">
            <Link href="/causes">
              <Button variant="outline" size="lg" className="hover:bg-[#0070E0]">
                View All Causes
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <TransparencyEnsurance />

      <CausesSupported />

      <FAQ />
    </div>
  )
}

