import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// The default radio border is white in this theme, so it needs an explicit one.
const radioClass = "h-5 w-5 border-2 border-ink data-[state=checked]:bg-ink";

export function SendTimingField({
  sendLater,
  sendAt,
  error,
  onModeChange,
  onTimeChange,
}: {
  sendLater: boolean;
  sendAt: string;
  error?: string;
  onModeChange: (sendLater: boolean) => void;
  onTimeChange: (sendAt: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Send</Label>
      <RadioGroup
        value={sendLater ? "later" : "now"}
        onValueChange={(value) => onModeChange(value === "later")}
        className="flex flex-wrap items-center gap-4"
      >
        <label className="flex items-center gap-2 text-sm text-ink">
          <RadioGroupItem value="now" aria-label="Now" className={radioClass} />{" "}
          Now
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <RadioGroupItem
            value="later"
            aria-label="Schedule"
            className={radioClass}
          />{" "}
          Schedule
        </label>
        {sendLater && (
          <Input
            type="datetime-local"
            aria-label="Send at"
            className="w-auto"
            value={sendAt}
            onChange={(event) => onTimeChange(event.target.value)}
          />
        )}
      </RadioGroup>
      <FieldError message={error} />
    </div>
  );
}
