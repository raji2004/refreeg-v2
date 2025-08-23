"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import type { Cause, CauseStatus, CauseWithUser } from "@/types";
import Image from "next/image";
import { useQueryState } from "nuqs";
import { getCause } from "@/actions/cause-actions";
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
    error?: string;
  }>({
    open: false,
    cause: null,
    isLoading: false,
  });

  const { showNotification } = useNotifications();

  const handleApprove = async (causeId: string) => {
    try {
      await approveCause(causeId);

      // Show notification
      showNotification("Cause Approved", {
        body: "A new cause has been approved and is now live!",
        icon: "/icons/icon-192x192.png",
      });

      // Optional: You could also send this to all subscribed users
      // await sendPushNotificationToAll(causeId)
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

  const openDetailDialog = async (causeId: string) => {
    setDetailDialog((prev) => ({
      ...prev,
      open: true,
      isLoading: true,
      error: undefined,
    }));
    try {
      const detailedCause = await getCause(causeId);
      if (!detailedCause || !detailedCause.id) {
        setDetailDialog((prev) => ({
          ...prev,
          cause: null,
          isLoading: false,
          error: "Cause details not found or incomplete.",
        }));
        return;
      }
      setDetailDialog((prev) => ({
        ...prev,
        cause: detailedCause,
        isLoading: false,
        error: undefined,
      }));
    } catch (error) {
      setDetailDialog((prev) => ({
        ...prev,
        cause: null,
        isLoading: false,
        error: "Failed to load cause details. Please try again.",
      }));
    }
  };

  const closeDetailDialog = () => {
    setDetailDialog((prev) => ({ ...prev, open: false, cause: null }));
  };

  if (adminLoading) {
    return <div className="flex justify-center p-8">Loading...</div>;
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
                  {causes.map((cause) => (
                    <TableRow key={cause.id}>
                      <TableCell
                        className="font-medium cursor-pointer hover:text-primary"
                        onClick={() => openDetailDialog(cause.id)}
                      >
                        {cause.title}
                      </TableCell>
                      <TableCell>{cause.category}</TableCell>
                      <TableCell>₦{cause.goal.toLocaleString()}</TableCell>
                      <TableCell>
                        {cause.profiles?.name || "Anonymous"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            cause.status === "approved"
                              ? "default"
                              : cause.status === "pending"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {cause.status.charAt(0).toUpperCase() +
                            cause.status.slice(1)}
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
                              onClick={() => openDetailDialog(cause.id)}
                            >
                              View
                            </DropdownMenuItem>
                            {activeTab === "pending" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    openRejectDialog(cause.id, cause.title)
                                  }
                                >
                                  Reject
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleApprove(cause.id)}
                                >
                                  Approve
                                </DropdownMenuItem>
                              </>
                            )}
                            {activeTab === "rejected" && (
                              <DropdownMenuItem
                                onClick={() => handleApprove(cause.id)}
                              >
                                Approve
                              </DropdownMenuItem>
                            )}
                            {activeTab === "approved" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  openRejectDialog(cause.id, cause.title)
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

      {/* Detail Dialog */}
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
          ) : detailDialog.error ? (
            <div className="text-center py-8 text-destructive">
              {detailDialog.error}
            </div>
          ) : detailDialog.cause ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {detailDialog.cause.title}
                    </h2>
                    <p className="text-muted-foreground">
                      {categories.find(
                        (c) => c.id === detailDialog.cause?.category
                      )?.name || detailDialog.cause.category}
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

                {/* Creator Info */}
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-medium mb-2">Creator Information</h3>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="font-medium">Name:</span>{" "}
                      {detailDialog.cause.user?.name || "-"}
                    </p>
                    <p>
                      <span className="font-medium">Email:</span>{" "}
                      {detailDialog.cause.user?.email || "-"}
                    </p>
                    <p>
                      <span className="font-medium">Created:</span>{" "}
                      {detailDialog.cause.created_at
                        ? format(new Date(detailDialog.cause.created_at), "PPP")
                        : "-"}
                    </p>
                    {detailDialog.cause.status === "approved" &&
                      detailDialog.cause.updated_at && (
                        <p>
                          <span className="font-medium">Approved:</span>{" "}
                          {format(
                            new Date(detailDialog.cause.updated_at),
                            "PPP"
                          )}
                        </p>
                      )}
                  </div>
                </div>
              </div>

              {/* Cover Image */}
              {detailDialog.cause.image && (
                <div className="space-y-2">
                  <h3 className="font-medium">Cover Image</h3>
                  <div className="relative w-full h-64 rounded-lg overflow-hidden">
                    <Image
                      src={detailDialog.cause.image}
                      alt={detailDialog.cause.title}
                      className="object-cover w-full h-full"
                      width={800}
                      height={400}
                    />
                  </div>
                </div>
              )}

              {/* Multimedia Gallery */}
              {(() => {
                const allMedia = [...(detailDialog.cause.multimedia || [])];

                return allMedia.length > 0 ? (
                  <div className="space-y-2">
                    <h3 className="font-medium">Multimedia Gallery</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {allMedia.map((url: string, index: number) => {
                        const isVideo = url.match(/\.(mp4|mov|webm)$/i);
                        const isYouTube =
                          url.includes("youtube") || url.includes("youtu.be");
                        const isTikTok = url.includes("tiktok");
                        const isDrive = url.includes("drive.google");

                        // Extract YouTube video ID for embed
                        let embedUrl = "";
                        if (isYouTube) {
                          const videoIdMatch = url.match(
                            /(?:youtube\.com.*(?:\?|&)v=|youtu\.be\/)([^&#]+)/
                          );
                          const videoId = videoIdMatch ? videoIdMatch[1] : null;
                          if (videoId) {
                            embedUrl = `https://www.youtube.com/embed/${videoId}`;
                          }
                        }

                        return (
                          <div
                            key={index}
                            className="relative w-full h-48 rounded-lg overflow-hidden"
                          >
                            {isVideo ? (
                              <video
                                controls
                                className="w-full h-full object-cover rounded-lg"
                                src={url}
                              />
                            ) : isYouTube && embedUrl ? (
                              <iframe
                                src={embedUrl}
                                title={`YouTube video ${index + 1}`}
                                className="w-full h-full rounded-lg"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            ) : isTikTok ? (
                              (() => {
                                const tiktokIdMatch = url.match(/video\/(\d+)/);
                                const tiktokId = tiktokIdMatch
                                  ? tiktokIdMatch[1]
                                  : null;
                                return tiktokId ? (
                                  <iframe
                                    src={`https://www.tiktok.com/embed/${tiktokId}`}
                                    title={`TikTok video ${index + 1}`}
                                    className="w-full h-full rounded-lg"
                                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
                                    allowFullScreen
                                  />
                                ) : (
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-sm text-center p-2"
                                  >
                                    Open TikTok Video
                                  </a>
                                );
                              })()
                            ) : isDrive ? (
                              (() => {
                                const fileIdMatch = url.match(/\/d\/([^/]+)/);
                                const fileId = fileIdMatch
                                  ? fileIdMatch[1]
                                  : null;
                                return fileId ? (
                                  <iframe
                                    src={`https://drive.google.com/file/d/${fileId}/preview`}
                                    title={`Google Drive file ${index + 1}`}
                                    className="w-full h-full rounded-lg"
                                    allow="autoplay"
                                    allowFullScreen
                                  />
                                ) : (
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-sm text-center p-2"
                                  >
                                    Open Google Drive File
                                  </a>
                                );
                              })()
                            ) : (
                              <Image
                                src={url}
                                alt={`Multimedia ${index + 1}`}
                                className="object-cover w-full h-full"
                                width={400}
                                height={200}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Additional Sections */}
              {detailDialog.cause.sections &&
                Array.isArray(detailDialog.cause.sections) &&
                detailDialog.cause.sections.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-medium">Additional Sections</h3>
                    {detailDialog.cause.sections.map(
                      (section: any, index: number) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-2">
                            {section.heading}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {section.description}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                )}

              {/* Financial Information */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <h3 className="font-medium mb-2">Financial Details</h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="font-medium">Goal:</span> ₦
                      {detailDialog.cause.goal?.toLocaleString?.() ||
                        detailDialog.cause.goal}
                    </p>
                    <p>
                      <span className="font-medium">Raised:</span> ₦
                      {detailDialog.cause.raised?.toLocaleString?.() ||
                        detailDialog.cause.raised}
                    </p>
                    <p>
                      <span className="font-medium">Progress:</span>{" "}
                      {detailDialog.cause.goal && detailDialog.cause.raised
                        ? (
                            (detailDialog.cause.raised /
                              detailDialog.cause.goal) *
                            100
                          ).toFixed(1)
                        : "-"}
                      %
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Duration</h3>
                  <div className="space-y-1 text-sm">
                    {detailDialog.cause.days_active !== null &&
                    detailDialog.cause.days_active !== undefined ? (
                      <p>
                        <span className="font-medium">Days Active:</span>{" "}
                        {detailDialog.cause.days_active} days
                      </p>
                    ) : (
                      <p className="text-muted-foreground">Duration not set</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Rejection Reason */}
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
                          detailDialog.cause!.title
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
                        detailDialog.cause!.title
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
