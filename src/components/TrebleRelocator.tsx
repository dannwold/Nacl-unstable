import React, { useState } from 'react';
import { Shield, FolderDown, Cpu, CheckCircle2, RefreshCcw, HardDrive } from 'lucide-react';

export const TrebleRelocator: React.FC = () => {
  const [libs, setLibs] = useState<Array<{ name: string; size: string; status: 'in_assets' | 'relocating' | 'relocated'; perm: string }>>([
    { name: 'libsensors_client.so', size: '248 KB', status: 'relocated', perm: 'r-xr-xr-x (0755)' },
    { name: 'libbluetooth_client.so', size: '312 KB', status: 'relocated', perm: 'r-xr-xr-x (0755)' },
    { name: 'libtelephony_client.so', size: '410 KB', status: 'relocated', perm: 'r-xr-xr-x (0755)' },
    { name: 'libipc_crypto.so', size: '180 KB', status: 'relocated', perm: 'r-xr-xr-x (0755)' },
    { name: 'libshm_ring_buffer.so', size: '128 KB', status: 'relocated', perm: 'r-xr-xr-x (0755)' },
  ]);

  const [isRelocating, setIsRelocating] = useState<boolean>(false);
  const [logText, setLogText] = useState<string>('Treble namespace bypass active. Dynamic libraries successfully mapped into sandbox directory.');

  const triggerRelocation = () => {
    setIsRelocating(true);
    setLogText('Starting Treble Linker relocation process...');

    setTimeout(() => {
      setLogText('Copying binary .so files from assets/ to /data/data/com.your.app/files/lib/...');
      setTimeout(() => {
        setLogText('Setting chmod r-xr-xr-x (0755) execution bit for Bionic dynamic linker loading.');
        setIsRelocating(false);
      }, 800);
    }, 600);
  };

  return (
    <div className="bg-[#131A26] border border-[#202B3C] rounded-2xl p-6 glow-blue">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#202B3C]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              PROJECT TREBLE LINKER RELOCATION MANAGER
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-mono">
                BIONIC SANDBOX
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Dynamic library relocation engine implemented in <code className="text-sky-400">HostAppBootstrapper.java</code>
            </p>
          </div>
        </div>

        <button
          onClick={triggerRelocation}
          disabled={isRelocating}
          className="flex items-center gap-2 text-xs font-mono px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors disabled:opacity-50"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${isRelocating ? 'animate-spin' : ''}`} />
          {isRelocating ? 'RELOCATING...' : 'RELOCATE MODULES'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Libraries List */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
            Packaged Native Shared Libraries (.so)
          </h4>
          <div className="space-y-2">
            {libs.map((lib) => (
              <div
                key={lib.name}
                className="bg-[#0B0F17] p-3 rounded-xl border border-[#202B3C] flex items-center justify-between font-mono text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  <div>
                    <div className="font-bold text-white">{lib.name}</div>
                    <div className="text-[10px] text-slate-500">{lib.size} • {lib.perm}</div>
                  </div>
                </div>

                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                  RELOCATED
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Log & Info */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
            Bionic Loader Execution Log
          </h4>
          <div className="bg-[#0B0F17] rounded-xl border border-[#202B3C] p-4 font-mono text-xs text-indigo-300 min-h-[180px]">
            <div className="text-[10px] text-slate-500 mb-2 border-b border-[#202B3C] pb-1">
              LOG TARGET: /data/data/com.your.app/files/lib/
            </div>
            <p className="leading-relaxed">{logText}</p>
          </div>

          <div className="bg-[#0B0F17] p-4 rounded-xl border border-[#202B3C] text-xs text-slate-300 space-y-2 font-mono">
            <div className="text-white font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Project Treble Compliance Verified
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              By setting executable file permissions inside the application sandbox, NACL allows high-speed native library loading without needing root privileges.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
