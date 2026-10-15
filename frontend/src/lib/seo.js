import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { EV_GUIDES } from '../content/guidesData';
import { NOT_FOUND_META, resolvePageMeta } from '../content/pageMeta';
import { useDataset } from './dataset';

function setNamedMeta(name, content) {
  let tag = document.head.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function setPropertyMeta(property, content) {
  let tag = document.head.querySelector(`meta[property="${property}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('property', property);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

/**
 * Keeps document.title, the description and the canonical URL in step with the
 * active route, so a client-side navigation lands on the same metadata the
 * prerendered page would have had.
 */
export function usePageMeta() {
  const { pathname } = useLocation();
  const dataset = useDataset();

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const meta = resolvePageMeta(pathname, EV_GUIDES);
    document.title = meta.title;
    setNamedMeta('description', meta.description);
    setPropertyMeta('og:title', meta.title);
    setPropertyMeta('og:description', meta.description);

    setNamedMeta('robots', meta === NOT_FOUND_META ? 'noindex' : 'index, follow');

    const canonical = document.head.querySelector('link[rel="canonical"]');
    if (canonical) {
      if (dataset.apiBaseUrl) {
        canonical.setAttribute(
          'href',
          pathname === '/' ? `${dataset.apiBaseUrl}/` : `${dataset.apiBaseUrl}${pathname}`
        );
      }
    }
  }, [pathname, dataset.apiBaseUrl]);
}
