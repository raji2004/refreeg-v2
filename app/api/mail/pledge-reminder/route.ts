import { NextResponse } from "next/server";
import { sendPledgeReminderEmail } from "@/services/mail";

export async function POST(request: Request) {
  try {
    const { pledge } = await request.json();

    if (!pledge || !pledge.email) {
      return NextResponse.json(
        { error: "Invalid pledge data" },
        { status: 400 },
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://www.refreeg.com";
    const causeId = pledge.cause_id || pledge.causes?.id;
    const causeTitle = pledge.causes?.title || "this campaign";

    await sendPledgeReminderEmail({
      to: pledge.email,
      userName: pledge.name || "there",
      causeTitle,
      amount: pledge.amount,
      reminderDate: pledge.reminder_date,
      donateUrl: `${baseUrl}/causes/${causeId}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending pledge reminder email:", error);
    return NextResponse.json(
      { error: "Failed to send reminder" },
      { status: 500 },
    );
  }
}
