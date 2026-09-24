import { NextResponse } from "next/server";
import { sendMilestoneEmail, sendCampaignExpiringEmail } from "@/services/mail";

export async function POST(request: Request) {
  try {
    const { type, data } = await request.json();

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
