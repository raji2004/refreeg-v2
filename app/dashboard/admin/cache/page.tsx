"use client";

import { useState } from "react";
import { clearSiteCache } from "@/actions/admin-cache-actions";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function AdminCachePage() {
  const [isClearingGlobal, setIsClearingGlobal] = useState(false);
  const [isClearingPath, setIsClearingPath] = useState(false);
  const [specificPath, setSpecificPath] = useState("");

  const handleGlobalClear = async () => {
    setIsClearingGlobal(true);
    try {
      const result = await clearSiteCache();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (e) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsClearingGlobal(false);
    }
  };

  const handlePathClear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specificPath.trim()) return;

    setIsClearingPath(true);
    try {
      const result = await clearSiteCache(specificPath.trim());
      if (result.success) {
        toast.success(result.message);
        setSpecificPath("");
      } else {
        toast.error(result.message);
      }
    } catch (e) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsClearingPath(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Cache Management</h1>
        <p className="text-muted-foreground mt-2">
          Manually invalidate the Next.js Data and Full Route Cache to force fresh data to appear in production.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Global Cache Clear Card */}
        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-6 w-6 text-blue-500" />
              <h3 className="font-semibold text-lg leading-none tracking-tight">Global Purge</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              This will clear the entire site's layout cache. It ensures everyone sees the absolute latest version of the site, but may cause the next immediate page loads to be slightly slower as they rebuild.
            </p>
            <button
              onClick={handleGlobalClear}
              disabled={isClearingGlobal}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 h-10 px-4 py-2 w-full mt-4"
            >
              {isClearingGlobal ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Purging...
                </span>
              ) : (
                "Purge All Cache"
              )}
            </button>
          </div>
        </div>

        {/* Specific Path Clear Card */}
        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              <h3 className="font-semibold text-lg leading-none tracking-tight">Targeted Purge</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Only clear the cache for a specific route. Best if you just pushed a fix to one specific page (e.g., <code className="bg-muted px-1 rounded">/causes/save-the-whales</code>) and don't want to affect the whole site.
            </p>
            <form onSubmit={handlePathClear} className="flex flex-col gap-3 mt-4">
              <input
                type="text"
                placeholder="e.g. /dashboard/admin/causes"
                value={specificPath}
                onChange={(e) => setSpecificPath(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isClearingPath || !specificPath.trim()}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2"
              >
                {isClearingPath ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" /> Purging...
                  </span>
                ) : (
                  "Purge Specific Path"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg flex gap-3 text-sm text-blue-800 dark:text-blue-300">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <div>
          <strong>Note:</strong> Clearing the cache only affects Next.js server-side caching (Data Cache and Full Route Cache). If users are still seeing stale data, ask them to hard-refresh their browser (<kbd className="font-mono bg-blue-100 dark:bg-blue-900 px-1 rounded text-xs">Ctrl + Shift + R</kbd> / <kbd className="font-mono bg-blue-100 dark:bg-blue-900 px-1 rounded text-xs">Cmd + Shift + R</kbd>) to clear their local Browser/Router cache.
        </div>
      </div>
    </div>
  );
}
