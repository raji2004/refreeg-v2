import { NextResponse } from "next/server";
import {
  DeviceLocationError,
  resolveDeviceCampaignLocation,
} from "@/lib/locations/campaign-location";
import type { DeviceLocation } from "@/types/cause-types";

export async function POST(request: Request) {
  try {
    const deviceLocation = (await request.json()) as DeviceLocation;
    const location = await resolveDeviceCampaignLocation(deviceLocation);

    return NextResponse.json(
      { location },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (!(error instanceof DeviceLocationError)) {
      console.error("Current location lookup failed:", error);
    }

    const message =
      error instanceof DeviceLocationError
        ? error.message
        : "Unable to verify your current location";

    return NextResponse.json(
      { error: message },
      { status: error instanceof DeviceLocationError ? 400 : 500 },
    );
  }
}
