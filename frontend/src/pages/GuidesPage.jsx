import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { EV_GUIDES } from '../content/guidesData';

export default function GuidesPage() {
  const { id } = useParams();

  if (id) {
    const guide = EV_GUIDES.find((g) => g.id === id);

    if (!guide) {
      return (
        <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
          <h1 className="text-3xl font-bold text-white">Guide Not Found</h1>
          <p className="text-slate-400">The requested guide does not exist.</p>
          <Link to="/guides" className="text-emerald-400 underline">Back to all guides</Link>
        </div>
      );
    }

    return (
      <article className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div className="space-y-4 border-b border-slate-800 pb-8">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
              {guide.category}
            </span>
            <span className="text-xs text-slate-400">{guide.readTime}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {guide.title}
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            {guide.summary}
          </p>
        </div>

        <div className="prose prose-invert max-w-none text-slate-300 space-y-6 text-sm sm:text-base leading-relaxed">
          {guide.content.split('\n\n').map((paragraph, idx) => {
            if (paragraph.startsWith('## ')) {
              return <h2 key={idx} className="text-2xl font-bold text-white pt-4">{paragraph.replace('## ', '')}</h2>;
            }
            if (paragraph.startsWith('### ')) {
              return <h3 key={idx} className="text-lg font-bold text-emerald-400 pt-2">{paragraph.replace('### ', '')}</h3>;
            }
            if (paragraph.startsWith('```')) {
              const lines = paragraph.split('\n');
              const code = lines.slice(1, -1).join('\n');
              return (
                <pre key={idx} className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm font-mono overflow-x-auto text-emerald-300">
                  {code}
                </pre>
              );
            }
            return <p key={idx}>{paragraph}</p>;
          })}
        </div>

        <div className="pt-8 border-t border-slate-800">
          <Link to="/guides" className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-2">
            ← Back to all technical guides
          </Link>
        </div>
      </article>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="space-y-3">
        <h1 className="text-3xl font-extrabold text-white">Technical Guides & Implementation Notes</h1>
        <p className="text-slate-400 text-base">
          Practical developer articles on calculating highway charging stops, connector standards, and building Indian EV software.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {EV_GUIDES.map((g) => (
          <Link
            key={g.id}
            to={`/guides/${g.id}`}
            className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                  {g.category}
                </span>
                <span className="text-slate-400">{g.readTime}</span>
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors leading-snug">
                {g.title}
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed line-clamp-3">
                {g.summary}
              </p>
            </div>
            <div className="pt-4 text-xs font-semibold text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Read guide →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
