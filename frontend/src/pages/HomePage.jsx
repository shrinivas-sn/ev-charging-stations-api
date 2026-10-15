import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatCount, useDataset } from '../lib/dataset';

const ENDPOINTS = [
  {
    path: '/v1/stations/near',
    params: 'lat, lng, radius, limit, connector, min_power_kw',
    description: 'Stations within a kilometre radius of a coordinate, nearest first.',
  },
  {
    path: '/v1/stations',
    params: 'state, city, operator, connector, min_power_kw, page, limit',
    description: 'Paginated directory of every station, with filtering and pagination metadata.',
  },
  {
    path: '/v1/stations/{id}',
    params: 'id',
    description: 'A single station, including its connector list and total capacity.',
  },
  {
    path: '/v1/states',
    params: '—',
    description: 'Station and capacity totals per state and union territory.',
  },
  {
    path: '/v1/operators',
    params: '—',
    description: 'Charge point operators with station counts across the dataset.',
  },
  {
    path: '/v1/connectors',
    params: '—',
    description: 'Connector standard reference: current type, power range and compatible vehicles.',
  },
  { path: '/v1/meta', params: '—', description: 'Dataset provenance, coverage counts and snapshot date.' },
  { path: '/v1', params: '—', description: 'Self-describing index of every endpoint.' },
];

