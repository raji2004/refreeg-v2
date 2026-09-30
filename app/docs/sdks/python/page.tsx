export default function PythonSdkDocsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">refreeg-python</h1>
        <p className="mt-2 text-muted-foreground">
          Python SDK for backend services, jobs, and CLI integrations.
        </p>
      </div>

      <section className="rounded-lg border p-5">
        <h2 className="font-semibold">Install</h2>
        <pre className="mt-3 overflow-x-auto rounded-md bg-slate-950 p-4 text-sm text-slate-50">
          pip install refreeg-python
        </pre>
      </section>

      <section className="rounded-lg border p-5">
        <h2 className="font-semibold">Quickstart</h2>
        <pre className="mt-3 overflow-x-auto rounded-md bg-slate-950 p-4 text-sm text-slate-50">{`from refreeg_python import RefreeG

client = RefreeG("rg_live_sk_...")

campaign = client.campaigns.create(
    {
        "title": "Flood relief",
        "description": "Emergency response support",
        "goal_amount": 500000,
        "payout_mode": "immediate",
        "bank_account_number": "0123456789",
        "bank_code": "058",
        "bank_account_name": "Relief Fund",
    }
)

payment = client.initialize_donation(
    {
        "campaign_id": campaign["id"],
        "amount": 10000,
        "name": "Ada",
        "email": "ada@example.com",
    }
)`}</pre>
      </section>
    </div>
  );
}
