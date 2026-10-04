import { getOriginalUrl } from "@/actions/url-actions";
import { redirect, notFound } from "next/navigation";

export default async function ShortUrlRedirect({
  params,
}: {
  params: { code: string };
}) {
  const myparams = await params;
  const originalUrl = await getOriginalUrl(myparams.code);

  if (!originalUrl) {
    notFound();
  }

  const url = new URL(originalUrl);
  redirect(url.pathname);
}
