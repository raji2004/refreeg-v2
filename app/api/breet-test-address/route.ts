import { NextResponse } from "next/server";

export async function GET() {
  try {
    const BREET_BASE_URL = "https://api.breet.io/v1";
    const dynamicId = Math.floor(Math.random() * 1000000);
    const uniqueRef = `refreeg-ref-${dynamicId}-solana`;
    const uniqueHash = `0x_solana_proof_hash_${dynamicId}`;

    console.log(
      "🔄 Fetching dynamically authorized wallet address from local provisioner...",
    );

    const addressGenResponse = await fetch(
      "http://localhost:3000/api/webhooks/breet/get-address",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          causeId: "e6fef262-0beb-417c-bb0d-0fbdc8601b13",
          donorId: "c029d35f-861b-4046-bba2-011166111221",
        }),
      },
    );

    const addressData = await addressGenResponse.json();

    if (!addressData.success || !addressData.address) {
      throw new Error(
        `Failed to provision active context session address: ${addressData.error || "Unknown Error"}`,
      );
    }

    const activeSessionWallet = addressData.address;
    console.log(
      `🎯 Active Solana context wallet acquired: ${activeSessionWallet}`,
    );
    console.log(
      `Sending Mock Solana Deposit Trigger with Reference: ${uniqueRef}`,
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
        walletAddress: activeSessionWallet,
        asset: "USDT_B7ZDHS8D_TOR7",
        amountInUSD: 100,
        cryptoReceived: 100,
        reference: uniqueRef,
        txHash: uniqueHash,
        confirmations: 12,
      }),
    });

    const result = await response.json();
    return NextResponse.json({
      triggered: true,
      usedWallet: activeSessionWallet,
      breetResponse: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
