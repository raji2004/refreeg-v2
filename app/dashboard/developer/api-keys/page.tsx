import { getApiKeys } from "@/actions/admin/api-key-actions";
import ApiKeysManager from "./ApiKeysManager";

export const metadata = {
  title: "API Keys | RefreeG Developer",
};

export default async function ApiKeysPage() {
  const keys = await getApiKeys();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">API Keys</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Your secret keys are used to authenticate API requests. Treat them
          like passwords.
        </p>
      </div>

      <ApiKeysManager initialKeys={keys} />
    </div>
  );
}
