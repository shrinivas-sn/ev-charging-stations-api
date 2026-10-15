import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { EV_GUIDES } from '../content/guidesData';

export default function GuidesPage() {
  const { id } = useParams();

  if (id) {
    const guide = EV_GUIDES.find((g) => g.id === id);

    if (!guide) {
      return (
        <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4 font-mono">
          <h1 className="text-xl font-bold text-white uppercase">GUIDE_NOT_FOUND</h1>
          <p className="text-slate-400 text-xs">The requested guide identifier does not exist in the index.</p>
          <Link to="/guides" className="text-xs text-blue-400 underline">Return to Guides Index</Link>
        </div>
      );
    }

    return (
      <article className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="space-y-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="px-1.5 py-0.5 bg-blue-950 text-blue-400 border border-blue-800 rounded font-bold">
              {guide.category}
            </span>
            <span className="text-slate-400">{guide.readTime}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-mono font-bold text-white uppercase tracking-tight">
            {guide.title}
          </h1>
          <p className="text-slate-300 text-xs font-sans leading-relaxed">
            {guide.summary}
          </p>
        </div>

        <div className="space-y-4 text-slate-300 text-xs leading-relaxed font-sans">
          {guide.content.split('\n\n').map((paragraph, idx) => {
            if (paragraph.startsWith('## ')) {
              return <h2 key={idx} className="text-lg font-mono font-bold text-white pt-4 border-b border-slate-800 pb-1">{paragraph.replace('## ', '')}</h2>;
            }
            if (paragraph.startsWith('### ')) {
              return <h3 key={idx} className="text-sm font-mono font-bold text-blue-400 pt-2">{paragraph.replace('### ', '')}</h3>;
            }
            if (paragraph.startsWith('```')) {
              const lines = paragraph.split('\n');
              const code = lines.slice(1, -1).join('\n');
              return (
                <pre key={idx} className="p-3 bg-[#060a12] border border-slate-800 rounded font-mono text-xs overflow-x-auto text-emerald-300 leading-normal">
                  {code}
                </pre>
              );
            }
            return <p key={idx}>{paragraph}</p>;
          })}
        </div>

        <div className="pt-6 border-t border-slate-800 font-mono text-xs">
          <Link to="/guides" className="text-blue-400 hover:underline">
            ← RETURN_TO_GUIDES_INDEX
          </Link>
        </div>
      </article>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl sm:text-2xl font-mono font-bold text-white uppercase tracking-tight">
          Engineering Guides &amp; Protocols
        </h1>
        <p className="text-slate-400 text-xs font-mono mt-0.5">
          Reference architectures, spatial queries, and connector implementations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {EV_GUIDES.map((g) => (
          <Link
            key={g.id}
            to={`/guides/${g.id}`}
            className="panel-technical rounded p-4 flex flex-col justify-between hover:border-slate-600 transition-colors"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="px-1.5 py-0.5 bg-slate-900 text-slate-300 border border-slate-800 rounded">
                  {g.category}
                </span>
                <span className="text-slate-500">{g.readTime}</span>
              </div>
              <h2 className="text-sm font-mono font-bold text-white leading-snug">
                {g.title}
              </h2>
              <p className="text-slate-400 text-xs font-sans leading-relaxed line-clamp-3">
                {g.summary}
              </p>
            </div>
            <div className="pt-3 font-mono text-xs text-blue-400">
              OPEN_SPEC →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
