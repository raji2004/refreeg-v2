"use client";

import React, { useState } from 'react';
import { EndpointDefinition } from '../_data/endpoints';
import { SchemaTable } from './schema-table';
import { ChevronDown, ChevronUp, Lock, Unlock } from 'lucide-react';

const MethodColors: Record<string, string> = {
  GET: "bg-emerald-50 text-emerald-700 border-emerald-200",
  POST: "bg-blue-50 text-blue-700 border-blue-200",
  PUT: "bg-orange-50 text-orange-700 border-orange-200",
  DELETE: "bg-red-50 text-red-700 border-red-200",
  PATCH: "bg-purple-50 text-purple-700 border-purple-200",
};

export function EndpointCard({ endpoint }: { endpoint: EndpointDefinition }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div id={endpoint.id} className="mb-4 border border-slate-200 rounded-lg overflow-hidden bg-white transition-all hover:border-slate-300 shadow-sm">
      {/* Header (Clickable) */}
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center p-4 hover:bg-slate-50 transition-colors text-left"
      >
        <span className={`px-2.5 py-1 rounded text-xs font-bold border w-16 text-center mr-4 ${MethodColors[endpoint.method]}`}>
          {endpoint.method}
        </span>
        
        <span className="font-mono text-slate-800 text-sm md:text-base flex-1">
          {endpoint.path}
        </span>
        
        <div className="flex items-center space-x-4">
          <span className="hidden md:inline-block text-slate-500 text-sm truncate max-w-xs">
            {endpoint.summary}
          </span>
          
          {endpoint.authRequired ? (
            <span title="Auth Required (Bearer Token)"><Lock className="w-4 h-4 text-orange-500" /></span>
          ) : (
            <span title="Public"><Unlock className="w-4 h-4 text-emerald-500/60" /></span>
          )}
          
          {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50/50 space-y-6">
          <div>
            <h4 className="text-slate-900 font-medium mb-1">{endpoint.summary}</h4>
            {endpoint.description && <p className="text-slate-500 text-sm">{endpoint.description}</p>}
          </div>

          {/* Full-width params/body table */}
          <div className="space-y-6">
            {endpoint.method === "GET" || endpoint.method === "DELETE" ? (
              <div>
                <h5 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">Query Parameters</h5>
                <SchemaTable fields={endpoint.queryParams} />
              </div>
            ) : (
              <div>
                <h5 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">Request Body</h5>
                <SchemaTable fields={endpoint.requestBody} />
              </div>
            )}
          </div>

          {/* Full-width response example */}
          {endpoint.exampleResponse && (
            <div>
              <h5 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">Example Response (200 OK)</h5>
              <pre className="bg-slate-900 border border-slate-200 rounded-lg p-4 text-xs font-mono text-slate-300 overflow-x-auto">
                {JSON.stringify(endpoint.exampleResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
