import React from 'react';
import { SchemaField } from '../_data/endpoints';

export function SchemaTable({ fields }: { fields?: SchemaField[] }) {
  if (!fields || fields.length === 0) return <p className="text-slate-400 italic text-sm">None</p>;

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
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
          {fields.map((field, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
              <td className="px-4 py-2.5 font-mono text-emerald-700 font-medium">{field.name}</td>
              <td className="px-4 py-2.5 text-blue-600 font-mono text-xs">{field.type}</td>
              <td className="px-4 py-2.5">
                {field.required ? (
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
  );
}
