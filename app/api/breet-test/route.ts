import { NextResponse } from "next/server";

export async function GET() {
  try {
    const BREET_BASE_URL = "https://api.breet.io/v1";

    console.log("Connecting to Breet Sandbox...");

    const response = await fetch(`${BREET_BASE_URL}/trades/assets`, {
      method: "GET",
      headers: {
        "x-app-id": process.env.BREET_APP_ID!,
        "x-app-secret": process.env.BREET_APP_SECRET!,
        "X-Breet-Env": "development",
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Credentials rejected by Breet",
          raw: result,
        },
        { status: 401 },
      );
    }

    const solanaAssets = result.data.filter(
      (asset: any) =>
        asset.identifier.toLowerCase().includes("sol") ||
        asset.network.toLowerCase().includes("solana"),
    );

    return NextResponse.json({
      success: true,
      message: "Connection successful!",
      solanaAssets,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
