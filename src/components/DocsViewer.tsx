import React, { useState } from 'react';
import { DOC_ARTICLES } from '../data/docs';
import { DocArticle } from '../types';
import Markdown from 'react-markdown';
import { BookOpen, Search, FileText, ExternalLink } from 'lucide-react';

export const DocsViewer: React.FC = () => {
  const [activeArticle, setActiveArticle] = useState<DocArticle>(DOC_ARTICLES[0]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredArticles = DOC_ARTICLES.filter((art) =>
    art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    art.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-[#131A26] border border-[#202B3C] rounded-2xl p-6 glow-blue">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#202B3C]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              NACL DEVELOPER PORTAL & MANUAL
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">
                DOCSIFY PORTAL
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Interactive documentation for NACL C SDK, JNI bridges, and Project Treble
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search docs..."
            className="w-full bg-[#0B0F17] border border-[#202B3C] rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Articles List */}
        <div className="space-y-2 lg:col-span-1">
          {filteredArticles.map((art) => (
            <button
              key={art.id}
              onClick={() => setActiveArticle(art)}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                activeArticle.id === art.id
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-white font-bold'
                  : 'bg-[#0B0F17] border-[#202B3C] text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="text-xs font-mono mb-1">{art.title}</div>
              <div className="text-[10px] text-slate-400 font-mono truncate">{art.filename}</div>
            </button>
          ))}
        </div>

        {/* Markdown Reader */}
        <div className="bg-[#0B0F17] rounded-xl border border-[#202B3C] p-6 lg:col-span-3 min-h-[400px]">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#202B3C] text-xs font-mono text-slate-400">
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" /> {activeArticle.filename}
            </span>
            <span className="text-emerald-400 font-bold">{activeArticle.category}</span>
          </div>

          <div className="prose prose-invert max-w-none prose-pre:bg-[#131A26] prose-pre:border prose-pre:border-[#202B3C] prose-code:text-sky-300 text-slate-200 text-xs leading-relaxed">
            <Markdown>{activeArticle.content || '# Document Loading...'}</Markdown>
          </div>
        </div>
      </div>
    </div>
  );
};
