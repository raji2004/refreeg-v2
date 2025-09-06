"use client";

import { createClient } from "@supabase/supabase-js";
import { useState } from "react";

export default function TestSupabasePage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testDirectConnection = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      console.log("Testing direct Supabase connection...");
      
      // Use the environment variables directly
      const supabaseUrl = "https://eivlgwyipqojpeaxoajm.supabase.co";
      const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdmxnd3lpcHFvanBlYXhvYWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxMTY0NzQsImV4cCI6MjA2MjY5MjQ3NH0.U-Q4_5QgZjlp_dOqYM1xOm5sAi7tMBQPqc8UmagYycQ";
      
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      console.log("Created Supabase client");
      
      // Test 1: Simple ping
      console.log("Testing basic connectivity...");
      const pingResult = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      
      console.log("Ping result:", pingResult.status, pingResult.statusText);
      
      // Test 2: Database query with timeout
      console.log("Testing database query...");
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 5000)
      );
      
      const queryPromise = supabase
        .from("causes")
        .select("id, title")
        .limit(3);
      
      const { data, error } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as any;
      
      console.log("Query result:", { data, error });
      
      setResult({
        ping: { status: pingResult.status, statusText: pingResult.statusText },
        query: { data, error },
        timestamp: new Date().toISOString()
      });
      
    } catch (err) {
      console.error("Direct connection error:", err);
      setResult({ error: err.message, timestamp: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Direct Supabase Test</h1>
      
      <button 
        onClick={testDirectConnection}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? "Testing..." : "Test Direct Connection"}
      </button>
      
      {result && (
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <h3 className="font-bold mb-2">Test Results:</h3>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="mt-4">
        <p>Check the browser console for detailed logs.</p>
      </div>
    </div>
  );
}
