import { FieldError } from "@/components/ui/field-error";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  emailAudienceOptions,
  type EmailAudience,
} from "@/lib/options/email-audience.options";
import { peopleLabel } from "@/lib/email/people-label";
import { P } from "@/components/marketing/Typography";

export function AudienceField({
  value,
  reach,
  error,
  onChange,
}: {
  value: EmailAudience;
  reach: number | null;
  error?: string;
  onChange: (audience: EmailAudience) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
      <div className="space-y-1.5">
        <Label htmlFor="announcement-audience">Audience</Label>
        <Select
          value={value}
          onValueChange={(next) => onChange(next as EmailAudience)}
        >
          <SelectTrigger id="announcement-audience">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {emailAudienceOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError message={error} />
      </div>
      <div className="space-y-1.5">
        <Label>Reach</Label>
        <P className="flex h-10 items-center rounded-md bg-bone px-3 text-ink">
          {reach === null ? "…" : peopleLabel(reach)}
        </P>
      </div>
    </div>
  );
}
