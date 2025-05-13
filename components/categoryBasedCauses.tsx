// components/CategoryCausesSection.tsx
"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { DonateButton } from "@/components/donate-button";
import { Cause } from "@/types/cause-types";
import { getCategoryById } from "@/lib/categories";
import { Button } from "@/components/ui/button";

interface Props {
  title: string;
  causes: Cause[];
}

export default function CategoryCausesSection({ title, causes }: Props) {
  if (causes.length === 0) return null;
  const categoryInfo = getCategoryById(causes[0]?.category);

  return (
    <section className="mt-12 border-b-2 pb-8">
      <h2 className="text-2xl font-bold mb-4 flex items-center">
        {categoryInfo?.icon}
        {categoryInfo?.name || title} Related Causes
      </h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {causes.slice(0, 3).map((cause) => (
          <Link key={cause.id} href={`/causes/${cause.id}`} className="group">
            <Card className="overflow-hidden flex flex-col h-full hover:shadow-lg transition cursor-pointer">
              <div className="aspect-video w-full overflow-hidden">
                <img src={cause.image || "/placeholder.svg"} alt={cause.title} className="w-full h-full object-cover" />
              </div>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-full overflow-hidden border bg-gray-100 shrink-0">
                    <img
                      src={cause.profiles?.profile_photo || "/default-avatar.png"}
                      alt={cause.profiles?.full_name || "User"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardTitle className="text-base font-medium">
                    {cause.title}
                    <div className="text-sm font-normal">
                      {((cause.raised / cause.goal) * 100).toFixed(1)}% funded
                    </div>
                  </CardTitle>
                </div>
                <CardDescription>
                  {cause.description.split(" ").length > 25
                    ? (
                        <>
                          {cause.description.split(" ").slice(0, 25).join(" ")}...
                          <span className="text-blue-600 group-hover:underline">see more</span>
                        </>
                      )
                    : cause.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-2">
                  <Badge className="text-xs border border-[#525252] bg-white px-2 py-1 rounded-full text-gray-500">
                    {categoryInfo?.icon}
                    {categoryInfo?.name || title}
                  </Badge>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">₦{cause.raised.toLocaleString()}</span>
                    <span className="text-muted-foreground">of ₦{cause.goal.toLocaleString()}</span>
                  </div>
                  <Progress value={(cause.raised / cause.goal) * 100} className="h-2 bg-muted rounded-full border border-[#525252]" />
                </div>
              </CardContent>
              <CardFooter>
                <div className="w-full">
                  <DonateButton />
                </div>
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>
      <div className="mt-4 flex justify-center">
        <Link href={`/categories/${causes[0].category}`}>
            <Button variant="outline" className="text-sm font-medium">
            View More {categoryInfo?.name || title} Causes
            </Button>
        </Link>
      </div>
    </section>
  );
}
