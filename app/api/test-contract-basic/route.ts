import { NextRequest, NextResponse } from "next/server";
import { getCustodialWallet } from "@/lib/blockchain/custodial-wallet";

export async function GET(request: NextRequest) {
  try {
    const custodialWallet = getCustodialWallet();
    const contract = custodialWallet.getContract();
    
    // Test basic contract functions
    const owner = await contract.owner();
    const walletAddress = custodialWallet.getWalletAddress();
    const isCustodialMinter = await contract.custodialMinters(walletAddress);
    
    // Try to get petition 2 details
    const petition2 = await contract.getPetition(2);
    
    return NextResponse.json({
      success: true,
      contract: {
        address: "0x618F1f05F0F136029866f721c738fAccEC4394F2",
        owner,
        custodialWallet: walletAddress,
        isOwner: owner.toLowerCase() === walletAddress.toLowerCase(),
        isCustodialMinter
      },
      petition2: {
        id: petition2.id.toString(),
        title: petition2.title,
        description: petition2.description,
        creator: petition2.creator,
        isActive: petition2.isActive,
        signatureCount: petition2.signatureCount.toString(),
        custodialEnabled: petition2.custodialEnabled
      },
      message: "Contract basic functions working"
    });
    
  } catch (error) {
    console.error("Error testing contract basic functions:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
