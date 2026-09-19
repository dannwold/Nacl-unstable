import React, { useState } from 'react';
import { NACL_SUBSYSTEMS } from '../data/subsystems';
import { Subsystem } from '../types';
import { Cpu, FileCode, CheckCircle2, Shield, Layers, ChevronRight, Search } from 'lucide-react';

export const SubsystemInspector: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSubsystem, setActiveSubsystem] = useState<Subsystem>(NACL_SUBSYSTEMS[0]);

  const filteredSubsystems = NACL_SUBSYSTEMS.filter((sub) => {
    const matchesCategory = selectedCategory === 'all' || sub.category === selectedCategory;
    const matchesSearch =
      sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.headerFile.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="bg-[#131A26] border border-[#202B3C] rounded-2xl p-6 glow-blue">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#202B3C]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              NATIVE C SDK SUBSYSTEMS ARCHITECTURE
              <span className="text-xs px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono">
                12 C-MODULES
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Low-level Bionic/NDK hardware interface headers in <code className="text-sky-400">/sdk/include/</code>
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
            placeholder="Search subsystems..."
            className="w-full bg-[#0B0F17] border border-[#202B3C] rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['all', 'core', 'hardware', 'telephony', 'graphics', 'ipc', 'automation'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`text-xs font-mono uppercase px-3 py-1.5 rounded-lg border transition-colors ${
              selectedCategory === cat
                ? 'bg-sky-500/20 border-sky-500 text-sky-400 font-bold'
                : 'bg-[#0B0F17] border-[#202B3C] text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="space-y-2 lg:col-span-1 max-h-[480px] overflow-y-auto pr-2">
          {filteredSubsystems.map((sub) => (
            <div
              key={sub.id}
              onClick={() => setActiveSubsystem(sub)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                activeSubsystem.id === sub.id
                  ? 'bg-sky-500/10 border-sky-500/50 text-white'
                  : 'bg-[#0B0F17] border-[#202B3C] text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold font-mono">{sub.name}</span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>
              <div className="text-[11px] text-slate-400 font-mono truncate">{sub.headerFile}</div>
            </div>
          ))}
        </div>

        {/* Detailed Inspector View */}
        <div className="bg-[#0B0F17] rounded-xl border border-[#202B3C] p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#202B3C]">
            <div>
              <h4 className="text-base font-bold text-white font-mono">{activeSubsystem.name}</h4>
              <p className="text-xs text-sky-400 font-mono mt-0.5">{activeSubsystem.headerFile}</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono uppercase font-bold">
              {activeSubsystem.status}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">{activeSubsystem.description}</p>

          <div className="space-y-2">
            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Source File Implementation
            </h5>
            <div className="bg-[#131A26] p-2.5 rounded-lg border border-[#202B3C] text-xs font-mono text-slate-200 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-purple-400" />
              {activeSubsystem.sourceFile}
            </div>
          </div>

          <div className="space-y-2">
            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Exported C API Function Prototypes
            </h5>
            <div className="bg-[#131A26] p-3 rounded-xl border border-[#202B3C] space-y-2">
              {activeSubsystem.functions.map((fn, idx) => (
                <div key={idx} className="text-xs font-mono text-emerald-400 flex items-center gap-2">
                  <span className="text-slate-600">fn</span> {fn}
                </div>
              ))}
            </div>
          </div>

          {activeSubsystem.notes && (
            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 font-mono">
              ℹ️ {activeSubsystem.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
