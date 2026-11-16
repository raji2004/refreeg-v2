import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const requested = url.searchParams.get("redirect") || "";
  // Only same-site relative paths: a single leading "/", no "//", "/\\" or
  // control characters that browsers could read as another host.
  const redirectTo = /^\/(?![/\\])[^\x00-\x1f]*$/.test(requested)
    ? requested
    : "/auth/signin";

  await signOut({ redirect: false });

  const base = process.env.NEXT_PUBLIC_APP_URL || "https://www.refreeg.com";
  const target = new URL(redirectTo, base);
  if (target.origin !== new URL(base).origin) {
    return NextResponse.redirect(new URL("/auth/signin", base));
  }
  target.searchParams.set("reason", "security-reset");
  return NextResponse.redirect(target);
}
