import { format } from "date-fns";
import { getApiUsageAnalytics } from "@/actions/api-monitoring-actions";
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

export default async function ApiMonitoringUsagePage() {
  const analytics = await getApiUsageAnalytics();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Request volume</CardDescription>
            <CardTitle>{analytics.requestVolume}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active keys</CardDescription>
            <CardTitle>{analytics.activeKeys}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Error rate</CardDescription>
            <CardTitle>{analytics.errorRate}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top endpoints</CardTitle>
          <CardDescription>
            Most frequently used public API endpoints.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Requests</TableHead>
                  <TableHead>Error rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.topEndpoints.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No request logs yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  analytics.topEndpoints.map((endpoint) => (
                    <TableRow key={endpoint.endpoint}>
                      <TableCell>{endpoint.endpoint}</TableCell>
                      <TableCell>{endpoint.count}</TableCell>
                      <TableCell>{endpoint.errorRate}%</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent API errors</CardTitle>
          <CardDescription>
            Latest failing requests for investigation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Error code</TableHead>
                  <TableHead>API key</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.recentErrors.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No logged API errors.
                    </TableCell>
                  </TableRow>
                ) : (
                  analytics.recentErrors.map((error) => (
                    <TableRow key={error.id}>
                      <TableCell>{error.endpoint}</TableCell>
                      <TableCell>{error.statusCode}</TableCell>
                      <TableCell>{error.errorCode ?? "unknown"}</TableCell>
                      <TableCell>{error.apiKeyPrefix ?? "anonymous"}</TableCell>
                      <TableCell>
                        {format(new Date(error.createdAt), "MMM d, yyyy HH:mm")}
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
