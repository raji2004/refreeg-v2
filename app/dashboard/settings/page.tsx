"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryState } from "nuqs";
import { ProfileForm } from "./profile-form";
import { BankDetailsForm } from "./bank-details-form";
import CryptoDetailsForm from "./crypto-details-form";

export default function SettingsPage() {
  const { user } = useAuth();
  const {
    profile,
    isLoading: profileLoading,
    error: profileError,
  } = useProfile(user?.id);

  const [activeTab, setActiveTab] = useQueryState("tab", {
    defaultValue: "profile",
    parse: (value) => value,
    serialize: (value) => value,
  });

  // Show skeleton while either auth or profile is loading
  if (profileLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-64 mt-2" />
        </div>

        <Tabs
          defaultValue={activeTab}
          className="space-y-4"
          onValueChange={setActiveTab}
        >
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="bank">Bank Details</TabsTrigger>
            <TabsTrigger value="crypto">Crypto Wallets</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Skeleton className="h-[400px] w-full" />
          </TabsContent>

          <TabsContent value="bank">
            <Skeleton className="h-[400px] w-full" />
          </TabsContent>

          <TabsContent value="crypto">
            <Skeleton className="h-[400px] w-full" />
          </TabsContent>

          <TabsContent value="notifications">
            <Skeleton className="h-[200px] w-full" />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and payment details.
        </p>
      </div>

      <Tabs
        defaultValue={activeTab}
        className="space-y-4"
        onValueChange={setActiveTab}
      >
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="bank">Bank Details</TabsTrigger>
          <TabsTrigger value="crypto">Crypto Wallets</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          {profile && user && <ProfileForm profile={profile} user={user} />}
        </TabsContent>

        <TabsContent value="bank">
          {profile && user && <BankDetailsForm profile={profile} user={user} />}
        </TabsContent>

        <TabsContent value="crypto">
          {profile && user && <CryptoDetailsForm />}
        </TabsContent>

        <TabsContent value="notifications">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
              <h2 className="text-lg font-semibold">Notifications</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Notification settings will be available soon.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
