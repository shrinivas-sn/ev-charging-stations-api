import React, { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../lib/api';
import { formatCount, formatMs, useDataset } from '../lib/dataset';

function Row({ label, value, note }) {
  return (
    <div className="grid gap-1 border-b border-line px-4 py-3 last:border-0 sm:grid-cols-3 sm:items-baseline">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-sm font-medium text-ink sm:col-span-1">{value}</dd>
      <dd className="text-xs text-ink-dim">{note || ''}</dd>
    </div>
  );
}

export default function StatusPage() {
  const dataset = useDataset();
  const [health, setHealth] = useState(null);
  const [meta, setMeta] = useState(null);
  const [probe, setProbe] = useState({ state: 'idle', roundTripMs: null, serverMs: null, found: null });
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [healthBody, metaBody] = await Promise.all([apiGet('/health'), apiGet('/v1/meta')]);
      setHealth(healthBody);
      setMeta(metaBody.data);
    } catch (caught) {
      setError(caught);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runProbe = useCallback(async () => {
    setProbe({ state: 'running', roundTripMs: null, serverMs: null, found: null });
    const startedAt = performance.now();
    try {
      const body = await apiGet('/v1/stations/near?lat=12.9716&lng=77.5946&radius=20&limit=25');
      setProbe({
        state: 'done',
        roundTripMs: Number((performance.now() - startedAt).toFixed(1)),
        serverMs: body.meta.took_ms,
        found: body.meta.total_found,
      });
    } catch (caught) {
      setError(caught);
      setProbe({ state: 'error', roundTripMs: null, serverMs: null, found: null });
    }
  }, []);

  const online = Boolean(health && health.status === 'ok');

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Status and dataset
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Live values read from the running service. Nothing on this page is a fixed claim: if a
          probe fails it says so.
        </p>
      </header>

      <section className="card mt-8">
        <div className="card-header">
          <h2 className="text-sm font-semibold text-ink">Service</h2>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
              online ? 'bg-ok/10 text-ok' : 'bg-subtle text-ink-muted'
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-ok' : 'bg-ink-dim'}`}
            />
            {health ? (online ? 'Responding' : 'Degraded') : 'Checking…'}
          </span>
        </div>
        <dl>
          <Row label="Health endpoint" value="/health" note="Returns 200 with status ok when the service is up." />
          <Row
            label="Service version"
            value={health ? health.version : '—'}
            note={health ? health.service : 'Waiting for response'}
          />
          <Row
            label="Uptime"
            value={health ? `${health.uptime_seconds}s` : '—'}
            note="Process uptime since the current instance started."
          />
          <Row
            label="Stations indexed"
            value={formatCount(health ? health.stations_indexed : null)}
            note="Counted from the loaded dataset, not from configuration."
          />
        </dl>
      </section>

      <section className="card mt-6">
        <div className="card-header">
          <h2 className="text-sm font-semibold text-ink">Latency probe</h2>
          <button type="button" className="btn-secondary" onClick={runProbe}>
            {probe.state === 'running' ? 'Running…' : 'Run probe'}
          </button>
        </div>
        <dl>
          <Row
            label="Round trip"
            value={probe.roundTripMs !== null ? formatMs(probe.roundTripMs) : '—'}
            note="Measured in your browser, so it includes network time. Run the probe to see your own figure."
          />
          <Row
            label="Server time"
            value={probe.serverMs !== null ? formatMs(probe.serverMs) : '—'}
            note="meta.took_ms: the API's own processing time for the query."
          />
          <Row
            label="Probe query"
            value="Bengaluru, 20 km radius"
            note={
              probe.found !== null
                ? `${formatCount(probe.found)} stations matched inside the radius`
                : 'Also validates 429 handling and error envelopes'
            }
          />
        </dl>
        <p className="border-t border-line px-4 py-3 text-xs text-ink-dim">
          Earlier versions of this page published a fixed &ldquo;&lt; 3.8 ms&rdquo; figure and an SLO
          table. Those were not measurements, so they have been removed.
        </p>
      </section>

      <section className="card mt-6">
        <div className="card-header">
          <h2 className="text-sm font-semibold text-ink">Dataset provenance</h2>
          <span className="chip">{meta ? meta.dataset_status : dataset.datasetStatus || '—'}</span>
        </div>

        <div className="border-b border-line bg-subtle px-4 py-3">
          <p className="text-sm leading-relaxed text-ink-muted">
            <span className="font-semibold text-ink">
              {meta && meta.provenance && meta.provenance.is_official
                ? 'Official data.'
                : 'This is generated sample data, not official Government of India data.'}
            </span>{' '}
            {meta && meta.provenance ? meta.provenance.summary : ''}
          </p>
        </div>

        <dl>
          <Row
            label="Snapshot date"
            value={(meta && meta.snapshot_date) || dataset.snapshotDate || '—'}
            note="Date the bundled dataset was generated."
          />
          <Row
            label="Stations"
            value={formatCount(meta ? meta.total_stations : dataset.totalStations)}
            note="Records served by /v1/stations."
          />
          <Row
            label="States &amp; union territories"
            value={formatCount(meta ? meta.total_states : dataset.totalStates)}
            note="Distinct state and UT values present."
          />
          <Row
            label="Cities and districts"
            value={`${formatCount(meta && meta.total_cities)} / ${formatCount(meta && meta.total_districts)}`}
            note="Distinct city and district values present."
          />
          <Row
            label="Charge point operators"
            value={formatCount(meta && meta.total_operators)}
            note="Distinct operators present."
          />
          {meta && meta.provenance && meta.provenance.target_source && (
            <Row
              label="Intended source"
              value={meta.provenance.target_source.publisher}
              note={`${meta.provenance.target_source.name} — ${meta.provenance.target_source.license}. Not yet ingested.`}
            />
          )}
        </dl>
      </section>

      {error && (
        <div className="mt-6 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm" role="alert">
          <p className="font-medium text-danger">Could not read live status</p>
          <p className="mt-1 text-ink-muted">{error.message}</p>
          <button type="button" className="btn-secondary mt-3" onClick={load}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
