"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateAlertPrefs } from "@/actions/saved-actions";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPrefs?: {
    closing_3d: boolean;
    reached_80pct: boolean;
    delivered: boolean;
    weekly_digest: boolean;
  };
}

export function AlertsModal({ open, onOpenChange, initialPrefs }: Props) {
  const [prefs, setPrefs] = useState(
    initialPrefs || {
      closing_3d: true,
      reached_80pct: true,
      delivered: false,
      weekly_digest: false,
    },
  );

  const handleSave = async () => {
    try {
      await updateAlertPrefs(prefs);
      toast({ title: "Alert preferences saved" });
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Failed to save preferences", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-fraunces text-2xl">
            Tell me when it matters
          </DialogTitle>
          <p className="text-sm text-ink/60 mt-1">
            Alerts on your saved list only. Nothing here is marketing.
          </p>
        </DialogHeader>

        <div className="space-y-6 my-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Closing in 3 days</Label>
              <p className="text-xs text-ink/60">One email, per campaign</p>
            </div>
            <Switch
              checked={prefs.closing_3d}
              onCheckedChange={(v) =>
                setPrefs((p) => ({ ...p, closing_3d: v }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Reached 80%</Label>
              <p className="text-xs text-ink/60">
                The point a pledge would be charged
              </p>
            </div>
            <Switch
              checked={prefs.reached_80pct}
              onCheckedChange={(v) =>
                setPrefs((p) => ({ ...p, reached_80pct: v }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">
                Delivered its work
              </Label>
              <p className="text-xs text-ink/60">Even if you never gave</p>
            </div>
            <Switch
              checked={prefs.delivered}
              onCheckedChange={(v) => setPrefs((p) => ({ ...p, delivered: v }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">
                Weekly digest instead
              </Label>
              <p className="text-xs text-ink/60">
                Sunday evening, everything at once
              </p>
            </div>
            <Switch
              checked={prefs.weekly_digest}
              onCheckedChange={(v) =>
                setPrefs((p) => ({ ...p, weekly_digest: v }))
              }
            />
          </div>
        </div>

        <Button
          onClick={handleSave}
          className="w-full h-11 rounded-xl bg-ink text-white hover:bg-ink/90"
        >
          Save alerts
        </Button>
      </DialogContent>
    </Dialog>
  );
}
