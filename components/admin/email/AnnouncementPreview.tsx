import { Card, CardContent } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { AnnouncementItem } from "@/types/email-types";
import { P, Span } from "@/components/marketing/Typography";

export function AnnouncementPreview({
  title,
  message,
  recentlySent,
}: {
  title: string;
  message: string;
  recentlySent: AnnouncementItem[];
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-5">
          <Eyebrow>Preview · email</Eyebrow>
          <div className="space-y-1 rounded-lg border border-hairline bg-bone p-4">
            <P className="font-semibold text-ink">
              {title.trim() || "Your title appears here"}
            </P>
            <P className="whitespace-pre-line text-ink/70">
              {message.trim() || "Your message appears here."}
            </P>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 p-5">
          <Eyebrow>Recently sent</Eyebrow>
          {recentlySent.length === 0 ? (
            <P className="text-ink/50">Nothing sent yet.</P>
          ) : (
            <ul className="space-y-2">
              {recentlySent.map((item) => (
                <li
                  key={item.id}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <Span className="truncate text-ink">{item.title}</Span>
                  <Span className="shrink-0 font-medium text-ink/70">
                    {item.sentCount.toLocaleString()} sent
                  </Span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
