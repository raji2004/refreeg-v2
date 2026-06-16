import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user?.id) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      cause_id,
      tx_signature,
      amount_in_sol,
      amount_in_naira,
      wallet_address,
      recipient_address,
    } = body;

    if (
      !cause_id ||
      !tx_signature ||
      !amount_in_sol ||
      !amount_in_naira ||
      !wallet_address ||
      !recipient_address
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const amountInCrypto = Number(amount_in_sol);
    const amountInNaira = Number(amount_in_naira);

    if (Number.isNaN(amountInCrypto) || Number.isNaN(amountInNaira)) {
      return NextResponse.json(
        { error: "Invalid donation amounts" },
        { status: 400 }
      );
    }

    const insertData = await prisma.$transaction(async (tx) => {
      const donation = await tx.crypto_donations.create({
        data: {
          cause_id,
          tx_signature,
          amount_in_crypto: amountInCrypto,
          amount_in_naira: amountInNaira,
          donor_wallet_address: wallet_address,
          recipient_address,
          user_id: user.id,
          status: "completed",
          network: "Solana Testnet",
          currency: "SOL",
        },
      });

      await tx.cause.update({
        where: { id: cause_id },
        data: {
          raised: {
            increment: amountInNaira,
          },
        },
      });

      return donation;
    });

    return NextResponse.json({
      success: true,
      donation_id: insertData.id,
      message: "Donation logged and cause updated successfully",
    });
  } catch (error) {
    console.error("Crypto donation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
