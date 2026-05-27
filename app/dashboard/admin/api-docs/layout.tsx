export const metadata = {
  title: "Mobile API Documentation",
  description: "REST API endpoints for the RefreeG mobile application",
};

export default function ApiDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6 py-8 px-4 sm:px-6 border border-slate-100 rounded-xl my-4">
      <header className="border-b pb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          RefreeG Mobile API Reference
        </h1>
        <p className="text-muted-foreground mt-2">
          Base URL:{" "}
          <code className="bg-slate-100 px-2 py-1 rounded text-emerald-700 text-sm font-mono">
            https://refreeg.com/api/mobile
          </code>
        </p>
        <p className="text-slate-500 text-sm mt-4 max-w-3xl">
          This API is designed specifically for the RefreeG mobile app. It uses
          JWT-based authentication (Bearer token) for secured routes. All
          responses follow a standardized JSON format:{" "}
          <code className="mx-1 bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">
            {`{ "success": boolean, "data"?: any, "error"?: string }`}
          </code>
        </p>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
