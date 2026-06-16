"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Icons } from "@/components/icons";
import { useAuth } from "@/hooks/use-auth";
import { useAdmin } from "@/hooks/use-admin";
import { getCause, updateCauseTrustMetrics } from "@/actions/cause-actions";
import type { Cause, CauseStatus, CauseWithUser } from "@/types";
import Image from "next/image";
import { useQueryState } from "nuqs";
import { format } from "date-fns";
import { categories } from "@/lib/categories";
import { useNotifications } from "@/hooks/use-notification";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import NavigationLoader from "../NavigationLoader";
const MultimediaCarousel = dynamic(() => import("../MultimediaCarousel"), {
  loading: () => <Skeleton className="h-64 w-full" />,
});
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";

export default function ManageCauses() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useQueryState("tab", {
    defaultValue: "pending",
    parse: (value) => value,
    serialize: (value) => value,
  });
  const {
    isAdminOrManager,
    isLoading: adminLoading,
    approveCause,
    rejectCause,
    causes,
    causeEdits,
  } = useAdmin(user?.id, activeTab as CauseStatus);

  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    causeId: string;
    title: string;
    reason: string;
  }>({
    open: false,
    causeId: "",
    title: "",
    reason: "",
  });

  const [detailDialog, setDetailDialog] = useState<{
    open: boolean;
    cause: CauseWithUser | null;
    isLoading: boolean;
  }>({ open: false, cause: null, isLoading: false });

  const [trustMetricsDialog, setTrustMetricsDialog] = useState<{
    open: boolean;
    causeId: string;
    metrics: {
      impact: string;
      readability: string;
      transparency: string;
      status: string;
    };
  }>({
    open: false,
    causeId: "",
    metrics: {
      impact: "B+",
      readability: "A",
      transparency: "High",
      status: "pending",
    },
  });

  const { showNotification } = useNotifications();

  const handleApprove = async (causeId: string) => {
    try {
      await approveCause(causeId);
      showNotification("Cause Approved", {
        body: "A new cause has been approved and is now live!",
        icon: "/icons/icon-192x192.png",
      });
    } catch (error) {
      console.error("Error approving cause:", error);
    }
  };

  const openRejectDialog = (causeId: string, title: string) => {
    setRejectDialog({
      open: true,
      causeId,
      title,
      reason: "",
    });
  };

  const handleReject = async () => {
    await rejectCause(rejectDialog.causeId, rejectDialog.reason);
    setRejectDialog((prev) => ({ ...prev, open: false }));
  };

  const openTrustMetricsDialog = (cause: any) => {
    setTrustMetricsDialog({
      open: true,
      causeId: cause.id,
      metrics: {
        impact: cause.trust_score?.impact || "B+",
        readability: cause.trust_score?.readability || "A",
        transparency: cause.trust_score?.transparency || "High",
        status: cause.verified_status || "pending",
      },
    });
  };

  const handleUpdateTrustMetrics = async () => {
    try {
      await updateCauseTrustMetrics(trustMetricsDialog.causeId, {
        trust_score: {
          impact: trustMetricsDialog.metrics.impact,
          readability: trustMetricsDialog.metrics.readability,
          transparency: trustMetricsDialog.metrics.transparency,
        },
        verified_status: trustMetricsDialog.metrics.status,
      });
      setTrustMetricsDialog((prev) => ({ ...prev, open: false }));
      showNotification("Metrics Updated", {
        body: "Cause trust metrics have been updated.",
      });
      router.refresh();
    } catch (error) {
      console.error("Error updating trust metrics:", error);
    }
  };

  const openDetailDialog = async (item: any) => {
    setDetailDialog((prev) => ({ ...prev, open: true, isLoading: true }));
    try {
      if (item.type === "edit") {
        const detailed: any = {
          id: item.original_cause_id,
          title: item.title,
          category: item.category,
          goal: item.goal,
          image: item.image,
          days_active: item.days_active,
          status: item.status || "pending",
          created_at: item.created_at,
          updated_at: item.updated_at,
          raised: item.raised || 0,
          user: {
            name: item.profiles?.full_name || "Anonymous",
            email: item.profiles?.email || "",
            sub_account_code: item.profiles?.sub_account_code || "",
            profile_photo: item.profiles?.profile_photo || null,
          },
          sections: (item.cause_edit_sections || []).map((s: any) => ({
            id: s.id,
            heading: s.heading,
            description: s.description,
          })),
          multimedia: item.multimedia || [],
          video_links: item.video_links || [],
        };
        setDetailDialog({ open: true, isLoading: false, cause: detailed });
      } else {
        const detailed = await getCause(item.id);
        setDetailDialog({ open: true, isLoading: false, cause: detailed });
      }
    } catch (e) {
      setDetailDialog({ open: true, isLoading: false, cause: null });
    }
  };

  const closeDetailDialog = () =>
    setDetailDialog({ open: false, cause: null, isLoading: false });

  if (adminLoading) {
    return <NavigationLoader />;
  }

  if (!isAdminOrManager) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You do not have permission to access this page.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Causes</h1>
        <p className="text-muted-foreground">
          Review and approve causes submitted by users.
        </p>
      </div>

      <Tabs
        defaultValue={activeTab}
        className="space-y-4"
        onValueChange={setActiveTab}
      >
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="space-y-4">
          {causes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No {activeTab} causes to display.
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Goal</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {causes.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.title}
                        {item.type === "edit" && (
                          <Badge variant="outline" className="ml-2">
                            Edit Request
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>₦{item.goal.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {(item as any).profiles?.profile_photo ? (
                            <Image
                              src={getMediaUrl(
                                (item as any).profiles.profile_photo,
                              )}
                              alt={(item as any).profiles?.full_name || "User"}
                              width={32}
                              height={32}
                              className="rounded-full object-cover"
                              unoptimized={isProxyMediaUrl(
                                getMediaUrl(
                                  (item as any).profiles.profile_photo,
                                ),
                              )}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-600">
                                {((item as any).profiles?.full_name || "A")
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span className="font-medium">
                            {(item as any).profiles?.full_name || "Anonymous"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === "approved"
                              ? "default"
                              : item.status === "pending"
                                ? "secondary"
                                : item.status === "pending edit"
                                  ? "outline"
                                  : "destructive"
                          }
                        >
                          {(item.status ?? "").charAt(0).toUpperCase() +
                            (item.status ?? "").slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openDetailDialog(item)}
                            >
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openTrustMetricsDialog(item)}
                            >
                              Trust Metrics
                            </DropdownMenuItem>
                            {activeTab === "pending" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    openRejectDialog(
                                      item.type === "edit"
                                        ? (item as any).original_cause_id
                                        : item.id,
                                      item.title,
                                    )
                                  }
                                >
                                  Reject
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleApprove(
                                      item.type === "edit"
                                        ? (item as any).original_cause_id
                                        : item.id,
                                    )
                                  }
                                >
                                  Approve
                                </DropdownMenuItem>
                              </>
                            )}
                            {activeTab === "rejected" && (
                              <DropdownMenuItem
                                onClick={() => handleApprove(item.id)}
                              >
                                Approve
                              </DropdownMenuItem>
                            )}
                            {activeTab === "approved" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  openRejectDialog(item.id, item.title)
                                }
                              >
                                Take Down
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => setRejectDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Cause</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting "{rejectDialog.title}". This
              will be shown to the user.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Rejection reason..."
            value={rejectDialog.reason}
            onChange={(e) =>
              setRejectDialog((prev) => ({ ...prev, reason: e.target.value }))
            }
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setRejectDialog((prev) => ({ ...prev, open: false }))
              }
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectDialog.reason.trim()}
            >
              Reject Cause
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={trustMetricsDialog.open}
        onOpenChange={(open) =>
          setTrustMetricsDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Trust Metrics</DialogTitle>
            <DialogDescription>
              Adjust the quality scores and verification status for this cause.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="impact" className="text-right">
                Impact Score
              </Label>
              <Select
                value={trustMetricsDialog.metrics.impact}
                onValueChange={(val) =>
                  setTrustMetricsDialog((prev) => ({
                    ...prev,
                    metrics: { ...prev.metrics, impact: val },
                  }))
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select score" />
                </SelectTrigger>
                <SelectContent>
                  {["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-"].map(
                    (s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="readability" className="text-right">
                Readability
              </Label>
              <Select
                value={trustMetricsDialog.metrics.readability}
                onValueChange={(val) =>
                  setTrustMetricsDialog((prev) => ({
                    ...prev,
                    metrics: { ...prev.metrics, readability: val },
                  }))
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select score" />
                </SelectTrigger>
                <SelectContent>
                  {["High", "Medium", "Low"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="transparency" className="text-right">
                Transparency
              </Label>
              <Select
                value={trustMetricsDialog.metrics.transparency}
                onValueChange={(val) =>
                  setTrustMetricsDialog((prev) => ({
                    ...prev,
                    metrics: { ...prev.metrics, transparency: val },
                  }))
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select score" />
                </SelectTrigger>
                <SelectContent>
                  {["High", "Medium", "Low"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select
                value={trustMetricsDialog.metrics.status}
                onValueChange={(val) =>
                  setTrustMetricsDialog((prev) => ({
                    ...prev,
                    metrics: { ...prev.metrics, status: val },
                  }))
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setTrustMetricsDialog((prev) => ({ ...prev, open: false }))
              }
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateTrustMetrics}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailDialog.open} onOpenChange={closeDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cause Details</DialogTitle>
            <DialogDescription>
              Full details of the cause for review
            </DialogDescription>
          </DialogHeader>

          {detailDialog.isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Icons.spinner className="h-8 w-8 animate-spin" />
            </div>
          ) : detailDialog.cause ? (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {detailDialog.cause.title}
                    </h2>
                    <p className="text-muted-foreground">
                      {
                        categories.find(
                          (c) => c.id === detailDialog.cause?.category,
                        )?.name
                      }
                    </p>
                  </div>
                  <Badge
                    variant={
                      detailDialog.cause.status === "approved"
                        ? "default"
                        : detailDialog.cause.status === "pending"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {detailDialog.cause.status.charAt(0).toUpperCase() +
                      detailDialog.cause.status.slice(1)}
                  </Badge>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-medium mb-2">Creator Information</h3>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="font-medium">Name:</span>{" "}
                      {detailDialog.cause.user.name}
                    </p>
                    <p>
                      <span className="font-medium">Email:</span>{" "}
                      {detailDialog.cause.user.email}
                    </p>
                    <p>
                      <span className="font-medium">Created:</span>{" "}
                      {detailDialog.cause.created_at
                        ? format(new Date(detailDialog.cause.created_at), "PPP")
                        : "N/A"}
                    </p>
                    {detailDialog.cause.status === "approved" && (
                      <p>
                        <span className="font-medium">Approved:</span>{" "}
                        {detailDialog.cause.updated_at
                          ? format(
                              new Date(detailDialog.cause.updated_at),
                              "PPP",
                            )
                          : "N/A"}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {detailDialog.cause.image && (
                <div className="space-y-2">
                  <h3 className="font-medium">Cover Image</h3>
                  <div className="relative w-full h-64 rounded-lg overflow-hidden">
                    <Image
                      src={getMediaUrl(detailDialog.cause.image)}
                      alt={detailDialog.cause.title}
                      className="object-cover w-full h-full"
                      width={800}
                      height={400}
                      unoptimized={isProxyMediaUrl(
                        getMediaUrl(detailDialog.cause.image),
                      )}
                    />
                  </div>
                </div>
              )}

              {detailDialog.cause.sections &&
                detailDialog.cause.sections.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-medium">Additional Sections</h3>
                    {detailDialog.cause.sections.map((section, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">{section.heading}</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                          {section.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

              {/* Sections (handle sections on both main cause and edit rows) */}
              {Array.isArray((detailDialog.cause as any).cause_edit_sections) &&
              (detailDialog.cause as any).cause_edit_sections.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-medium">Sections</h3>
                  {(detailDialog.cause as any).cause_edit_sections.map(
                    (section: any, index: number) => (
                      <div
                        key={section.id ?? index}
                        className="p-4 border rounded-lg"
                      >
                        <h4 className="font-medium mb-2">{section.heading}</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                          {section.description}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              ) : null}

              {/* Multimedia Preview */}
              {(((detailDialog.cause as any).multimedia &&
                (detailDialog.cause as any).multimedia.length > 0) ||
                ((detailDialog.cause as any).video_links &&
                  (detailDialog.cause as any).video_links.length > 0)) && (
                <div className="space-y-4">
                  <h3 className="font-medium">Media</h3>
                  <MultimediaCarousel
                    media={[
                      ...((detailDialog.cause as any).multimedia || []),
                      ...((detailDialog.cause as any).video_links || []),
                    ]}
                    coverImage={detailDialog.cause.image || undefined}
                    title={detailDialog.cause.title}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <h3 className="font-medium mb-2">Goal</h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="font-medium">Target:</span> ₦
                      {detailDialog.cause.goal.toLocaleString()}
                    </p>
                    <p>
                      <span className="font-medium">Raised:</span> ₦
                      {(detailDialog.cause.raised || 0).toLocaleString()}
                    </p>
                    <div className="pt-2">
                      <Progress
                        value={Math.min(
                          Math.round(
                            ((detailDialog.cause.raised || 0) /
                              detailDialog.cause.goal) *
                              100,
                          ),
                          100,
                        )}
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.min(
                          Math.round(
                            ((detailDialog.cause.raised || 0) /
                              detailDialog.cause.goal) *
                              100,
                          ),
                          100,
                        )}
                        % raised
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Duration</h3>
                  <div className="space-y-1 text-sm">
                    {detailDialog.cause.days_active !== null &&
                    detailDialog.cause.days_active !== undefined ? (
                      <p>
                        <span className="font-medium">Days left:</span>{" "}
                        {detailDialog.cause.days_active} days
                      </p>
                    ) : (
                      <p className="text-muted-foreground">Duration not set</p>
                    )}
                  </div>
                </div>
              </div>

              {detailDialog.cause.status === "rejected" &&
                detailDialog.cause.rejection_reason && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <h3 className="font-medium text-destructive mb-2">
                      Rejection Reason
                    </h3>
                    <p className="text-sm text-destructive">
                      {detailDialog.cause.rejection_reason}
                    </p>
                  </div>
                )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Failed to load cause details
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeDetailDialog}>
              Close
            </Button>
            {detailDialog.cause && (
              <div className="flex gap-2">
                {detailDialog.cause.status === "pending" && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        closeDetailDialog();
                        openRejectDialog(
                          detailDialog.cause!.id,
                          detailDialog.cause!.title,
                        );
                      }}
                    >
                      Reject
                    </Button>
                    <Button
                      onClick={() => {
                        closeDetailDialog();
                        handleApprove(detailDialog.cause!.id);
                      }}
                    >
                      Approve
                    </Button>
                  </>
                )}
                {detailDialog.cause.status === "rejected" && (
                  <Button
                    onClick={() => {
                      closeDetailDialog();
                      handleApprove(detailDialog.cause!.id);
                    }}
                  >
                    Approve
                  </Button>
                )}
                {detailDialog.cause.status === "approved" && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      closeDetailDialog();
                      openRejectDialog(
                        detailDialog.cause!.id,
                        detailDialog.cause!.title,
                      );
                    }}
                  >
                    Take Down
                  </Button>
                )}
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
