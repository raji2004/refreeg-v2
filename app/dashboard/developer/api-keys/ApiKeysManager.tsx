"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createApiKey, revokeApiKey } from "@/actions/api-key-actions";
import { Plus, Trash2, KeyRound, AlertCircle } from "lucide-react";

export default function ApiKeysManager({
  initialKeys,
}: {
  initialKeys: any[];
}) {
  const [keys, setKeys] = useState(initialKeys);
  const [newKeyName, setNewKeyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const handleCreateKey = async (mode: "live" | "test") => {
    if (!newKeyName.trim()) return;
    setLoading(true);
    try {
      const result = await createApiKey(newKeyName, mode);
      setCreatedKey(result.rawKey);
      setKeys([result, ...keys]);
      setNewKeyName("");
    } catch (err: any) {
      alert(err.message || "Failed to create key");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to revoke this key? Any integrations using it will fail immediately.",
      )
    )
      return;
    try {
      await revokeApiKey(id);
      setKeys(keys.filter((k) => k.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to revoke key");
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-card border rounded-lg p-6 space-y-4 shadow-sm">
        <h3 className="font-medium text-lg">Generate New Key</h3>
        <p className="text-sm text-muted-foreground">
          Live keys will process real transactions and create real campaigns.
          Test keys will create isolated test campaigns and mock donations.
        </p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
          <Input
            placeholder="Key Name (e.g. Production Server)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="max-w-md"
          />
          <div className="flex gap-2">
            <Button
              disabled={loading || !newKeyName.trim()}
              onClick={() => handleCreateKey("test")}
              variant="secondary"
            >
              <Plus className="w-4 h-4 mr-2" /> Test Key
            </Button>
            <Button
              disabled={loading || !newKeyName.trim()}
              onClick={() => handleCreateKey("live")}
            >
              <Plus className="w-4 h-4 mr-2" /> Live Key
            </Button>
          </div>
        </div>

        {createdKey && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md animate-in fade-in slide-in-from-top-2">
            <div className="flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-medium text-amber-800">
                  Save Your Secret Key
                </h4>
                <p className="text-sm text-amber-700 mt-1 mb-3">
                  This is the only time you will be able to see this key in
                  full. Please copy it and store it somewhere secure now.
                </p>
                <div className="flex items-center gap-2">
                  <code className="px-3 py-2 bg-white rounded border flex-1 text-sm font-mono break-all selection:bg-amber-100">
                    {createdKey}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(createdKey);
                      alert("Copied to clipboard!");
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border rounded-lg overflow-x-auto bg-card shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">
                Name
              </th>
              <th className="px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">
                Key Prefix
              </th>
              <th className="px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">
                Mode
              </th>
              <th className="px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">
                Created
              </th>
              <th className="px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">
                Last Used
              </th>
              <th className="px-6 py-3 font-medium text-muted-foreground whitespace-nowrap text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {keys.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-8 text-center text-muted-foreground"
                >
                  <KeyRound className="w-8 h-8 text-muted/50 mx-auto mb-3" />
                  No API keys generated yet.
                </td>
              </tr>
            ) : (
              keys.map((key) => (
                <tr
                  key={key.id}
                  className="hover:bg-muted/50 transition-colors"
                >
                  <td className="px-6 py-4 font-medium whitespace-nowrap">
                    {key.name}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {key.key_prefix}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        key.mode === "live"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-orange-100 text-orange-800"
                      }`}
                    >
                      {key.mode.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                    {new Date(key.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                    {key.last_used_at
                      ? new Date(key.last_used_at).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRevoke(key.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      title="Revoke Key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
