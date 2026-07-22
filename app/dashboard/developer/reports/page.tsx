"use client";

import { useState, useEffect } from "react";
import { getDeveloperCampaignReports } from "@/actions/api-campaign-report-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, ShieldAlert, BadgeInfo, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

export default function DeveloperApiReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await getDeveloperCampaignReports();
      setReports(data || []);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to load reports", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const filteredReports = reports.filter((report) => 
    report.api_campaigns?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Developer Dashboard</h1>
        <p className="text-muted-foreground mt-1">Manage your API keys, webhooks, and view campaign reports.</p>
      </div>


      <div className="pt-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold">Your Campaign Reports</h2>
            <p className="text-sm text-muted-foreground mt-1">View moderation reports related to your campaigns.</p>
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
            <h3 className="text-lg font-medium text-slate-700">No reports found</h3>
            <p className="text-slate-500 max-w-sm mt-2 text-sm">There are currently no reports filed against your campaigns.</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredReports.map((report) => (
              <Card key={report.id} className={`overflow-hidden transition-all border-l-4 ${report.status === 'pending' ? 'border-l-amber-500' : report.status === 'investigating' ? 'border-l-blue-500' : 'border-l-emerald-500'}`}>
                <CardHeader className="bg-slate-50/50 pb-4">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <BadgeInfo className="h-4 w-4 text-slate-500" />
                        <CardTitle className="text-base font-semibold text-slate-800">
                          {report.api_campaigns?.title || 'Unknown Campaign'}
                        </CardTitle>
                      </div>
                      <CardDescription className="flex items-center gap-1.5 text-xs">
                        <span>Campaign ID: <span className="font-mono text-slate-600">{report.api_campaign_id}</span></span>
                        <span>•</span>
                        <span className="flex items-center"><Clock className="h-3 w-3 mr-1" /> {new Date(report.created_at).toLocaleDateString()}</span>
                      </CardDescription>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium shadow-sm ${
                        report.status === 'pending' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        report.status === 'investigating' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {report.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Report Reason</h4>
                      <p className="text-sm font-medium text-slate-800">{report.reason}</p>
                    </div>
                    {report.message && (
                      <div className="bg-slate-50 p-3 rounded-md border border-slate-100">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Additional Details</h4>
                        <p className="text-sm text-slate-700 italic">&quot;{report.message}&quot;</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
