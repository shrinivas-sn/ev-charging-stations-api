import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDataset } from '../lib/dataset';

function Section({ id, title, children, subtitle }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
      {subtitle && <p className="mt-1 text-sm leading-relaxed text-ink-muted">{subtitle}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function ParamTable({ rows }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-subtle text-xs text-ink-muted">
            <th className="px-4 py-2.5 font-medium">Parameter</th>
            <th className="px-4 py-2.5 font-medium">Type</th>
            <th className="px-4 py-2.5 font-medium">Default</th>
            <th className="px-4 py-2.5 font-medium">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.name} className="bg-surface align-top">
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium text-ink">
                {row.name}
                {row.required && <span className="ml-1.5 text-danger" title="Required">*</span>}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-muted">{row.type}</td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-muted">{row.default || '—'}</td>
              <td className="px-4 py-3 text-ink-muted">{row.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CodeSample({ request, response }) {
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-line">
        <div className="border-b border-line bg-subtle px-4 py-2 text-xs font-medium text-ink-muted">
          Request
        </div>
        <pre className="code-block rounded-none border-0">
          <code>{request}</code>
        </pre>
      </div>
      <div className="overflow-hidden rounded-lg border border-line">
        <div className="border-b border-line bg-subtle px-4 py-2 text-xs font-medium text-ink-muted">
          Response
        </div>
        <pre className="code-block rounded-none border-0">
          <code>{response}</code>
        </pre>
      </div>
    </div>
  );
}

const ERROR_CODES = [
  { code: 'INVALID_PARAMETER', status: 400, meaning: 'A numeric parameter was malformed or out of range. details.parameter names it.' },
  { code: 'MISSING_COORDINATES', status: 400, meaning: 'lat or lng was absent or empty on /v1/stations/near.' },
  { code: 'INVALID_LATITUDE', status: 400, meaning: 'lat is not a number between -90 and 90.' },
  { code: 'INVALID_LONGITUDE', status: 400, meaning: 'lng is not a number between -180 and 180.' },
  { code: 'UNKNOWN_STATE', status: 400, meaning: 'state matched no state or union territory in the dataset.' },
  { code: 'UNKNOWN_CITY', status: 400, meaning: 'city matched no city in the dataset.' },
  { code: 'UNKNOWN_CONNECTOR', status: 400, meaning: 'connector is not a recognised standard; details.expected lists the accepted values.' },
  { code: 'INVALID_STATION_ID', status: 400, meaning: 'The id path segment is not a positive integer.' },
  { code: 'STATION_NOT_FOUND', status: 404, meaning: 'The id is well formed but no station has it.' },
  { code: 'RATE_LIMIT_EXCEEDED', status: 429, meaning: 'Per-client request budget exhausted. Retry-After gives the wait in seconds.' },
  { code: 'ROUTE_NOT_FOUND', status: 404, meaning: 'The path is not an endpoint. See /v1 for the index.' },
];

export default function DocsPage() {
  const dataset = useDataset();

  const base = useMemo(() => {
    if (dataset.apiBaseUrl) return dataset.apiBaseUrl;
    if (typeof window !== 'undefined') return window.location.origin;
    return '';
  }, [dataset.apiBaseUrl]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header className="max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">API reference</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Every endpoint is a <code className="text-xs">GET</code> returning JSON. This page documents
          the behaviour the API actually implements, including validation rules and error codes.
        </p>
        <p className="mt-3 rounded-lg border border-line bg-subtle px-4 py-3 text-sm text-ink-muted">
          Responses come from a <span className="font-semibold text-ink">generated sample dataset</span>{' '}
          ({dataset.totalStations ? dataset.totalStations.toLocaleString('en-IN') : '—'} stations).
          Use it for development; it is not official Government of India data.
        </p>
      </header>

      <nav className="mt-8 flex flex-wrap gap-2 border-b border-line pb-6 text-sm">
        {[
          ['conventions', 'Conventions'],
          ['near', 'Radius search'],
          ['stations', 'Directory'],
          ['station-id', 'Station by id'],
          ['reference', 'States, operators, connectors'],
          ['normalisation', 'Input normalisation'],
          ['errors', 'Error codes'],
        ].map(([anchor, label]) => (
          <a key={anchor} href={`#${anchor}`} className="chip hover:border-line-strong hover:text-ink">
            {label}
          </a>
        ))}
      </nav>

      <div className="mt-10 space-y-14">
        <Section
          id="conventions"
          title="Conventions"
          subtitle="Shared behaviour across every endpoint."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['Base URL', base || 'resolved at runtime'],
              ['Authentication', 'None. No keys, headers or registration.'],
              ['CORS', 'Access-Control-Allow-Origin: *'],
              ['Rate limit', '300 requests per 15 minutes, per client address.'],
            ].map(([label, value]) => (
              <div key={label} className="card p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-dim">{label}</p>
                <p className="mt-1 break-words text-sm text-ink-muted">{value}</p>
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">Success envelope</h3>
            <pre className="code-block mt-2">
              <code>{`{
  "success": true,
  "data": [ /* array, or a single object for /v1/stations/{id} */ ],
  "meta": { "took_ms": 4.2, /* endpoint-specific fields */ }
}`}</code>
            </pre>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">Error envelope</h3>
            <p className="mt-1 text-sm text-ink-muted">
              Validation failures are <code className="text-xs">400</code> responses with a stable{' '}
              <code className="text-xs">code</code>, and <code className="text-xs">details</code> naming
              the offending parameter.
            </p>
            <pre className="code-block mt-2">
              <code>{`{
  "success": false,
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "'radius' must be at most 100, received 250.",
    "details": { "parameter": "radius", "received": "250", "expected": "number <= 100" }
  }
}`}</code>
            </pre>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">Rate limiting</h3>
            <p className="mt-1 text-sm text-ink-muted">
              Limits are applied per client address, so one heavy caller cannot exhaust another's
              budget. Every response carries <code className="text-xs">RateLimit-Limit</code>,{' '}
              <code className="text-xs">RateLimit-Remaining</code> and{' '}
              <code className="text-xs">RateLimit-Reset</code>. A <code className="text-xs">429</code>{' '}
              additionally carries <code className="text-xs">Retry-After</code> in seconds.
            </p>
          </div>
        </Section>

        <Section
          id="near"
          title="GET /v1/stations/near"
          subtitle="Stations within a kilometre radius of a coordinate, sorted nearest first."
        >
          <ParamTable
            rows={[
              { name: 'lat', type: 'number', required: true, notes: 'Latitude, -90 to 90.' },
              { name: 'lng', type: 'number', required: true, notes: 'Longitude, -180 to 180.' },
              { name: 'radius', type: 'number', default: '10', notes: 'Kilometres. Must be greater than 0 and at most 100.' },
              { name: 'limit', type: 'integer', default: '25', notes: 'Results per page, 1 to 100.' },
              { name: 'connector', type: 'string', notes: 'Filter to stations exposing this connector.' },
              { name: 'min_power_kw', type: 'number', notes: 'Minimum total station capacity.' },
              { name: 'operator', type: 'string', notes: 'Exact or partial charge point operator match.' },
            ]}
          />
          <p className="text-sm text-ink-muted">
            Filters are applied before the nearest-first sort, so <code className="text-xs">total_found</code>{' '}
            counts matches inside the radius, not matches within the page.
          </p>
          <CodeSample
            request={`curl -s "${base}/v1/stations/near?lat=12.9716&lng=77.5946&radius=15&connector=CCS-2&limit=1"`}
            response={`{
  "success": true,
  "data": [
    {
      "id": 1739,
      "name": "Tata Power EZ Charge - Bengaluru Shortened name",
      "operator": "Tata Power EZ Charge",
      "state": "Karnataka",
      "state_code": "KA",
      "district": "Bengaluru Urban",
      "city": "Bengaluru",
      "address": "Metro Station Parking, Sector 22, Bengaluru, Bengaluru Urban, Karnataka - India",
      "latitude": 12.940123,
      "longitude": 77.561234,
      "connectors": [
        { "type": "CCS-2", "power_kw": 120, "count": 2 },
        { "type": "Type-2 AC", "power_kw": 22, "count": 2 }
      ],
      "total_capacity_kw": 284,
      "availability": "24x7",
      "access_type": "Public",
      "status": "Operational",
      "distance_km": 1.42
    }
  ],
  "meta": {
    "center": { "lat": 12.9716, "lng": 77.5946 },
    "radius_km": 15,
    "count": 1,
    "total_found": 5312,
    "limit": 1,
    "filters_applied": { "operator": null, "connector": "CCS-2", "min_power_kw": null },
    "took_ms": 6.8
  }
}`}
          />
        </Section>

        <Section
          id="stations"
          title="GET /v1/stations"
          subtitle="Paginated directory of every station in the dataset."
        >
          <ParamTable
            rows={[
              { name: 'state', type: 'string', notes: 'State name or code. Trimmed and case-insensitive.' },
              { name: 'city', type: 'string', notes: 'City name. Common alternate spellings are resolved.' },
              { name: 'operator', type: 'string', notes: 'Exact match, or a partial match as a fallback.' },
              { name: 'connector', type: 'string', notes: 'Stations exposing this connector.' },
              { name: 'min_power_kw', type: 'number', notes: 'Minimum total station capacity.' },
              { name: 'page', type: 'integer', default: '1', notes: '1-based page number.' },
              { name: 'limit', type: 'integer', default: '25', notes: 'Page size, 1 to 100.' },
            ]}
          />
          <CodeSample
            request={`curl -s "${base}/v1/stations?state=KA&min_power_kw=142&limit=2"`}
            response={`{
  "success": true,
  "data": [ /* station objects */ ],
  "meta": {
    "total": 1104,
    "page": 1,
    "limit": 2,
    "count": 2,
    "total_pages": 552,
    "filters_applied": {
      "state": "Karnataka",
      "city": null,
      "operator": null,
      "connector": null,
      "min_power_kw": 142
    },
    "took_ms": 4.1
  }
}`}
          />
        </Section>

        <Section id="station-id" title="GET /v1/stations/{id}" subtitle="One station by integer id.">
          <p className="text-sm text-ink-muted">
            Ids are positive integers. Anything else — <code className="text-xs">1.5</code>,{' '}
            <code className="text-xs">1e3</code>, <code className="text-xs">abc</code> — is rejected with{' '}
            <code className="text-xs">400 INVALID_STATION_ID</code> rather than being truncated to a
            valid id.
          </p>
        </Section>

        <Section
          id="reference"
          title="Reference endpoints"
          subtitle="Dataset-wide facts that need no parameters."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['/v1/states', 'Station and capacity totals per state and union territory, with leading operators.'],
              ['/v1/operators', 'Charge point operators with station counts, sorted by size.'],
              ['/v1/connectors', 'Connector reference: current type, power range, standard and vehicles, plus stations_with_this_connector.'],
              ['/v1/meta', 'Provenance, coverage counts, snapshot date and disclaimer.'],
              ['/v1', 'Self-describing index of endpoints and the active rate limit.'],
              ['/health', 'Liveness probe with uptime.'],
            ].map(([path, description]) => (
              <div key={path} className="card p-4">
                <p className="font-mono text-xs font-medium text-ink">{path}</p>
                <p className="mt-1 text-sm text-ink-muted">{description}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="normalisation"
          title="Input normalisation"
          subtitle="How loosely-typed input is resolved, so you can pass user-entered values safely."
        >
          <ul className="space-y-2 text-sm leading-relaxed text-ink-muted">
            <li>
              <span className="font-medium text-ink">Whitespace and case</span> —{' '}
              <code className="text-xs">state</code>, <code className="text-xs">city</code>,{' '}
              <code className="text-xs">operator</code> and <code className="text-xs">connector</code>{' '}
              are trimmed and compared case-insensitively.
            </li>
            <li>
              <span className="font-medium text-ink">Connector spellings</span> —{' '}
              <code className="text-xs">CCS-2</code>, <code className="text-xs">CCS 2</code>,{' '}
              <code className="text-xs">ccs2</code> and <code className="text-xs">Combo Type 2</code>{' '}
              all resolve to the same standard.
            </li>
            <li>
              <span className="font-medium text-ink">City aliases</span> —{' '}
              <code className="text-xs">Bangalore</code> → Bengaluru, <code className="text-xs">Bombay</code>{' '}
              → Mumbai, <code className="text-xs">Gurgaon</code> → Gurugram,{' '}
              <code className="text-xs">Trivandrum</code> → Thiruvananthapuram, and similar.
            </li>
            <li>
              <span className="font-medium text-ink">State codes</span> — the two-letter code from{' '}
              <code className="text-xs">/v1/states</code> is accepted in place of the full name.
            </li>
          </ul>
        </Section>

        <Section id="errors" title="Error codes">
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-subtle text-xs text-ink-muted">
                  <th className="px-4 py-2.5 font-medium">Code</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {ERROR_CODES.map((row) => (
                  <tr key={row.code} className="bg-surface align-top">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink">{row.code}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-muted">{row.status}</td>
                    <td className="px-4 py-3 text-ink-muted">{row.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <div className="rounded-lg border border-line bg-subtle p-5">
          <h2 className="text-sm font-semibold text-ink">Next steps</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Try the parameters interactively in the playground, then read the integration guides for
            retry handling and server-side filtering.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/playground" className="btn-primary">
              Open the playground
            </Link>
            <Link to="/guides" className="btn-secondary">
              Read the guides
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
