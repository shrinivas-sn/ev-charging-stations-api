import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { EV_GUIDES } from '../content/guidesData';

/** Renders the very small Markdown subset used by the guide content. */
function GuideBody({ content }) {
  const blocks = content.split('\n\n').filter((block) => block.trim() !== '');

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        if (block.startsWith('## ')) {
          return (
            <h2 key={index} className="pt-4 text-lg font-semibold tracking-tight text-ink">
              {block.slice(3)}
            </h2>
          );
        }
        if (block.startsWith('### ')) {
          return (
            <h3 key={index} className="pt-2 text-base font-semibold text-ink">
              {block.slice(4)}
            </h3>
          );
        }
        if (block.startsWith('```')) {
          const lines = block.split('\n');
          const language = lines[0].replace('```', '').trim();
          return (
            <figure key={index} className="overflow-hidden rounded-lg border border-line">
              <figcaption className="border-b border-line bg-subtle px-3 py-1.5 text-xs font-medium text-ink-muted">
                {language || 'code'}
              </figcaption>
              <pre className="code-block rounded-none border-0">
                <code>{lines.slice(1, -1).join('\n')}</code>
              </pre>
            </figure>
          );
        }
        if (/^[-*] /.test(block)) {
          const items = block.split('\n').filter((line) => /^[-*] /.test(line));
          return (
            <ul key={index} className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-muted">
              {items.map((item, itemIndex) => (
                <li
                  key={itemIndex}
                  dangerouslySetInnerHTML={{
                    __html: item
                      .slice(2)
                      .replace(/`([^`]+)`/g, '<code class="text-xs">$1</code>')
                      .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-ink">$1</strong>'),
                  }}
                />
              ))}
            </ul>
          );
        }
        return (
          <p
            key={index}
            className="text-sm leading-relaxed text-ink-muted"
            dangerouslySetInnerHTML={{
              __html: block
                .replace(/`([^`]+)`/g, '<code class="text-xs">$1</code>')
                .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-ink">$1</strong>'),
            }}
          />
        );
      })}
    </div>
  );
}

export default function GuidesPage() {
  const { id } = useParams();

  if (id) {
    const guide = EV_GUIDES.find((entry) => entry.id === id);

    if (!guide) {
      return (
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-xl font-semibold text-ink">Guide not found</h1>
          <p className="mt-2 text-sm text-ink-muted">
            There is no guide with the id <code className="text-xs">{id}</code>.
          </p>
          <Link to="/guides" className="btn-secondary mt-5">
            Back to guides
          </Link>
        </div>
      );
    }

    return (
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <nav className="text-sm text-ink-dim">
          <Link to="/guides" className="hover:text-accent">
            Guides
          </Link>
          <span className="px-1.5">/</span>
          <span className="text-ink-muted">{guide.category}</span>
        </nav>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {guide.title}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-muted">{guide.summary}</p>
        <p className="mt-2 text-xs text-ink-dim">{guide.readTime}</p>

        <hr className="my-8 border-line" />

        <GuideBody content={guide.content} />

        <div className="mt-10 border-t border-line pt-6">
          <Link to="/guides" className="btn-secondary">
            Back to guides
          </Link>
        </div>
      </article>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Guides</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Practical notes on spatial queries, Indian connector standards and integrating the API in
          Python and Node.js. Every example runs against a local server started with{' '}
          <code className="text-xs">npm start</code>.
        </p>
      </header>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {EV_GUIDES.map((guide) => (
          <Link
            key={guide.id}
            to={`/guides/${guide.id}`}
            className="card flex flex-col p-5 transition-colors hover:border-line-strong"
          >
            <span className="text-xs font-medium text-accent-strong">{guide.category}</span>
            <h2 className="mt-2 text-base font-semibold leading-snug text-ink">{guide.title}</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">{guide.summary}</p>
            <span className="mt-4 text-xs text-ink-dim">{guide.readTime}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
