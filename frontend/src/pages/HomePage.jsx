import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatCount, useDataset } from '../lib/dataset';
import { ENDPOINTS } from '../content/apiReference';
import { vehicleLabel } from '../lib/stations';

const QUESTIONS = [
  {
    question: 'Where can my car fast-charge near me?',
    query: '/v1/stations/near?lat=12.9716&lng=77.5946&vehicle=car&current=dc&min_power_kw=50',
  },
  {
    question: 'Which stations does an electric scooter or auto-rickshaw use in Pune?',
    query: '/v1/stations?city=Pune&vehicle=two_three_wheeler',
  },
  {
    question: 'Who runs the CCS2 chargers in Kerala?',
    query: '/v1/stations?state=KL&connector=CCS2',
  },
];

export default function HomePage() {
  const dataset = useDataset();
  const [copied, setCopied] = useState(false);

  const apiBase = useMemo(() => {
    if (dataset.apiBaseUrl) return dataset.apiBaseUrl;
    if (typeof window !== 'undefined') return window.location.origin;
    return '';
  }, [dataset.apiBaseUrl]);

  const example = dataset.exampleStation;
  const curl = example ? `curl -s "${apiBase}/v1/stations/${example.id}"` : `curl -s "${apiBase}/v1/stations?limit=1"`;

  // Exactly what GET /v1/stations/{id} returns for the example station.
  const sampleResponse = useMemo(() => {
    if (!example) return '{}';
    return JSON.stringify(
      {
        success: true,
        data: example,
        meta: {
          source: {
            name: dataset.sourceTitle,
            publisher: dataset.sourcePublisher,
            url: dataset.sourceUrl,
            snapshot_label: dataset.snapshotLabel,
          },
          attribution: dataset.attribution,
        },
      },
      null,
      2
    );
  }, [example, dataset]);

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
    { label: 'Chargers', value: formatCount(dataset.totalChargers) },
    { label: 'Car fast-DC stations (≥ 50 kW)', value: formatCount(dataset.carFastDcStations) },
    { label: 'Two/three-wheeler only', value: formatCount(dataset.twoThreeWheelerOnlyStations) },
    { label: 'States & UTs', value: formatCount(dataset.totalStates) },
    { label: 'Operators', value: formatCount(dataset.totalOperators) },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-8">
      <section className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            India EV charging station directory API
          </h1>
          <p className="mt-4 max-w-prose text-base leading-relaxed text-ink-muted">
            Every public charging station on the Bureau of Energy Efficiency&apos;s list, as a REST API. Ask
            what a driver actually needs: which stations near a point have a gun their vehicle can use, at
            what power, run by whom. Half of India&apos;s listed stations only serve two- and
            three-wheelers; this API tells them apart.
          </p>

          <div className="mt-5 rounded-lg border border-line bg-subtle px-4 py-3">
            <p className="text-sm leading-relaxed text-ink-muted">
              <span className="font-semibold text-ink">Source:</span> {dataset.sourceTitle}, published by the
              Bureau of Energy Efficiency (BEE). No real-time availability, prices or opening hours — the source
              does not have them.
            </p>
            <p className="mt-2 text-sm">
              <Link to="/status" className="link">
                Source, coverage and known data problems →
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
              <span className="hint">{dataset.snapshotLabel || 'snapshot unknown'}</span>
            </div>
            <dl className="grid grid-cols-2 gap-px bg-line">
              {facts.map((fact) => (
                <div key={fact.label} className="bg-surface px-4 py-3">
                  <dt className="text-xs text-ink-dim">{fact.label}</dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums text-ink">{fact.value}</dd>
                </div>
              ))}
            </dl>
            <div className="border-t border-line px-4 py-3">
              <p className="text-xs text-ink-dim">Every count is read from the dataset when the site is built.</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-ink">Questions it answers</h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-3">
          {QUESTIONS.map((item) => (
            <li key={item.query} className="card p-4">
              <p className="text-sm font-medium text-ink">{item.question}</p>
              <code className="mt-2 block break-all text-xs text-ink-muted">{item.query}</code>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-ink">Quick start</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Every endpoint is a plain <code className="text-xs">GET</code> that returns JSON. No headers are
          required.
          {example && ` This station serves: ${vehicleLabel(example.vehicle_classes).toLowerCase()}.`}
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
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium text-ink">{endpoint.path}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">{endpoint.params}</td>
                  <td className="px-4 py-3 text-ink-muted">{endpoint.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-ink-muted">
          Invalid input is never silently ignored: a malformed or unknown parameter is a{' '}
          <code className="text-xs">400</code>, an unknown value is a <code className="text-xs">404</code> that lists
          the valid ones.{' '}
          <Link to="/docs" className="link">
            Full reference →
          </Link>
        </p>
      </section>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">States with the most stations</h2>
          <p className="mt-1 text-sm text-ink-muted">
            From <code className="text-xs">/v1/states</code>.
          </p>
          <div className="mt-4 overflow-hidden rounded-lg border border-line">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-subtle text-xs text-ink-muted">
                  <th className="px-4 py-2.5 font-medium">State / UT</th>
                  <th className="px-4 py-2.5 text-right font-medium">Stations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {dataset.topStates.map((state) => (
                  <tr key={state.code} className="bg-surface">
                    <td className="px-4 py-3 font-medium text-ink">{state.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-muted">{formatCount(state.stations)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">Charging standards</h2>
          <p className="mt-1 text-sm text-ink-muted">
            From <code className="text-xs">/v1/connectors</code>. Vehicles served follow the Ministry of Power charger
            table.
          </p>
          <div className="mt-4 overflow-x-auto rounded-lg border border-line">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-subtle text-xs text-ink-muted">
                  <th className="px-4 py-2.5 font-medium">Standard</th>
                  <th className="px-4 py-2.5 font-medium">Current</th>
                  <th className="px-4 py-2.5 font-medium">Vehicles</th>
                  <th className="px-4 py-2.5 text-right font-medium">Stations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {dataset.connectors.map((connector) => (
                  <tr key={connector.id} className="bg-surface">
                    <td className="px-4 py-3">
                      <span className="font-medium text-ink">{connector.name}</span>
                      <span className="mt-0.5 block font-mono text-[11px] text-ink-dim">{connector.id}</span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{connector.current}</td>
                    <td className="px-4 py-3 text-xs text-ink-muted">{vehicleLabel(connector.vehicle_classes)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-muted">{formatCount(connector.stations)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
