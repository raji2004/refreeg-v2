"use client";

import { useState } from "react";

export default function TestNetworkPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testNetworkConnectivity = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      console.log("Testing network connectivity...");
      
      // Test 1: Basic internet connectivity
      const internetTest = await fetch("https://httpbin.org/get");
      console.log("Internet test:", internetTest.status);
      
      // Test 2: Supabase REST API directly
      const supabaseUrl = "https://eivlgwyipqojpeaxoajm.supabase.co";
      const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdmxnd3lpcHFvanBlYXhvYWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxMTY0NzQsImV4cCI6MjA2MjY5MjQ3NH0.U-Q4_5QgZjlp_dOqYM1xOm5sAi7tMBQPqc8UmagYycQ";
      
      const supabaseTest = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      console.log("Supabase test:", supabaseTest.status, supabaseTest.statusText);
      
      // Test 3: Try to access the causes table directly
      const causesTest = await fetch(`${supabaseUrl}/rest/v1/causes?select=id,title&limit=3`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const causesData = await causesTest.json();
      console.log("Causes test:", causesTest.status, causesData);
      
      setResult({
        internet: { status: internetTest.status, ok: internetTest.ok },
        supabase: { status: supabaseTest.status, statusText: supabaseTest.statusText, ok: supabaseTest.ok },
        causes: { status: causesTest.status, data: causesData, ok: causesTest.ok },
        timestamp: new Date().toISOString()
      });
      
    } catch (err) {
      console.error("Network test error:", err);
      setResult({ error: err.message, timestamp: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Network Connectivity Test</h1>
      
      <button 
        onClick={testNetworkConnectivity}
        disabled={loading}
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
      >
        {loading ? "Testing..." : "Test Network Connectivity"}
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
        <p>This will test:</p>
        <ul className="list-disc list-inside text-sm text-gray-600">
          <li>Basic internet connectivity</li>
          <li>Supabase REST API access</li>
          <li>Direct database query via REST API</li>
        </ul>
      </div>
    </div>
  );
}
