"use client";

import React, { useState } from 'react';
import { ModelDefinition } from '../_data/models';
import { ChevronDown, ChevronUp, Database } from 'lucide-react';

export function ModelCard({ model }: { model: ModelDefinition }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div id={model.id} className="mb-4 border border-slate-200 rounded-lg overflow-hidden bg-white transition-all hover:border-slate-300 shadow-sm">
      {/* Header (Clickable) */}
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center p-4 hover:bg-slate-50 transition-colors text-left"
      >
        <span className="p-1.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100 mr-4">
          <Database size={16} />
        </span>
        
        <span className="font-semibold text-slate-800 text-base flex-1">
          {model.name}
        </span>
        
        <div className="flex items-center space-x-4">
          <span className="hidden md:inline-block text-slate-500 text-sm truncate max-w-xs">
            {model.description}
          </span>
          
          {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/50">
          <div className="p-4 md:p-6 border-b border-slate-100">
            <p className="text-slate-600 text-sm">{model.description}</p>
          </div>

          <div className="p-4 md:p-6 pt-0">
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white mt-4">
              <table className="w-full text-sm text-left text-slate-700">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Field</th>
                    <th className="px-4 py-2.5 font-medium">Type</th>
                    <th className="px-4 py-2.5 font-medium">Required</th>
                    <th className="px-4 py-2.5 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {model.fields.map((field, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 font-mono text-emerald-700 font-medium">
                        {field.name}
                        {field.isRelation && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
                            Relation
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-blue-600 font-mono text-xs">{field.type}</td>
                      <td className="px-4 py-2.5">
                        {!field.isOptional ? (
                          <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded text-xs border border-red-200 font-medium">Yes</span>
                        ) : (
                          <span className="text-slate-400 text-xs">No</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{field.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
