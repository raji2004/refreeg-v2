import { NextResponse } from "next/server";

export async function GET() {
  try {
    const BREET_BASE_URL = "https://api.breet.io/v1";

    const dynamicId = Math.floor(Math.random() * 1000000);
    const uniqueRef = `refreeg-ref-${dynamicId}`;

    const uniqueHash = `0x_mock_hash_${dynamicId}_tron_trc20`;

    console.log(
      `Sending Mock TRC-20 Deposit Trigger with Reference: ${uniqueRef}`,
    );

    const response = await fetch(`${BREET_BASE_URL}/trades/sell/mock-trade`, {
      method: "POST",
      headers: {
        "x-app-id": process.env.BREET_APP_ID!,
        "x-app-secret": process.env.BREET_APP_SECRET!,
        "X-Breet-Env": "development",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        walletAddress: "TYrmsJGXAsM9651Wfb8y66UZ6gTj1s5hSK",
        asset: "USDT_TRC20",
        amountInUSD: 100,
        cryptoReceived: 100,
        reference: uniqueRef,
        txHash: uniqueHash,
        confirmations: 12,
      }),
    });

    const result = await response.json();
    return NextResponse.json({ triggered: true, breetResponse: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
