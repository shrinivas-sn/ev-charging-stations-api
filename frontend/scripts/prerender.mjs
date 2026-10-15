import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer, loadEnv } from 'vite';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectDir, 'dist');
const fileEnv = loadEnv('production', projectDir, '');
const productionHost = process.env.SITE_URL || fileEnv.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) || 'https://ev-charging-stations-api.vercel.app';
const siteUrl = new URL(productionHost);

const escapeXml = (value) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const template = await fs.readFile(path.join(distDir, 'index.html'), 'utf8');
const vite = await createServer({ root: projectDir, server: { middlewareMode: true }, appType: 'custom', mode: 'production' });

try {
  const { AppContent } = await vite.ssrLoadModule('/src/App.jsx');
  const { EV_GUIDES } = await vite.ssrLoadModule('/src/content/guidesData.js');

  const mainPages = [
    {
      route: '/',
      file: path.join(distDir, 'index.html'),
      title: 'India EV Charging Station Directory API — Free Public API',
      description: 'Free keyless REST API for 27,000+ public electric vehicle charging stations across India. Spatial proximity queries, CCS-2, Type-2, and Bharat DC-001 specs.'
    },
    {
      route: '/docs',
      file: path.join(distDir, 'docs', 'index.html'),
      title: 'API Documentation & Endpoints — India EV Charging API',
      description: 'Complete REST endpoint specifications, request parameters, rate limits, and JSON schemas for Indian EV charging stations.'
    },
    {
      route: '/playground',
      file: path.join(distDir, 'playground', 'index.html'),
      title: 'Interactive Station Playground — India EV Charging API',
      description: 'Test Indian electric vehicle charging station proximity queries live in your browser across Delhi, Bengaluru, Mumbai, and 36 States/UTs.'
    },
    {
      route: '/guides',
      file: path.join(distDir, 'guides', 'index.html'),
      title: 'Technical EV Guides & Specs — India EV Charging API',
      description: 'Authoritative guides on Indian EV highway route planning, BIS charging standards (IS 17017, AIS 138), and developer integration patterns.'
    },
    {
      route: '/status',
      file: path.join(distDir, 'status', 'index.html'),
      title: 'Service Status & Upstream Parity — India EV Charging API',
      description: 'Operational uptime, upstream BEE/data.gov.in data parity, and latest dataset snapshot synchronization metrics.'
    }
  ];

  const guidePages = EV_GUIDES.map((g) => ({
    route: `/guides/${g.id}`,
    file: path.join(distDir, 'guides', g.id, 'index.html'),
    title: `${g.title.slice(0, 50)} — India EV Charging API`,
    description: g.summary,
    article: {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      'headline': g.title,
      'description': g.summary,
      'datePublished': '2026-10-15T00:00:00.000Z',
      'author': {
        '@type': 'Organization',
        'name': 'India EV Charging Station Directory API'
      },
      'publisher': {
        '@type': 'Organization',
        'name': 'India EV Charging Station Directory API'
      }
    }
  }));

  const allPages = [...mainPages, ...guidePages];

  for (const page of allPages) {
    const body = renderToString(React.createElement(MemoryRouter, { initialEntries: [page.route] }, React.createElement(AppContent)));
    const canonical = new URL(page.route, siteUrl).href;
    let html = template
      .replace('<div id="root"></div>', `<div id="root">${body}</div>`)
      .replace(/<title>[^<]*<\/title>/, `<title>${escapeXml(page.title)}</title>`)
      .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${escapeXml(page.description)}" />`)
      .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${escapeXml(canonical)}" />`)
      .replace(/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${escapeXml(canonical)}" />`);

    if (page.article) {
      const ldJson = `<script type="application/ld+json">${JSON.stringify(page.article)}</script>`;
      html = html.replace('</head>', `  ${ldJson}\n  </head>`);
    }

    await fs.mkdir(path.dirname(page.file), { recursive: true });
    await fs.writeFile(page.file, html);
  }

  // 404.html: Vercel serves it with status 404 for any path no file or rewrite matches.
  const notFoundBody = renderToString(React.createElement(MemoryRouter, { initialEntries: ['/__not-found__'] }, React.createElement(AppContent)));
  const notFoundHtml = template
    .replace('<div id="root"></div>', `<div id="root">${notFoundBody}</div>`)
    .replace(/<title>[^<]*<\/title>/, '<title>Page Not Found — India EV Charging API</title>')
    .replace(/<meta name="description" content="[^"]*"\s*\/>/, '<meta name="description" content="The requested documentation or explorer page does not exist." />')
    .replace(/\s*<link rel="canonical" href="[^"]*"\s*\/?>/, '')
    .replace(/\s*<meta property="og:url" content="[^"]*"\s*\/?>/, '')
    .replace('</head>', '  <meta name="robots" content="noindex" />\n  </head>');
  await fs.writeFile(path.join(distDir, '404.html'), notFoundHtml);

  // Generate sitemap.xml with all canonical pages
  const sitemapEntries = allPages.map((page) => {
    const loc = new URL(page.route, siteUrl).href;
    const priority = page.route === '/' ? '1.0' : page.route.startsWith('/guides/') ? '0.7' : '0.8';
    return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>2026-10-15</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
  }).join('\n');

  await fs.writeFile(
    path.join(distDir, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`
  );

  // Generate robots.txt
  await fs.writeFile(
    path.join(distDir, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl.href}sitemap.xml\n`
  );

  console.log(`[prerender] Rendered ${allPages.length} static pages, 404.html, sitemap.xml & robots.txt.`);
} finally {
  await vite.close();
}
