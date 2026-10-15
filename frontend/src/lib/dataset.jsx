import React, { createContext, useContext } from 'react';

/**
 * Dataset facts are injected at build time from backend/data/ (see
 * vite.config.js and scripts/dataset-summary.mjs) so nothing is hard-coded in
 * the UI and the static HTML carries the same numbers the API serves.
 */
export const EMPTY_DATASET = {
  totalStations: null,
  totalStates: null,
  totalCities: null,
  totalOperators: null,
  snapshotDate: null,
  datasetStatus: null,
  datasetLabel: null,
  isOfficial: false,
};

const DatasetContext = createContext(EMPTY_DATASET);

export function DatasetProvider({ value, children }) {
  return <DatasetContext.Provider value={value || EMPTY_DATASET}>{children}</DatasetContext.Provider>;
}

export function useDataset() {
  return useContext(DatasetContext);
}

/**
 * The dataset summary is injected at build time by vite.config.js (and applies to
 * static rendering too). Guarded with typeof because the token is replaced
 * textually and may be absent in an unusual toolchain.
 */
export function readInjectedDataset() {
  try {
    // eslint-disable-next-line no-undef
    return typeof __EV_DATASET__ === 'undefined' ? null : __EV_DATASET__;
  } catch {
    return null;
  }
}

/** Formats a count, or an em dash when the value is not known yet. */
export function formatCount(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return value.toLocaleString('en-IN');
}

/** Formats a millisecond measurement honestly, without inventing precision. */
export function formatMs(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return value < 10 ? `${value.toFixed(1)} ms` : `${Math.round(value)} ms`;
}
