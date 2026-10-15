import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Overview', end: true },
  { to: '/docs', label: 'API reference' },
  { to: '/playground', label: 'Playground' },
  { to: '/guides', label: 'Guides' },
  { to: '/status', label: 'Status' },
];

function navClass({ isActive }) {
  return `rounded-md px-2.5 py-1.5 text-sm transition-colors ${
    isActive ? 'bg-subtle font-semibold text-ink' : 'text-ink-muted hover:bg-subtle hover:text-ink'
  }`;
}

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span
            aria-hidden="true"
            className="flex h-7 w-7 items-center justify-center rounded-md bg-ink"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-accent">
              <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" />
            </svg>
          </span>
          <span className="text-sm font-semibold tracking-tight text-ink">
            India EV Charging API
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={navClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="https://github.com/shrinivas-sn/ev-charging-stations-api"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1.5 rounded-md border border-line-strong px-2.5 py-1.5 text-sm text-ink-muted transition-colors hover:bg-subtle hover:text-ink sm:flex"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
            </svg>
            Source
          </a>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label="Toggle navigation"
            className="rounded-md border border-line-strong p-1.5 text-ink-muted md:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-current" fill="none" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-line bg-surface px-4 py-2 md:hidden">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block rounded-md px-2 py-2 text-sm ${
                  isActive ? 'bg-subtle font-semibold text-ink' : 'text-ink-muted'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
