export default function JavascriptSdkDocsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">refreeg-js</h1>
        <p className="mt-2 text-muted-foreground">
          Lightweight JavaScript SDK for campaigns, donations, and webhooks.
        </p>
      </div>

      <section className="rounded-lg border p-5">
        <h2 className="font-semibold">Install</h2>
        <pre className="mt-3 overflow-x-auto rounded-md bg-slate-950 p-4 text-sm text-slate-50">
          npm install refreeg-js
        </pre>
      </section>

      <section className="rounded-lg border p-5">
        <h2 className="font-semibold">Quickstart</h2>
        <pre className="mt-3 overflow-x-auto rounded-md bg-slate-950 p-4 text-sm text-slate-50">{`import RefreeG from "refreeg-js";

const refreeg = new RefreeG("rg_live_sk_...");

const campaign = await refreeg.campaigns.create({
  title: "Community clinic",
  description: "Help us equip a rural clinic.",
  goal_amount: 500000,
  payout_mode: "immediate",
  bank_account_number: "0123456789",
  bank_code: "058",
  bank_account_name: "Clinic Fund",
});

const payment = await refreeg.donations.initialize({
  campaign_id: campaign.id,
  amount: 10000,
  name: "Ada",
  email: "ada@example.com",
});`}</pre>
      </section>
    </div>
  );
}
