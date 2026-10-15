import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { buildDatasetSummary, resolveSiteUrl } from './scripts/dataset-summary.mjs';

const API_PROXY = {
  '/v1': 'http://localhost:3000',
  '/health': 'http://localhost:3000',
};

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), '');
  const siteUrl = resolveSiteUrl(process.env, fileEnv);

  // Read once at config time: the same summary feeds static rendering and the
  // browser bundle, so the UI can never drift from backend/data.
  const dataset = buildDatasetSummary({ apiBaseUrl: siteUrl });

  if (!siteUrl) {
    console.warn(
      '[vite] SITE_URL is not set. Canonical tags, sitemap.xml and robots.txt will be omitted. ' +
        'Set SITE_URL (see .env.example) before a production build.'
    );
  }

  return {
    plugins: [react()],
    define: {
      __EV_DATASET__: JSON.stringify(dataset),
    },
    server: {
      port: 5173,
      proxy: API_PROXY,
    },
    // Lets `npm run preview` serve the built output against a local API, so the
    // production build can be exercised before deploying.
    preview: {
      port: 4173,
      proxy: API_PROXY,
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  };
});
