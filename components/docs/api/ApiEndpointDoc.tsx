"use client";

import React from "react";

interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface ApiEndpointDocProps {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  url: string;
  title?: string;
  description: string;
  parameters?: Parameter[];
  requestExample?: string;
  responseExample: string;
  children?: React.ReactNode;
}

export default function ApiEndpointDoc({
  method,
  url,
  title,
  description,
  parameters,
  requestExample,
  responseExample,
  children,
}: ApiEndpointDocProps) {
  const methodColor = {
    GET: "bg-green-100 text-green-700 border-green-200",
    POST: "bg-blue-100 text-blue-700 border-blue-200",
    PATCH: "bg-amber-100 text-amber-700 border-amber-200",
    DELETE: "bg-red-100 text-red-700 border-red-200",
  }[method];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-4">
        {title && (
          <h2 className="text-2xl font-extrabold text-[#0A2A5C] tracking-tight mb-2">
            {title}
          </h2>
        )}
        <div className="flex items-center gap-3">
          <span
            className={`px-2 py-1 rounded font-bold text-[12px] border ${methodColor}`}
          >
            {method}
          </span>
          <code className="text-gray-800 font-mono text-sm font-semibold">
            {url}
          </code>
        </div>
        <p className="text-gray-600 leading-relaxed text-[16px]">
          {description}
        </p>
      </div>

      {parameters && parameters.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-gray-500">
            Parameters
          </h4>
          <div className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-[13px] font-semibold text-gray-700">
                    Field
                  </th>
                  <th className="px-4 py-3 text-[13px] font-semibold text-gray-700">
                    Type
                  </th>
                  <th className="px-4 py-3 text-[13px] font-semibold text-gray-700">
                    Required
                  </th>
                  <th className="px-4 py-3 text-[13px] font-semibold text-gray-700">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {parameters.map((param) => (
                  <tr
                    key={param.name}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <code className="text-blue-600 font-mono text-[13px] font-semibold">
                        {param.name}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-500 text-[13px] italic">
                        {param.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {param.required ? (
                        <span className="text-red-500 text-[12px] font-medium">
                          Yes
                        </span>
                      ) : (
                        <span className="text-gray-400 text-[12px]">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-600 leading-relaxed">
                      {param.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {requestExample && (
          <div className="space-y-2">
            <h4 className="text-[12px] font-bold uppercase tracking-wider text-gray-400 ml-1">
              Request JSON
            </h4>
            <pre className="bg-slate-900 text-blue-300 p-4 rounded-xl text-[13px] font-mono overflow-x-auto shadow-lg border border-slate-800">
              <code>{requestExample}</code>
            </pre>
          </div>
        )}
        <div className="space-y-2">
          <h4 className="text-[12px] font-bold uppercase tracking-wider text-gray-400 ml-1">
            Response JSON
          </h4>
          <pre className="bg-slate-900 text-green-300 p-4 rounded-xl text-[13px] font-mono overflow-x-auto shadow-lg border border-slate-800">
            <code>{responseExample}</code>
          </pre>
        </div>
      </div>

      {children && <div className="pt-4">{children}</div>}

      <hr className="border-t border-gray-100 my-10" />
    </div>
  );
}
