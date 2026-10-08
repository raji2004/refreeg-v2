import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, title, story, category, location } = await req.json();

    let suggestion = "";
    let context = "";

    switch (action) {
      case "pidgin":
        suggestion = `As di fire enter ${location || "market"} for December, forty-two market traders lose everything wey dem take dey feed their families. Every kobo wey you give go straight to restock stalls wit original goods, scale, and tables. Market association chairman dey stamp and receipt everything.`;
        context = "Nigerian Pidgin tone to engage local & grassroots donors.";
        break;

      case "contingency":
        suggestion =
          "If we raise less than the full amount, we will restock stalls in priority order as verified by the market association and publicly post receipts for every stall reopened. No gift is wasted or left in limbo.";
        context =
          "Answers donors' top question: what happens if target is only partially funded.";
        break;

      case "shorter":
        if (story) {
          const sentences = story.split(". ").slice(0, 2);
          suggestion = `${sentences.join(". ")}. All funds are disbursed in verified tranches against receipts.`;
        } else {
          suggestion =
            "Forty-two traders lost everything in the market fire. We are restocking essential stalls with transparent receipt verification.";
        }
        context = "Punchy, fast-reading opening for busy donors.";
        break;

      case "title":
        suggestion = `Restock 42 market stalls in ${location || "Lagos"} after the December fire`;
        context = "High-converting title stating who, how many, and where.";
        break;

      default:
        suggestion =
          "Every donation is held securely by RefreeG and released in verified milestone tranches with uploaded receipts.";
        context = "Transparency and accountability guarantee.";
        break;
    }

    return NextResponse.json({
      success: true,
      suggestion,
      context,
    });
  } catch (error: any) {
    console.error("AI campaign assist error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI assistance", message: error.message },
      { status: 500 },
    );
  }
}
