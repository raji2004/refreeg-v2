"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function TestCausePage() {
  const [causes, setCauses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCauses = async () => {
      try {
        console.log("Fetching causes...");
        const supabase = createClient();
        
        // First test basic connection
        console.log("Testing basic connection...");
        const { data: testData, error: testError } = await supabase
          .from("causes")
          .select("id")
          .limit(1);
        
        console.log("Basic test data:", testData);
        console.log("Basic test error:", testError);
        
        if (testError) {
          console.error("Basic connection failed:", testError);
          throw testError;
        }
        
        // Now fetch full data
        console.log("Fetching full causes data...");
        const { data, error } = await supabase
          .from("causes")
          .select("id, title, status, user_id")
          .limit(5);
        
        console.log("Causes data:", data);
        console.log("Causes error:", error);
        
        if (error) {
          console.error("Full query failed:", error);
          throw error;
        }
        
        setCauses(data || []);
        console.log("Successfully loaded", data?.length || 0, "causes");
      } catch (err) {
        console.error("Error fetching causes:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchCauses();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-4">Test Causes</h1>
        <p>Loading causes...</p>
        <p className="text-sm text-gray-500">Check browser console for logs</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-4">Test Causes</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
        </div>
        <p className="mt-4 text-sm text-gray-500">Check browser console for detailed logs</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Test Causes</h1>
      <p>Found {causes.length} causes</p>
      <div className="space-y-2">
        {causes.map((cause) => (
          <div key={cause.id} className="p-2 border rounded">
            <p><strong>ID:</strong> {cause.id}</p>
            <p><strong>Title:</strong> {cause.title}</p>
            <p><strong>Status:</strong> {cause.status}</p>
            <p><strong>User ID:</strong> {cause.user_id}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
