import { NextResponse } from "next/server";

const HELPER_COOKIE_NAMES = [
  "authjs.csrf-token",
  "__Host-authjs.csrf-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
];

export async function POST() {
  const response = NextResponse.json({ success: true });

  for (const name of HELPER_COOKIE_NAMES) {
    response.cookies.set(name, "", {
      maxAge: 0,
      expires: new Date(0),
      path: "/",
    });
  }

  response.headers.set("Cache-Control", "no-store");
  return response;
}
