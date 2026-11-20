import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { emailLinkOptions } from "@/lib/options/email-link.options";

export function LinkField({
  value,
  onChange,
}: {
  value: string;
  onChange: (linkPath: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="announcement-link">Opens</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="announcement-link">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {emailLinkOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
