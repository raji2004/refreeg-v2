/** Missing image requests must not fall through to dynamic page routes. */
export function GET() {
  return new Response("Not found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export function HEAD() {
  return new Response(null, { status: 404 });
}
