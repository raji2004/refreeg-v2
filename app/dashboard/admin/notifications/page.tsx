import { Eyebrow } from "@/components/ui/eyebrow";
import { EmailAdminTabs } from "@/components/admin/email/EmailAdminTabs";
import { Heading, P } from "@/components/marketing/Typography";

export const metadata = { title: "Notifications | RefreeG Admin" };

export default function AdminNotificationsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Eyebrow>Notifications</Eyebrow>
        <Heading as="h1" size="subsection">
          Email
        </Heading>
        <P className="text-ink/60">
          Send announcements and choose which events send an email.
        </P>
      </div>
      <EmailAdminTabs />
    </div>
  );
}