export default function HomePage() {
  const dataset = useDataset();
  const [copied, setCopied] = useState(false);

  const apiBase = useMemo(() => {
    if (dataset.apiBaseUrl) return dataset.apiBaseUrl;
    if (typeof window !== 'undefined') return window.location.origin;
    return '';
  }, [dataset.apiBaseUrl]);

  const curl = `curl -s "${apiBase}/v1/stations/near?lat=12.9716&lng=77.5946&radius=10&limit=2"`;

  const sampleResponse = useMemo(() => {
    if (!dataset.exampleStation) {
      return '{\n  "success": true,\n  "data": [],\n  "meta": {}\n}';
    }
    return JSON.stringify(
      {
        success: true,
        data: [dataset.exampleStation],
        meta: {
          center: { lat: 12.9716, lng: 77.5946 },
          radius_km: 10,
          count: 1,
          total_found: 1778,
          limit: 2,
          filters_applied: { operator: null, connector: null, min_power_kw: null },
          took_ms: 4.2,
        },
      },
      null,
      2
    );
  }, [dataset.exampleStation]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(curl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const facts = [
    { label: 'Stations', value: formatCount(dataset.totalStations) },
    { label: 'States & UTs', value: formatCount(dataset.totalStates) },
    { label: 'Cities', value: formatCount(dataset.totalCities) },
    { label: 'Operators', value: formatCount(dataset.totalOperators) },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-14 px-4 py-10 sm:px-6">
      <section className="grid items-start gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <span className="chip">Keyless · CORS enabled · No sign-up</span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            India EV charging station directory API
          </h1>
          <p className="mt-4 max-w-prose text-base leading-relaxed text-ink-muted">
            A REST API for Indian public electric vehicle charging stations: radius search around
            any coordinate, filtering by state, city, operator, connector and capacity, plus a
            reference dictionary of Indian charging standards. No API key, no rate-limit
            registration, no tracking.
          </p>

          <div className="mt-5 rounded-lg border border-line bg-subtle px-4 py-3">
            <p className="text-sm leading-relaxed text-ink-muted">
              <span className="font-semibold text-ink">
                The bundled dataset is generated sample data.
              </span>{' '}
              It has a realistic shape — coordinates, connectors, capacities, states and operators —
              but the stations are synthetic, so treat responses as development fixtures. The
              intended source is the Bureau of Energy Efficiency dataset on data.gov.in, which is
              not ingested yet.
            </p>
            <p className="mt-2 text-sm">
              <Link to="/status" className="font-medium text-accent hover:text-accent-strong">
                See dataset provenance and coverage →
              </Link>
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/playground" className="btn-primary">
              Open the playground
            </Link>
            <Link to="/docs" className="btn-secondary">
              Read the API reference
            </Link>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="card">
            <div className="card-header">
              <h2 className="text-sm font-semibold text-ink">Dataset at a glance</h2>
              <span className="hint">{dataset.snapshotDate || 'snapshot unknown'}</span>
            </div>
            <dl className="grid grid-cols-2 gap-px bg-line">
              {facts.map((fact) => (
                <div key={fact.label} className="bg-surface px-4 py-3">
                  <dt className="text-xs text-ink-dim">{fact.label}</dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums text-ink">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="border-t border-line px-4 py-3">
              <p className="text-xs text-ink-dim">
                Status: <span className="font-medium text-ink">{dataset.datasetStatus || '—'}</span>{' '}
                · Every count is read from the dataset at build time, never hard-coded.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-ink">Quick start</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Every endpoint is a plain <code className="text-xs">GET</code> that returns JSON. Add the
          headers you need; none are required.
        </p>

        <div className="mt-4 overflow-hidden rounded-lg border border-line">
          <div className="flex items-center justify-between gap-3 border-b border-line bg-subtle px-4 py-2">
            <span className="text-xs font-medium text-ink-muted">Request</span>
            <button type="button" onClick={copy} className="btn-secondary px-2 py-1 text-xs">
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="code-block rounded-none border-0">
            <code>{curl}</code>
          </pre>
        </div>

        <div className="mt-3 overflow-hidden rounded-lg border border-line">
          <div className="border-b border-line bg-subtle px-4 py-2 text-xs font-medium text-ink-muted">
            Response · 200 OK
          </div>
          <pre className="code-block max-h-96 rounded-none border-0">
            <code>{sampleResponse}</code>
          </pre>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-ink">Endpoints</h2>
        <div className="mt-4 overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-subtle text-xs text-ink-muted">
                <th className="px-4 py-2.5 font-medium">Path</th>
                <th className="px-4 py-2.5 font-medium">Query parameters</th>
                <th className="px-4 py-2.5 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ENDPOINTS.map((endpoint) => (
                <tr key={endpoint.path} className="bg-surface">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium text-ink">
                    {endpoint.path}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                    {endpoint.params}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{endpoint.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-ink-muted">
          Invalid parameters return <code className="text-xs">400</code> with a machine-readable{' '}
          <code className="text-xs">error.code</code>; they are never silently ignored.{' '}
          <Link to="/docs" className="text-accent hover:text-accent-strong">
            Full reference →
          </Link>
        </p>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">Largest states</h2>
          <p className="mt-1 text-sm text-ink-muted">
            From <code className="text-xs">/v1/states</code>.
          </p>
          <div className="mt-4 overflow-hidden rounded-lg border border-line">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-subtle text-xs text-ink-muted">
                  <th className="px-4 py-2.5 font-medium">State / UT</th>
                  <th className="px-4 py-2.5 text-right font-medium">Stations</th>
                  <th className="px-4 py-2.5 font-medium">Leading operators</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(dataset.topStates || []).map((state) => (
                  <tr key={state.state_code} className="bg-surface">
                    <td className="px-4 py-3 font-medium text-ink">{state.state}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-muted">
                      {formatCount(state.total_stations)}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted">
                      {(state.top_operators || []).map((operator) => operator.operator).join(', ') ||
                        '—'}
                    </td>
                  </tr>
                ))}
                {(!dataset.topStates || dataset.topStates.length === 0) && (
                  <tr>
                    <td colSpan={3} className="bg-surface px-4 py-6 text-center text-ink-dim">
                      State totals are unavailable in this build.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">Connector standards</h2>
          <p className="mt-1 text-sm text-ink-muted">
            From <code className="text-xs">/v1/connectors</code>, with the number of stations in this
            dataset exposing each connector.
          </p>
          <div className="mt-4 overflow-hidden rounded-lg border border-line">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-subtle text-xs text-ink-muted">
                  <th className="px-4 py-2.5 font-medium">Standard</th>
                  <th className="px-4 py-2.5 font-medium">Current</th>
                  <th className="px-4 py-2.5 text-right font-medium">Typical</th>
                  <th className="px-4 py-2.5 text-right font-medium">Stations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(dataset.connectors || []).map((connector) => (
                  <tr key={connector.id} className="bg-surface">
                    <td className="px-4 py-3">
                      <span className="font-medium text-ink">{connector.name}</span>
                      <span className="mt-0.5 block font-mono text-[11px] text-ink-dim">
                        {connector.standard}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{connector.current_type}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-muted">
                      {connector.typical_power_kw} kW
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-muted">
                      {formatCount(connector.stations_with_this_connector)}
                    </td>
                  </tr>
                ))}
                {(!dataset.connectors || dataset.connectors.length === 0) && (
                  <tr>
                    <td colSpan={4} className="bg-surface px-4 py-6 text-center text-ink-dim">
                      Connector reference is unavailable in this build.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
