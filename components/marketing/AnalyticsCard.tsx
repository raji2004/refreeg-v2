import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
}

export function AnalyticsCard({
  title,
  value,
  description,
  icon: Icon,
}: AnalyticsCardProps) {
  return (
    <Card className="overflow-hidden rounded-[22px] border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.10),transparent_32%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_18px_45px_-32px_rgba(15,23,42,0.45)] sm:rounded-[26px]">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 px-4 pb-3 pt-4 sm:px-6 sm:pt-6">
        <div>
          <CardTitle className="text-sm font-medium text-slate-500">
            {title}
          </CardTitle>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 sm:h-11 sm:w-11">
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
        <div className="break-words text-[1.75rem] font-semibold tracking-tight text-slate-950 sm:text-3xl">
          {value}
        </div>
        {description && (
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
