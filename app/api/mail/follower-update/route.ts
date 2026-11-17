import { NextResponse } from "next/server";
import { sendMilestoneEmail, sendCampaignExpiringEmail } from "@/services/mail";
import {
  assertInternalApiKey,
  isOwnAppUrl,
  isValidEmail,
} from "@/lib/internal-api";

const MAX_RECIPIENTS = 500;

export async function POST(request: Request) {
  const denied = assertInternalApiKey(request);
  if (denied) return denied;

  try {
    const { type, data } = await request.json();

    if (
      !data ||
      !Array.isArray(data.followers) ||
      data.followers.length > MAX_RECIPIENTS ||
      !data.followers.every(isValidEmail) ||
      !isOwnAppUrl(data.causeUrl) ||
      typeof data.causeTitle !== "string" ||
      data.causeTitle.length > 200
    ) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (type === "milestone") {
      const { followers, causeTitle, causeUrl, milestone } = data;
      for (const email of followers) {
        await sendMilestoneEmail({
          to: email,
          causeTitle,
          causeUrl,
          milestone,
        });
      }
    } else if (type === "expiring") {
      const {
        followers,
        causeTitle,
        causeUrl,
        amountRaised,
        goalAmount,
        percent,
      } = data;
      for (const email of followers) {
        await sendCampaignExpiringEmail({
          to: email,
          causeTitle,
          causeUrl,
          amountRaised,
          goalAmount,
          percent,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending follower notification email:", error);
    return NextResponse.json(
      { error: "Failed to send notifications" },
      { status: 500 },
    );
  }
}
