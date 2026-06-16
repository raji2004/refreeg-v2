import { format } from "date-fns";
import { listAdminApiDonations } from "@/actions/api-monitoring-actions";
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

export default async function ApiMonitoringDonationsPage() {
  const donations = await listAdminApiDonations();
  const successful = donations.filter(
    (donation) => donation.status === "success",
  );
  const totalAmount = successful.reduce(
    (sum, donation) => sum + donation.amount,
    0,
  );
  const totalFees = successful.reduce(
    (sum, donation) => sum + donation.feeRevenue,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Donation volume</CardDescription>
            <CardTitle>{formatCurrency(totalAmount)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Revenue from 2% fees</CardDescription>
            <CardTitle>{formatCurrency(totalFees)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API donations</CardTitle>
          <CardDescription>
            Donation flow activity processed through developer integrations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Developer</TableHead>
                  <TableHead>Donor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {donations.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No API donations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  donations.map((donation) => (
                    <TableRow key={donation.id}>
                      <TableCell>{donation.campaignTitle}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{donation.developerName}</span>
                          <span className="text-xs text-muted-foreground">
                            {donation.developerEmail}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{donation.donorName}</span>
                          <span className="text-xs text-muted-foreground">
                            {donation.donorEmail}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(donation.amount)}</TableCell>
                      <TableCell>
                        {formatCurrency(donation.feeRevenue)}
                      </TableCell>
                      <TableCell className="capitalize">
                        {donation.status}
                      </TableCell>
                      <TableCell>
                        {format(new Date(donation.createdAt), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
