import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { formatCount, readInjectedExamples, useDataset } from '../lib/dataset';
import { ENDPOINTS, ERROR_CODES, GUN_RULE, PARAMS } from '../content/apiReference';

const EXAMPLES = readInjectedExamples();

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
                {row.required && (
                  <span className="ml-1.5 text-danger" title="Required">
                    *
                  </span>
                )}
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

function CodeSample({ base, example }) {
  if (!example) return null;
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-line">
        <div className="border-b border-line bg-subtle px-4 py-2 text-xs font-medium text-ink-muted">Request</div>
        <pre className="code-block rounded-none border-0">
          <code>{`curl -s "${base}${example.request}"`}</code>
        </pre>
      </div>
      <div className="overflow-hidden rounded-lg border border-line">
        <div className="border-b border-line bg-subtle px-4 py-2 text-xs font-medium text-ink-muted">
          Response · {example.status} · generated from the API at build time
        </div>
        <pre className="code-block max-h-[28rem] rounded-none border-0">
          <code>{JSON.stringify(example.response, null, 2)}</code>
        </pre>
      </div>
    </div>
  );
}

const STATION_FIELDS = [
  ['id', 'Stable id: evs_ + 10 hex digits, derived from operator and coordinates.'],
  ['operator, ownership', 'Charge point operator and govt or private, as published.'],
  ['state, state_code, district, city, address', 'Location as published by BEE; state names and codes follow ISO 3166-2:IN.'],
  ['latitude, longitude', 'As published. Check location_quality before routing a driver there.'],
  ['location_quality', 'ok, or suspect when the coordinates are impossible (latitude equal to longitude, or outside India).'],
  ['mixed_admin', 'true when BEE lists the same station with different district or city spellings.'],
  ['chargers[]', 'One entry per distinct charger: type_raw (as published), standards, lev_variant, charger_kw (charger total), connectors_per_charger, guns[] and count (identical chargers at the site).'],
  ['chargers[].guns[]', '{ standard, kw }: the power one gun delivers to one vehicle.'],
  ['max_power_kw, max_kw_by_standard', 'Highest single-gun power, overall and per standard.'],
  ['standards, currents, vehicle_classes', 'Everything the station offers, as sorted lists.'],
  ['total_chargers, total_connectors', 'Chargers and guns at the site.'],
  ['distance_km', 'Only on /v1/stations/near: great-circle distance from the search point, 2 decimals.'],
  ['source', 'Only on /v1/stations/{id}: the PDF pages and row count this station came from.'],
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
          Every endpoint is a <code className="text-xs">GET</code> returning JSON. This page documents what
          the API actually does; every example response below was produced by the API&apos;s own code
          when this site was built.
        </p>
        <div className="mt-3 rounded-lg border border-line bg-subtle px-4 py-3 text-sm text-ink-muted">
          <p>
            {formatCount(dataset.totalStations)} stations and {formatCount(dataset.totalChargers)} chargers
            from{' '}
            <a className="text-accent hover:text-accent-strong" href={dataset.sourcePageUrl || '#'} rel="noopener noreferrer" target="_blank">
              {dataset.sourceTitle}
            </a>
            .
          </p>
          <p className="mt-1 text-xs">{dataset.attribution}</p>
        </div>
      </header>

      <nav className="mt-8 flex flex-wrap gap-2 border-b border-line pb-6 text-sm">
        {[
          ['conventions', 'Conventions'],
          ['power', 'Power and vehicles'],
          ['near', 'Radius search'],
          ['stations', 'Directory'],
          ['station-id', 'Station by id'],
          ['cities', 'Cities'],
          ['reference', 'Reference endpoints'],
          ['fields', 'Station fields'],
          ['errors', 'Errors'],
        ].map(([anchor, label]) => (
          <a key={anchor} href={`#${anchor}`} className="chip hover:border-line-strong hover:text-ink">
            {label}
          </a>
        ))}
      </nav>

      <div className="mt-10 space-y-14">
        <Section id="conventions" title="Conventions" subtitle="Behaviour shared by every endpoint.">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['Base URL', base || 'resolved at runtime'],
              ['Authentication', 'None. No keys, headers or sign-up.'],
              ['CORS', 'Access-Control-Allow-Origin: *'],
              ['Rate limit', '100 requests per 15 minutes per client address. A 429 carries Retry-After in seconds.'],
              ['Caching', 'Successful responses and 404s are cacheable for an hour (s-maxage=3600); errors are no-store.'],
              ['Attribution', 'Every success response carries meta.attribution and meta.source. Keep the attribution when you show this data.'],
            ].map(([label, value]) => (
              <div key={label} className="card p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-dim">{label}</p>
                <p className="mt-1 break-words text-sm text-ink-muted">{value}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-ink-muted">
            Nothing is silently ignored: an unknown parameter, a repeated parameter or a malformed number is a{' '}
            <code className="text-xs">400</code>, and an unknown value for an enum-like filter is a{' '}
            <code className="text-xs">404</code> that lists the valid values.
          </p>
        </Section>

        <Section id="power" title="Power and vehicles" subtitle="How the filters answer “can my vehicle charge here, and how fast?”">
          <ul className="space-y-2 text-sm leading-relaxed text-ink-muted">
            <li>
              BEE lists one row per charger. A charger has one or more <span className="font-medium text-ink">guns</span>, and
              a vehicle draws the gun&apos;s rating, not the charger total: a Bharat AC-001 charger is 10 kW but each gun gives
              3.3 kW. <code className="text-xs">min_power_kw</code> and <code className="text-xs">max_power_kw</code> use gun power.
            </li>
            <li>
              Which vehicles a standard serves comes from the Ministry of Power charger table: CCS2 and CHAdeMO serve cars;
              Type 2 AC, Bharat AC-001 and Bharat DC-001 serve cars and two/three-wheelers; light-EV (LEV) points serve
              two/three-wheelers. {formatCount(dataset.twoThreeWheelerOnlyStations)} stations serve only two/three-wheelers.
            </li>
            <li>{GUN_RULE}</li>
          </ul>
        </Section>

        <Section id="near" title="GET /v1/stations/near" subtitle="Stations within a radius of a point, nearest first.">
          <ParamTable rows={PARAMS.near} />
          <p className="text-sm text-ink-muted">
            Stations with suspect coordinates are never returned here. Filters apply before sorting and paging, so{' '}
            <code className="text-xs">total_found</code> counts every match inside the radius. Example: the nearest
            station where a car can draw at least 50 kW DC, from central Bengaluru.
          </p>
          <CodeSample base={base} example={EXAMPLES && EXAMPLES.near} />
        </Section>

        <Section id="stations" title="GET /v1/stations" subtitle="The whole directory, filtered and paged.">
          <ParamTable rows={PARAMS.stations} />
          <CodeSample base={base} example={EXAMPLES && EXAMPLES.stations} />
        </Section>

        <Section id="station-id" title="GET /v1/stations/{id}" subtitle="One station, with the PDF pages it was read from.">
          <p className="text-sm text-ink-muted">
            Ids look like <code className="text-xs">evs_1a2b3c4d5e</code> and stay the same when BEE publishes a new
            list, as long as the operator and coordinates do not change. Anything else is a{' '}
            <code className="text-xs">400 INVALID_STATION_ID</code>.
          </p>
          <CodeSample base={base} example={EXAMPLES && EXAMPLES.station} />
        </Section>

        <Section id="cities" title="GET /v1/cities" subtitle="Valid city values, with district and station count.">
          <ParamTable rows={PARAMS.cities} />
          <CodeSample base={base} example={EXAMPLES && EXAMPLES.cities} />
          <p className="text-xs text-ink-dim">Response shortened to three cities.</p>
        </Section>

        <Section id="reference" title="Reference endpoints" subtitle="Every endpoint at a glance.">
          <div className="grid gap-4 sm:grid-cols-2">
            {ENDPOINTS.map((endpoint) => (
              <div key={endpoint.path} className="card p-4">
                <p className="font-mono text-xs font-medium text-ink">{endpoint.path}</p>
                <p className="mt-1 text-sm text-ink-muted">{endpoint.description}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="fields" title="Station fields">
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
              <tbody className="divide-y divide-line">
                {STATION_FIELDS.map(([field, meaning]) => (
                  <tr key={field} className="bg-surface align-top">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink">{field}</td>
                    <td className="px-4 py-3 text-ink-muted">{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-ink-muted">
            Known problems in the source and how they are handled are listed in the{' '}
            <a className="text-accent hover:text-accent-strong" href={dataset.dataNotesUrl || '#'} rel="noopener noreferrer" target="_blank">
              data notes
            </a>
            .
          </p>
        </Section>

        <Section id="errors" title="Errors">
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
          <CodeSample base={base} example={EXAMPLES && EXAMPLES.error} />
        </Section>

        <div className="rounded-lg border border-line bg-subtle p-5">
          <h2 className="text-sm font-semibold text-ink">Next steps</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Try the filters in the playground, or read the guides on route planning and charging standards.
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
