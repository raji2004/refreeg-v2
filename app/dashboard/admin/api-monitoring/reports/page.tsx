import { format } from "date-fns";
import {
  listCampaignReports,
  takeDownApiCampaign,
} from "@/actions/api-monitoring-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ApiMonitoringReportsPage() {
  const reports = await listCampaignReports();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign reports</CardTitle>
        <CardDescription>
          Flagged API campaigns awaiting investigation and enforcement.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Developer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reported</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No campaign reports found.
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {report.campaignTitle}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {report.reportMessage}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">
                      {report.reportReason.replaceAll("_", " ")}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{report.developerName}</span>
                        <span className="text-xs text-muted-foreground">
                          {report.developerEmail}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant={
                            report.reportStatus === "pending"
                              ? "destructive"
                              : "outline"
                          }
                        >
                          {report.reportStatus}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Campaign: {report.campaignStatus}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(report.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      {report.reportStatus === "pending" &&
                      report.campaignStatus !== "cancelled" ? (
                        <form action={takeDownApiCampaign}>
                          <input
                            type="hidden"
                            name="campaignId"
                            value={report.campaignId}
                          />
                          <input
                            type="hidden"
                            name="reportId"
                            value={report.id}
                          />
                          <input
                            type="hidden"
                            name="notes"
                            value={`Taken down after report: ${report.reportReason}`}
                          />
                          <Button type="submit" size="sm" variant="destructive">
                            Take down
                          </Button>
                        </form>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No action needed
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
