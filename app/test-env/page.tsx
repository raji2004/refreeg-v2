"use client";

import { useState } from "react";

export default function TestEnvPage() {
  const [result, setResult] = useState<any>(null);

  const testEnvVars = () => {
    const envVars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET" : "NOT SET",
      allEnvKeys: Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_'))
    };

    console.log("Environment variables:", envVars);
    setResult(envVars);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Environment Variables Test</h1>
      
      <button 
        onClick={testEnvVars}
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        Test Environment Variables
      </button>
      
      {result && (
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <h3 className="font-bold mb-2">Environment Variables:</h3>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}