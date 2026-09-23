import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const redirectTo = url.searchParams.get("redirect") || "/auth/signin";

  await signOut({ redirect: false });

  const forwardedHost =
    req.headers.get("x-forwarded-host") || req.headers.get("host");
  const forwardedProto =
    req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const target = new URL(`${forwardedProto}://${forwardedHost}${redirectTo}`);
  target.searchParams.set("reason", "security-reset");
  return NextResponse.redirect(target);
}
