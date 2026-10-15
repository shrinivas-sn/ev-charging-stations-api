import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer, loadEnv } from 'vite';
import {
  buildDatasetSummary,
  resolveSiteUrl,
} from './dataset-summary.mjs';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectDir, 'dist');

const fileEnv = loadEnv('production', projectDir, '');
const siteUrl = resolveSiteUrl(process.env, fileEnv);
const dataset = buildDatasetSummary({ apiBaseUrl: siteUrl });

const escapeXml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]
  );

const escapeAttr = (value) => escapeXml(value);

const template = await fs.readFile(path.join(distDir, 'index.html'), 'utf8');
const vite = await createServer({
  root: projectDir,
  server: { middlewareMode: true },
  appType: 'custom',
  mode: 'production',
});

try {
  const { AppContent } = await vite.ssrLoadModule('/src/App.jsx');
  const { DatasetProvider, readInjectedDataset } = await vite.ssrLoadModule('/src/lib/dataset.jsx');
  const { EV_GUIDES } = await vite.ssrLoadModule('/src/content/guidesData.js');
  const { PAGE_META, NOT_FOUND_META } = await vite.ssrLoadModule('/src/content/pageMeta.js');

  // Titles and descriptions live in src/content/pageMeta.js so the static build
  // and client-side navigation cannot drift apart.
  const mainPages = [
    { route: '/', file: path.join(distDir, 'index.html'), includeWebApi: true },
    { route: '/docs', file: path.join(distDir, 'docs', 'index.html') },
    { route: '/playground', file: path.join(distDir, 'playground', 'index.html') },
    { route: '/guides', file: path.join(distDir, 'guides', 'index.html') },
    { route: '/status', file: path.join(distDir, 'status', 'index.html') },
  ].map((page) => ({ ...page, ...PAGE_META[page.route] }));

  const guidePages = EV_GUIDES.map((guide) => ({
    route: `/guides/${guide.id}`,
    file: path.join(distDir, 'guides', guide.id, 'index.html'),
    title: guide.seoTitle || guide.title,
    description: guide.summary,
    article: {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: guide.title,
      description: guide.summary,
      datePublished: '2026-10-15',
      inLanguage: 'en-IN',
      author: { '@type': 'Organization', name: 'India EV Charging Station Directory API' },
      publisher: { '@type': 'Organization', name: 'India EV Charging Station Directory API' },
      ...(siteUrl ? { mainEntityOfPage: `${siteUrl}/guides/${guide.id}` } : {}),
      ...(siteUrl
        ? { image: `${siteUrl}/og-image.png` }
        : {}),
    },
  }));

  const allPages = [...mainPages, ...guidePages];

  /** Applies every shared head transformation for one page. */
  function renderHead(html, page) {
    const canonical = siteUrl ? new URL(page.route, siteUrl).href : null;
    let output = html;

    // Attribute order is fixed by index.html, but whitespace is not: the regexes
    // tolerate newlines between attributes so the tags can be formatted normally.
    output = output.replace(/<title>[^<]*<\/title>/, `<title>${escapeXml(page.title)}</title>`);
    output = output.replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${escapeAttr(page.description)}" />`
    );
    output = output.replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
      `<meta property="og:title" content="${escapeAttr(page.title)}" />`
    );
    output = output.replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
      `<meta property="og:description" content="${escapeAttr(page.description)}" />`
    );
    output = output.replace(
      /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
      `<meta name="twitter:title" content="${escapeAttr(page.title)}" />`
    );
    output = output.replace(
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
      `<meta name="twitter:description" content="${escapeAttr(page.description)}" />`
    );

    if (canonical) {
      output = output.replace(
        /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
        `<link rel="canonical" href="${escapeAttr(canonical)}" />`
      );
      output = output.replace(
        /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
        `<meta property="og:url" content="${escapeAttr(canonical)}" />`
      );
      output = output.replace(/__SITE_URL__/g, siteUrl);
    } else {
      // Without a configured origin we emit no canonical and no social URLs at
      // all, so nothing points crawlers at a host that is not serving the site.
      const tagPatterns = [
        /[^\S\n]*<link\s+rel="canonical"[\s\S]*?\/?>\n?/,
        /[^\S\n]*<meta\s+property="og:url"[\s\S]*?\/?>\n?/,
        /[^\S\n]*<meta\s+property="og:image(?::width|:height|:alt)?"[\s\S]*?\/?>\n?/,
        /[^\S\n]*<meta\s+name="twitter:image(?::alt)?"[\s\S]*?\/?>\n?/,
      ];
      for (const pattern of tagPatterns) output = output.replace(pattern, '');
    }

    // The WebAPI description belongs on the API landing page, not on every
    // documentation or article page.
    if (!page.includeWebApi || !siteUrl) {
      output = output.replace(/[ \t]*<!--WEBAPI-LD-START-->[\s\S]*?<!--WEBAPI-LD-END-->\n?/, '');
    }

    if (page.article) {
      output = output.replace(
        '</head>',
        `  <script type="application/ld+json">${JSON.stringify(page.article)}</script>\n  </head>`
      );
    }

    output = output.replace(/__SITE_URL__/g, siteUrl || '');
    return output;
  }

  for (const page of allPages) {
    const body = renderToString(
      React.createElement(
        DatasetProvider,
        { value: readInjectedDataset() },
        React.createElement(
          MemoryRouter,
          { initialEntries: [page.route] },
          React.createElement(AppContent)
        )
      )
    );

    const html = renderHead(
      template.replace('<div id="root"></div>', `<div id="root">${body}</div>`),
      page
    );

    await fs.mkdir(path.dirname(page.file), { recursive: true });
    await fs.writeFile(page.file, html);
  }

  // 404.html — served by Vercel with a 404 status for any unmatched path.
  const notFoundBody = renderToString(
    React.createElement(
      DatasetProvider,
      { value: readInjectedDataset() },
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/__not-found__'] },
        React.createElement(AppContent)
      )
    )
  );
  const notFoundHtml = renderHead(
    template.replace('<div id="root"></div>', `<div id="root">${notFoundBody}</div>`),
    { route: '/__not-found__', ...NOT_FOUND_META }
  ).replace('</head>', '  <meta name="robots" content="noindex" />\n  </head>');
  await fs.writeFile(path.join(distDir, '404.html'), notFoundHtml);

  if (siteUrl) {
    const lastmod = new Date().toISOString().slice(0, 10);
    const sitemapEntries = allPages
      .map((page) => {
        const loc = new URL(page.route, siteUrl).href;
        const priority =
          page.route === '/' ? '1.0' : page.route.startsWith('/guides/') ? '0.7' : '0.8';
        return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
      })
      .join('\n');

    await fs.writeFile(
      path.join(distDir, 'sitemap.xml'),
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`
    );

    await fs.writeFile(
      path.join(distDir, 'robots.txt'),
      `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`
    );
  } else {
    // Ensure stale crawler files from a previous configured build cannot ship.
    await fs.rm(path.join(distDir, 'sitemap.xml'), { force: true });
    await fs.rm(path.join(distDir, 'robots.txt'), { force: true });
  }

  console.log(
    `[prerender] Rendered ${allPages.length} pages and 404.html. ${
      siteUrl
        ? `Canonical origin ${siteUrl}; sitemap.xml and robots.txt written.`
        : 'No SITE_URL set: canonical tags, sitemap.xml and robots.txt were omitted.'
    }`
  );
} finally {
  await vite.close();
}
