"use client";

import { useState, useEffect } from "react";
import {
  getApiCampaignReports,
  updateReportStatus,
  takedownApiCampaign,
} from "@/actions/api-campaign-report-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  BadgeInfo,
  CheckCircle,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

export default function AdminApiReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await getApiCampaignReports();
      setReports(data || []);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to load reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await updateReportStatus(id, newStatus);
      toast({
        title: "Success",
        description: `Report status updated to ${newStatus}`,
      });
      fetchReports();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleTakedown = async (campaignId: string) => {
    try {
      await takedownApiCampaign(campaignId);
      toast({
        title: "Campaign Taken Down",
        description: "Campaign cancelled successfully and reports resolved.",
      });
      fetchReports();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to takedown campaign",
        variant: "destructive",
      });
    }
  };

  const filteredReports = reports.filter(
    (report) =>
      report.api_campaigns?.title
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      report.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.message?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            API Campaign Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and manage community reports on API-created campaigns.
          </p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            className="pl-8 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredReports.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 border-dashed">
          <ShieldAlert className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-xl font-semibold text-slate-700">
            No reports found
          </h3>
          <p className="text-slate-500 max-w-sm mt-2">
            There are currently no campaign reports matching your search
            criteria.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredReports.map((report) => (
            <Card
              key={report.id}
              className={`overflow-hidden transition-all border-l-4 ${report.status === "pending" ? "border-l-amber-500" : report.status === "investigating" ? "border-l-blue-500" : "border-l-emerald-500"}`}
            >
              <CardHeader className="bg-slate-50/50 pb-4">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <BadgeInfo className="h-4 w-4 text-slate-500" />
                      <CardTitle className="text-base font-semibold text-slate-800">
                        {report.api_campaigns?.title || "Unknown Campaign"}
                      </CardTitle>
                    </div>
                    <CardDescription className="flex items-center gap-1.5 text-xs">
                      <span>
                        Campaign ID:{" "}
                        <span className="font-mono text-slate-600">
                          {report.api_campaign_id}
                        </span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />{" "}
                        {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium shadow-sm ${
                        report.status === "pending"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : report.status === "investigating"
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {report.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 grid sm:grid-cols-[1fr_200px] gap-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Report Reason
                    </h4>
                    <p className="text-sm font-medium text-slate-800">
                      {report.reason}
                    </p>
                  </div>
                  {report.message && (
                    <div className="bg-slate-50 p-3 rounded-md border border-slate-100">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Additional Details
                      </h4>
                      <p className="text-sm text-slate-700 italic">
                        "{report.message}"
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 justify-start sm:border-l sm:pl-4 border-slate-100">
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1 sm:hidden">
                    Actions
                  </h4>
                  {report.status === "pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={() =>
                        handleUpdateStatus(report.id, "investigating")
                      }
                    >
                      <Search className="h-4 w-4 mr-2" /> Mark Investigating
                    </Button>
                  )}
                  {report.status !== "resolved" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                      onClick={() => handleUpdateStatus(report.id, "resolved")}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" /> Mark Resolved
                    </Button>
                  )}
                  {report.status !== "resolved" && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full justify-start mt-auto"
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Takedown Campaign
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="text-red-600 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" /> Confirm
                            Takedown
                          </DialogTitle>
                          <DialogDescription>
                            Are you sure you want to takedown the campaign "
                            {report.api_campaigns?.title}"? This will cancel the
                            campaign and notify the developer. This action
                            cannot be easily undone.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline">Cancel</Button>
                          <Button
                            variant="destructive"
                            onClick={() =>
                              handleTakedown(report.api_campaign_id)
                            }
                          >
                            Yes, Takedown Campaign
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
