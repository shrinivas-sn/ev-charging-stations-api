/**
 * Per-route titles and descriptions.
 *
 * This is the single source for both the prerenderer (static HTML) and the SPA
 * (client-side navigation), so the two can never disagree.
 *
 * Titles are kept under 60 characters and descriptions between 50 and 160, which
 * is the range search results usually display.
 */
export const SITE_NAME = 'India EV Charging Station Directory API';

export const PAGE_META = {
  '/': {
    title: 'India EV Charging Station Directory API',
    description:
      'Keyless REST API for India’s public EV charging stations from BEE: radius search with vehicle, AC/DC, charging standard and per-gun power filters.',
  },
  '/docs': {
    title: 'API reference — India EV Charging Station API',
    description:
      'Endpoint reference for the India EV Charging Station API: parameters, validation rules, error codes, rate limits and full JSON response shapes.',
  },
  '/playground': {
    title: 'Radius search playground — India EV Charging API',
    description:
      'Run live radius searches over India’s public EV charging stations. Filter by vehicle, AC/DC, standard and power, and see every match on a map.',
  },
  '/guides': {
    title: 'Integration guides — India EV Charging API',
    description:
      'Guides to building an EV route planner, understanding Indian charging connector standards, and integrating the API in Python and Node.js.',
  },
  '/status': {
    title: 'Status and dataset — India EV Charging API',
    description:
      'Live service status, a latency probe you can run, and the source, coverage and known data problems of the BEE charging station list.',
  },
};

export const NOT_FOUND_META = {
  title: 'Page not found — India EV Charging API',
  description:
    'The requested page does not exist. Browse the API reference, the radius search playground or the integration guides instead.',
};

/**
 * Resolves the metadata for a pathname, including guide article routes.
 * `guides` is the EV_GUIDES array, passed in so this module has no import cycle.
 */
export function resolvePageMeta(pathname, guides = []) {
  const guideMatch = /^\/guides\/(.+?)\/?$/.exec(pathname);
  if (guideMatch) {
    const guide = guides.find((entry) => entry.id === guideMatch[1]);
    if (guide) {
      return { title: guide.seoTitle || guide.title, description: guide.summary };
    }
    return NOT_FOUND_META;
  }
  return PAGE_META[pathname] || NOT_FOUND_META;
}
