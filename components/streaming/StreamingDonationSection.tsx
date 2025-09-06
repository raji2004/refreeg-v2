"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StreamingDonationForm } from "./StreamingDonationForm";
import { LiveStreamingStatus } from "./LiveStreamingStatus";
import { StreamingDonationsList } from "./StreamingDonationsList";
import { AutoProcessor } from "./AutoProcessor";
import { Droplets, Activity, List, Settings } from "lucide-react";

interface StreamingDonationSectionProps {
  causeId: string;
  onDonationSuccess?: () => void;
}

export function StreamingDonationSection({ causeId, onDonationSuccess }: StreamingDonationSectionProps) {
  const [activeTab, setActiveTab] = useState("start");

  const handleDonationSuccess = () => {
    onDonationSuccess?.();
    // Switch to the live status tab to show the new stream
    setActiveTab("live");
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Streaming Donations</h3>
        <p className="text-gray-600">
          Watch your donation flow to this cause in real-time
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="start" className="flex items-center gap-2">
            <Droplets className="h-4 w-4" />
            Start Stream
          </TabsTrigger>
          <TabsTrigger value="live" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Live Status
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            All Streams
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="start" className="mt-6">
          <StreamingDonationForm 
            causeId={causeId} 
            onDonationSuccess={handleDonationSuccess}
          />
        </TabsContent>

        <TabsContent value="live" className="mt-6">
          <LiveStreamingStatus causeId={causeId} />
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <StreamingDonationsList causeId={causeId} />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <AutoProcessor onProcessed={(count) => {
            console.log(`Auto-processed ${count} streaming donations`);
          }} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
