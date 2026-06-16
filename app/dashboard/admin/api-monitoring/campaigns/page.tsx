import { format } from "date-fns";
import { listAdminApiCampaigns } from "@/actions/api-monitoring-actions";
import { Badge } from "@/components/ui/badge";
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
import { formatCurrency } from "@/lib/utils";

export default async function ApiMonitoringCampaignsPage() {
  const campaigns = await listAdminApiCampaigns();

  return (
    <Card>
      <CardHeader>
        <CardTitle>API campaigns</CardTitle>
        <CardDescription>
          All campaigns created through the public RefreeG API.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Developer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Raised</TableHead>
                <TableHead>Reports</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No API campaigns found.
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{campaign.title}</span>
                        <span className="text-xs text-muted-foreground">
                          Goal: {formatCurrency(campaign.goalAmount)} ·{" "}
                          {campaign.payoutMode}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{campaign.developerName}</span>
                        <span className="text-xs text-muted-foreground">
                          {campaign.developerEmail}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          campaign.status === "active" ? "default" : "outline"
                        }
                      >
                        {campaign.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{campaign.mode}</Badge>
                    </TableCell>
                    <TableCell>
                      {formatCurrency(campaign.raisedAmount)}
                    </TableCell>
                    <TableCell>{campaign.reportsCount}</TableCell>
                    <TableCell>
                      {format(new Date(campaign.createdAt), "MMM d, yyyy")}
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
