import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <p className="font-mono text-sm text-ink-dim">404</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">Page not found</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">
        That URL does not match any page. If you were looking for an API endpoint, the index lives at{' '}
        <code className="text-xs">/v1</code> and the reference is under <code className="text-xs">/docs</code>.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn-primary">
          Back to overview
        </Link>
        <Link to="/docs" className="btn-secondary">
          API reference
        </Link>
      </div>
    </div>
  );
}
