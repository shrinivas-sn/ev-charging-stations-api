import React from 'react';
import { Link } from 'react-router-dom';
import { formatCount, useDataset } from '../lib/dataset';

export default function Footer() {
  const dataset = useDataset();

  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <p className="text-sm font-semibold text-ink">India EV Charging Station Directory API</p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
              A keyless REST API for Indian public EV charging stations: radius search, state,
              city, operator and connector filters, and a connector reference dictionary.
            </p>
            <p className="mt-3 max-w-md rounded-md border border-line bg-subtle px-3 py-2 text-xs leading-relaxed text-ink-muted">
              <span className="font-semibold text-ink">Data status: generated sample.</span> The
              bundled dataset is synthetic, produced by{' '}
              <code className="text-[11px]">backend/scripts/generate-data.js</code>, so it is
              suitable for development and evaluation — not for navigation or dispatch. It is not
              official Government of India data.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-dim">Product</p>
            <ul className="mt-2 space-y-0.5 text-sm">
              {[
                ['/docs', 'API reference'],
                ['/playground', 'Playground'],
                ['/guides', 'Guides'],
                ['/status', 'Status & dataset'],
              ].map(([to, label]) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="-mx-1 inline-flex min-h-6 items-center rounded px-1 text-ink-muted hover:text-accent"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-dim">
              Dataset coverage
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Stations</dt>
                <dd className="font-medium text-ink">{formatCount(dataset.totalStations)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">States &amp; UTs</dt>
                <dd className="font-medium text-ink">{formatCount(dataset.totalStates)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Cities</dt>
                <dd className="font-medium text-ink">{formatCount(dataset.totalCities)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Operators</dt>
                <dd className="font-medium text-ink">{formatCount(dataset.totalOperators)}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6 text-xs text-ink-dim sm:flex-row sm:items-center sm:justify-between">
          <p>
            Code licensed under MIT. Intended data source:{' '}
            <a
              href="https://data.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-ink"
            >
              Open Government Data (data.gov.in)
            </a>{' '}
            under GODL-India — not yet ingested.
          </p>
          <p>
            Snapshot {dataset.snapshotDate || '—'} · keyless · CORS enabled
          </p>
        </div>
      </div>
    </footer>
  );
}
