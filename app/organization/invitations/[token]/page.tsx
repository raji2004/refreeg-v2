import Link from "next/link";
import { Building2, Mail, ShieldCheck } from "lucide-react";
import { auth, signOut } from "@/lib/auth/auth";
import { getOrganizationInvitation } from "@/actions/organization-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AcceptInvitationButton } from "./accept-invitation-button";

export default async function OrganizationInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [session, result] = await Promise.all([
    auth(),
    getOrganizationInvitation(token),
  ]);

  const unavailable =
    !result.success ||
    result.invitation.status !== "pending" ||
    result.invitation.expired;
  const redirectPath = `/organization/invitations/${encodeURIComponent(token)}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="items-center text-center">
          <span className="mb-2 rounded-2xl bg-blue-50 p-4 text-blue-700">
            <Building2 className="h-8 w-8" />
          </span>
          <CardTitle className="text-2xl">
            {result.success
              ? `Join ${result.invitation.organization.name}`
              : "Organization invitation"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 text-center">
          {unavailable ? (
            <>
              <p className="text-sm text-muted-foreground">
                {result.success && result.invitation.expired
                  ? "This invitation has expired. Ask an organization admin to send a new one."
                  : result.success
                    ? "This invitation has already been used or revoked."
                    : result.error}
              </p>
              <Button asChild><Link href="/">Return home</Link></Button>
            </>
          ) : (
            <>
              <div className="space-y-3 rounded-xl border bg-slate-50 p-4 text-left text-sm">
                <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-blue-700" /> {result.invitation.email}</p>
                <p className="flex items-center gap-2 capitalize"><ShieldCheck className="h-4 w-4 text-blue-700" /> {result.invitation.role} access</p>
              </div>

              {!session?.user ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Sign in with the invited email address to continue.
                  </p>
                  <Button asChild className="w-full">
                    <Link href={`/auth/signin?redirect=${encodeURIComponent(redirectPath)}`}>Sign in to accept</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/auth/signup?redirect=${encodeURIComponent(redirectPath)}`}>Create an account</Link>
                  </Button>
                </div>
              ) : session.user.email?.toLowerCase() !== result.invitation.email.toLowerCase() ? (
                <div className="space-y-3">
                  <p className="text-sm text-rose-700">
                    You are signed in as {session.user.email}. Switch accounts and
                    use {result.invitation.email} to accept this invitation.
                  </p>
                  <form
                    action={async () => {
                      "use server";
                      await signOut({ redirectTo: redirectPath });
                    }}
                  >
                    <Button type="submit" className="w-full">
                      Switch to the invited account
                    </Button>
                  </form>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/dashboard">Stay in my current account</Link>
                  </Button>
                </div>
              ) : (
                <AcceptInvitationButton token={token} />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
