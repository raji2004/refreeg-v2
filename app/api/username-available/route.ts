import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { checkUsernameAvailability } from "@/actions/profile-actions";

// A plain GET instead of a server action: server actions run one at a time,
// so debounced checks while typing were queuing ahead of the step's save.
export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username")?.trim() || "";
  if (!username) {
    return NextResponse.json({ available: false }, { status: 400 });
  }

  const session = await auth();
  const available = await checkUsernameAvailability(
    username,
    session?.user?.id,
  );

  return NextResponse.json({ available });
}
