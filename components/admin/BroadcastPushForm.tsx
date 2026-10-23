"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Send,
  Smartphone,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
  Radio,
} from "lucide-react";
import { toast } from "sonner";

interface DeviceStats {
  total: number;
  android: number;
  ios: number;
  web: number;
}

export default function BroadcastPushForm() {
  const [stats, setStats] = useState<DeviceStats>({
    total: 0,
    android: 0,
    ios: 0,
    web: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Form fields
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<"all" | "creators" | "donors">(
    "all",
  );
  const [imageUrl, setImageUrl] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    message: string;
    sentCount?: number;
    failureCount?: number;
    skipped?: boolean;
  } | null>(null);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await fetch("/api/admin/notifications/broadcast");
      const json = await res.json();
      if (json.success && json.data?.stats) {
        setStats(json.data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch device stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a notification title");
      return;
    }
    if (!message.trim()) {
      toast.error("Please enter a notification message");
      return;
    }

    try {
      setIsSending(true);
      setLastResult(null);

      const res = await fetch("/api/admin/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          audience,
          imageUrl: imageUrl.trim() || undefined,
          url: targetUrl.trim() || undefined,
        }),
      });

      const json = await res.json();

      if (json.success) {
        toast.success(json.data?.message || "Broadcast sent successfully!");
        setLastResult({
          success: true,
          message: json.data?.message || "Notification sent to devices.",
          sentCount: json.data?.sentCount,
          failureCount: json.data?.failureCount,
          skipped: json.data?.skipped,
        });
        // Clear message body on success
        setMessage("");
        fetchStats();
      } else {
        toast.error(json.error || "Failed to send broadcast");
        setLastResult({
          success: false,
          message: json.error || "Broadcast delivery failed.",
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Network error sending broadcast");
      setLastResult({
        success: false,
        message: err.message || "Network error.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Radio className="w-6 h-6 animate-pulse text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Mobile Push Broadcasts
            </h1>
            <p className="text-sm text-muted-foreground">
              Send marketing announcements, breaking updates, and urgent alerts
              directly to user devices.
            </p>
          </div>
        </div>
      </div>

      {/* Device Audience Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Devices
                </p>
                <h3 className="text-2xl font-bold mt-1 text-foreground">
                  {loadingStats ? "..." : stats.total}
                </h3>
              </div>
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Smartphone className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Active app installations
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Android
                </p>
                <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                  {loadingStats ? "..." : stats.android}
                </h3>
              </div>
              <Badge
                variant="outline"
                className="border-emerald-500/20 text-emerald-600"
              >
                FCM
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Play Store & APK
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  iOS (APNs)
                </p>
                <h3 className="text-2xl font-bold mt-1 text-foreground">
                  {loadingStats ? "..." : stats.ios}
                </h3>
              </div>
              <Badge variant="outline">Apple</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              iOS App Devices
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Audience Reach
                </p>
                <h3 className="text-2xl font-bold mt-1 text-primary">100%</h3>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Real-time FCM delivery
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Broadcast Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Composer */}
        <div className="lg:col-span-7">
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Send className="w-5 h-5 text-primary" />
                Compose Broadcast
              </CardTitle>
              <CardDescription>
                Craft your message carefully. Push notifications appear
                instantly on user lock screens.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSend}>
              <CardContent className="space-y-5">
                {/* Audience Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    Target Audience
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setAudience("all")}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        audience === "all"
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="font-medium text-sm text-foreground">
                        All Users
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Every device
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAudience("creators")}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        audience === "creators"
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="font-medium text-sm text-foreground">
                        Creators
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Campaign owners
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAudience("donors")}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        audience === "donors"
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="font-medium text-sm text-foreground">
                        Donors
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Active supporters
                      </div>
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label
                      htmlFor="broadcast-title"
                      className="text-sm font-semibold"
                    >
                      Notification Title{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {title.length}/60
                    </span>
                  </div>
                  <Input
                    id="broadcast-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value.slice(0, 60))}
                    placeholder="e.g. 🌟 Double Your Impact This Weekend!"
                    className="font-medium"
                    required
                  />
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label
                      htmlFor="broadcast-message"
                      className="text-sm font-semibold"
                    >
                      Notification Body{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {message.length}/200
                    </span>
                  </div>
                  <Textarea
                    id="broadcast-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, 200))}
                    rows={4}
                    placeholder="e.g. Verified healthcare campaigns in Lagos are matching all donations today. Tap to support a community today."
                    required
                  />
                </div>

                {/* Media Image URL (Optional) */}
                <div className="space-y-2">
                  <Label
                    htmlFor="broadcast-image"
                    className="text-sm font-semibold"
                  >
                    Banner Image URL{" "}
                    <span className="text-xs text-muted-foreground font-normal">
                      (Optional)
                    </span>
                  </Label>
                  <Input
                    id="broadcast-image"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>

                {/* Action Link / Route (Optional) */}
                <div className="space-y-2">
                  <Label
                    htmlFor="broadcast-url"
                    className="text-sm font-semibold"
                  >
                    Deep Link Route{" "}
                    <span className="text-xs text-muted-foreground font-normal">
                      (Optional)
                    </span>
                  </Label>
                  <Input
                    id="broadcast-url"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="e.g. /causes or specific cause ID"
                  />
                </div>

                {/* Result Feedback Banner */}
                {lastResult && (
                  <div
                    className={`p-4 rounded-xl border flex items-start gap-3 ${
                      lastResult.success
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                        : "bg-destructive/10 border-destructive/20 text-destructive"
                    }`}
                  >
                    {lastResult.success ? (
                      <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-destructive" />
                    )}
                    <div className="text-sm">
                      <p className="font-semibold">{lastResult.message}</p>
                      {lastResult.skipped && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          Firebase credentials not set in environment yet. Push
                          dispatch was recorded in in-app notification center.
                        </p>
                      )}
                      {lastResult.sentCount !== undefined && (
                        <p className="text-xs opacity-80 mt-1">
                          Delivered: {lastResult.sentCount} device(s) • Failed:{" "}
                          {lastResult.failureCount || 0}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex justify-between border-t pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setTitle("✨ Welcome to RefreeG Crowdfunding");
                    setMessage(
                      "Discover verified grassroots campaigns making real impact across communities.",
                    );
                  }}
                  disabled={isSending}
                >
                  <Sparkles className="w-4 h-4 mr-2 text-primary" />
                  Load Sample
                </Button>

                <Button
                  type="submit"
                  disabled={isSending || !title.trim() || !message.trim()}
                  className="bg-primary text-primary-foreground font-semibold px-6"
                >
                  {isSending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Broadcasting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Push Broadcast
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* Right Form: Live Smartphone Mockup Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Smartphone className="w-4 h-4" />
            Live Mobile Notification Preview
          </div>

          <div className="relative mx-auto w-full max-w-[340px] rounded-[38px] p-3 bg-zinc-900 shadow-2xl ring-1 ring-zinc-800">
            {/* Phone Speaker Notch */}
            <div className="relative mx-auto h-4 w-28 rounded-full bg-zinc-800 mb-2 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-zinc-700 mr-2" />
              <div className="h-1.5 w-10 rounded-full bg-zinc-700" />
            </div>

            {/* Simulated Phone Screen */}
            <div className="rounded-[28px] overflow-hidden bg-gradient-to-b from-zinc-800 via-zinc-900 to-black text-white p-4 min-h-[460px] flex flex-col justify-between">
              {/* Screen Top Status Bar */}
              <div className="flex justify-between items-center text-[11px] text-zinc-400 font-medium px-2 pt-1">
                <span>9:41</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
                  <div className="w-4 h-2 border border-zinc-400 rounded-sm" />
                </div>
              </div>

              {/* Push Notification Card */}
              <div className="my-auto space-y-2">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 shadow-lg text-left transition-all">
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                        R
                      </div>
                      <span className="text-[12px] font-semibold text-zinc-200">
                        RefreeG
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400">now</span>
                  </div>

                  {/* Card Content */}
                  <div className="space-y-1">
                    <div className="text-[13px] font-semibold text-white leading-tight">
                      {title.trim() || "Notification Title"}
                    </div>
                    <div className="text-[12px] text-zinc-300 line-clamp-3 leading-relaxed">
                      {message.trim() ||
                        "Your message preview will appear right here as you type."}
                    </div>
                  </div>

                  {/* Image attachment preview if provided */}
                  {imageUrl && (
                    <div className="mt-2.5 rounded-xl overflow-hidden max-h-32 bg-black/40 border border-white/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt="Push banner preview"
                        className="w-full h-28 object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="text-center text-[11px] text-zinc-500">
                  Tap banner to open RefreeG app
                </div>
              </div>

              {/* Bottom Home Indicator Bar */}
              <div className="w-28 h-1 bg-white/40 rounded-full mx-auto mb-1" />
            </div>
          </div>

          <div className="text-xs text-muted-foreground flex items-center gap-2 bg-muted/40 p-3 rounded-lg">
            <Info className="w-4 h-4 shrink-0 text-primary" />
            Notifications are sent to RefreeG mobile users on Android & iOS via
            Firebase Cloud Messaging.
          </div>
        </div>
      </div>
    </div>
  );
}
