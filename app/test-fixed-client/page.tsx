"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function TestFixedClientPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testFixedClient = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      console.log("Testing fixed Supabase client...");
      
      const supabase = createClient();
      console.log("Created Supabase client");
      
      // Test 1: Simple ping first
      console.log("Testing basic connectivity...");
      const pingResult = await fetch("https://eivlgwyipqojpeaxoajm.supabase.co/rest/v1/", {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdmxnd3lpcHFvanBlYXhvYWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxMTY0NzQsImV4cCI6MjA2MjY5MjQ3NH0.U-Q4_5QgZjlp_dOqYM1xOm5sAi7tMBQPqc8UmagYycQ',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdmxnd3lpcHFvanBlYXhvYWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxMTY0NzQsImV4cCI6MjA2MjY5MjQ3NH0.U-Q4_5QgZjlp_dOqYM1xOm5sAi7tMBQPqc8UmagYycQ`
        }
      });
      
      console.log("Ping result:", pingResult.status, pingResult.statusText);
      
      // Test 2: Try the query with timeout
      console.log("Testing database query with timeout...");
      const startTime = Date.now();
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout after 10 seconds')), 10000)
      );
      
      const queryPromise = supabase
        .from("causes")
        .select("id, title")
        .limit(3);
      
      const { data, error } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as any;
      
      const endTime = Date.now();
      console.log(`Query completed in ${endTime - startTime}ms`);
      console.log("Query result:", { data, error });
      
      setResult({
        success: true,
        ping: { status: pingResult.status, statusText: pingResult.statusText },
        query: { data, error },
        queryTime: `${endTime - startTime}ms`,
        timestamp: new Date().toISOString()
      });
      
    } catch (err) {
      console.error("Fixed client error:", err);
      setResult({ 
        success: false, 
        error: err.message, 
        timestamp: new Date().toISOString() 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Fixed Supabase Client Test</h1>
      
      <button 
        onClick={testFixedClient}
        disabled={loading}
        className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
      >
        {loading ? "Testing..." : "Test Fixed Client"}
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
        <p>This tests the fixed Supabase client configuration.</p>
      </div>
    </div>
  );
}
