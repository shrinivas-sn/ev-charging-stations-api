import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-emerald-400 font-mono text-2xl font-bold">
        404
      </div>
      <h1 className="text-3xl font-extrabold text-white">Route Not Found</h1>
      <p className="text-slate-400 text-sm max-w-md mx-auto">
        The requested page or documentation path does not exist on this domain.
      </p>
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-sm font-semibold border border-slate-700 transition-colors"
        >
          ← Return to Overview
        </Link>
      </div>
    </div>
  );
}
