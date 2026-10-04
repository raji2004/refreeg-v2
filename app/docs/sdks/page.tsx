import Link from "next/link";

const pages = [
  {
    title: "JavaScript SDK",
    href: "/docs/sdks/javascript",
    description: "Use refreeg-js in browser, Node.js, and edge runtimes.",
  },
  {
    title: "Python SDK",
    href: "/docs/sdks/python",
    description: "Use refreeg-python in server-side integrations and jobs.",
  },
];

export default function SdkDocsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">SDKs</h1>
        <p className="mt-2 text-muted-foreground">
          Official starter SDKs for integrating RefreeG campaigns, donations,
          and webhooks.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {pages.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            className="rounded-lg border p-5 transition hover:bg-muted/50"
          >
            <h2 className="font-semibold">{page.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {page.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
