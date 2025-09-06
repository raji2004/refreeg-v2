"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DatabaseTestPage() {
  const [status, setStatus] = useState("Testing...");
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    const testDatabase = async () => {
      try {
        setStatus("Checking environment variables...");
        
        // Check if environment variables are available
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        console.log("Supabase URL:", supabaseUrl);
        console.log("Supabase Key:", supabaseKey ? "SET" : "NOT SET");
        
        if (!supabaseUrl || !supabaseKey) {
          setStatus("Environment variables not loaded!");
          setDetails({
            error: "Missing environment variables",
            supabaseUrl: supabaseUrl || "NOT SET",
            supabaseKey: supabaseKey ? "SET" : "NOT SET",
            allEnv: Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_'))
          });
          return;
        }
        
        setStatus("Connecting to Supabase...");
        const supabase = createClient();
        
        // Test 1: Simple query like the home page
        setStatus("Testing basic connection...");
        console.log("Testing basic connection...");
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 10000)
        );
        
        const queryPromise = supabase
          .from("causes")
          .select("id, title")
          .limit(3);
        
        const { data: testData, error: testError } = await Promise.race([
          queryPromise,
          timeoutPromise
        ]) as any;
        
        console.log("Test data:", testData);
        console.log("Test error:", testError);
        
        if (testError) {
          setStatus(`Connection failed: ${testError.message}`);
          setDetails({ error: testError });
          return;
        }
        
        setStatus("Database tests completed!");
        setDetails({
          causesData: testData,
          message: "Database connection is working!",
          timestamp: new Date().toISOString()
        });
        
      } catch (err) {
        console.error("Test error:", err);
        setStatus(`Test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setDetails({ error: err });
      }
    };

    testDatabase();
  }, []);

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Database Connection Test</h1>
      
      <div className="mb-4">
        <p className="text-lg"><strong>Status:</strong> {status}</p>
      </div>
      
      {details && (
        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-bold mb-2">Test Results:</h3>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(details, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-500">
        <p>This test will help us identify what's wrong with the database connection.</p>
      </div>
    </div>
  );
}
