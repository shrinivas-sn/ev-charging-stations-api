import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4 font-mono">
      <div className="w-12 h-12 bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-blue-400 font-bold text-lg rounded">
        404
      </div>
      <h1 className="text-xl font-bold text-white uppercase tracking-tight">
        404_ROUTE_NOT_FOUND
      </h1>
      <p className="text-slate-400 text-xs font-sans max-w-sm mx-auto">
        The requested path does not map to any active frontend view or API endpoint documentation.
      </p>
      <div className="pt-2">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-blue-400 text-xs font-mono border border-slate-800 rounded transition-colors"
        >
          ← RETURN_TO_HOME
        </Link>
      </div>
    </div>
  );
}
