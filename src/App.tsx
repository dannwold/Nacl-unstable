import React, { useState } from 'react';
import { SignalGaugeWidget } from './components/SignalGaugeWidget';
import { AudioWaveformWidget } from './components/AudioWaveformWidget';
import { QuickJsSandbox } from './components/QuickJsSandbox';
import { AdbTerminal } from './components/AdbTerminal';
import { SubsystemInspector } from './components/SubsystemInspector';
import { DocsViewer } from './components/DocsViewer';
import { TrebleRelocator } from './components/TrebleRelocator';
import {
  Radio,
  Volume2,
  Code,
  Wifi,
  Layers,
  BookOpen,
  HardDrive,
  Cpu,
  Activity,
  Terminal,
  ShieldCheck,
  Github
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'quickjs' | 'adb' | 'subsystems' | 'treble' | 'docs'>('dashboard');

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="bg-[#131A26] border-b border-[#202B3C] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#0088FF] to-[#00E5FF] text-white shadow-lg shadow-sky-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                NACL DEVELOPER PORTAL
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0088FF]/15 border border-[#0088FF]/30 text-[#0088FF] font-mono">
                  v1.0.0
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 font-mono">
                Android Native Capability Library • Bionic & QuickJS C-Bindings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" /> BIONIC ACTIVE
            </span>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto gap-2 border-t border-[#202B3C]/50 py-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono transition-all whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-[#0088FF] text-white font-bold shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-4 h-4" /> Hardware Diagnostics
          </button>

          <button
            onClick={() => setActiveTab('quickjs')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono transition-all whitespace-nowrap ${
              activeTab === 'quickjs'
                ? 'bg-[#0088FF] text-white font-bold shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Code className="w-4 h-4" /> QuickJS REPL
          </button>

          <button
            onClick={() => setActiveTab('adb')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono transition-all whitespace-nowrap ${
              activeTab === 'adb'
                ? 'bg-[#0088FF] text-white font-bold shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Wifi className="w-4 h-4" /> Wireless ADB
          </button>

          <button
            onClick={() => setActiveTab('subsystems')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono transition-all whitespace-nowrap ${
              activeTab === 'subsystems'
                ? 'bg-[#0088FF] text-white font-bold shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-4 h-4" /> C SDK Subsystems
          </button>

          <button
            onClick={() => setActiveTab('treble')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono transition-all whitespace-nowrap ${
              activeTab === 'treble'
                ? 'bg-[#0088FF] text-white font-bold shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <HardDrive className="w-4 h-4" /> Treble Relocator
          </button>

          <button
            onClick={() => setActiveTab('docs')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono transition-all whitespace-nowrap ${
              activeTab === 'docs'
                ? 'bg-[#0088FF] text-white font-bold shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Documentation
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <SignalGaugeWidget />
            <AudioWaveformWidget />
          </div>
        )}

        {activeTab === 'quickjs' && <QuickJsSandbox />}

        {activeTab === 'adb' && <AdbTerminal />}

        {activeTab === 'subsystems' && <SubsystemInspector />}

        {activeTab === 'treble' && <TrebleRelocator />}

        {activeTab === 'docs' && <DocsViewer />}
      </main>

      {/* Footer */}
      <footer className="bg-[#131A26] border-t border-[#202B3C] py-6 text-center text-xs font-mono text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            NACL Developer Portal • Built for <code className="text-sky-400">dannwold/nacl</code>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>NDK C/C++ Engine</span>
            <span>•</span>
            <span>Bionic Runtime</span>
            <span>•</span>
            <span>QuickJS Bindings</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
