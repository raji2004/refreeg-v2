import { sendWelcomeEmailToUser } from "@/services/mail";
import { subscribeToConvertKit } from "@/services/convertkit";

export async function runPostSignupActions({
  email,
  fullName,
  accountType,
}: {
  email: string;
  fullName: string;
  accountType?: string | null;
}) {
  const profileSetupUrl = `${process.env.NEXTAUTH_URL}/dashboard/settings`;

  // Independent so a ConvertKit failure never blocks the welcome email.
  const [convertKit, welcome] = await Promise.allSettled([
    subscribeToConvertKit({
      email,
      first_name: fullName.split(" ")[0],
      fields: {
        account_type: accountType || "not_selected",
        signup_date: new Date().toISOString(),
      },
    }),
    sendWelcomeEmailToUser(email, fullName, profileSetupUrl),
  ]);

  if (convertKit.status === "rejected") {
    console.error("[Signup] ConvertKit subscribe failed:", convertKit.reason);
  }
  if (welcome.status === "rejected") {
    console.error("[Signup] Welcome email failed:", welcome.reason);
  }
}
