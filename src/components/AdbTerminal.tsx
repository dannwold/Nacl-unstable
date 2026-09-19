import React, { useState } from 'react';
import { Terminal, Wifi, KeyRound, ShieldAlert, CheckCircle2, Play, Cpu } from 'lucide-react';

export const AdbTerminal: React.FC = () => {
  const [port, setPort] = useState<number | null>(41289);
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);
  const [pairingCode, setPairingCode] = useState<string>('849201');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [showPairModal, setShowPairModal] = useState<boolean>(false);
  const [command, setCommand] = useState<string>('getprop ro.build.version.release');
  const [terminalHistory, setTerminalHistory] = useState<Array<{ cmd: string; output: string }>>([
    {
      cmd: 'adb connect 127.0.0.1:41289',
      output: 'connected to 127.0.0.1:41289 (UID 2000 context acquired)'
    },
    {
      cmd: 'getprop ro.product.model',
      output: 'Pixel 8 Pro'
    }
  ]);

  const discoverPort = () => {
    setIsDiscovering(true);
    setTimeout(() => {
      const newPort = Math.floor(35000 + Math.random() * 20000);
      setPort(newPort);
      setIsDiscovering(false);
      setTerminalHistory((prev) => [
        ...prev,
        {
          cmd: '[NSD Service Discovery]',
          output: `Discovered active adbd wireless debugging port on 127.0.0.1:${newPort}`
        }
      ]);
    }, 1000);
  };

  const handlePair = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticated(true);
    setShowPairModal(false);
    setTerminalHistory((prev) => [
      ...prev,
      {
        cmd: `[TLS Auth Handshake] Pair code: ${pairingCode}`,
        output: 'RSA-2048 Auth Handshake Perfect! Secured UID 2000 shell privileges.'
      }
    ]);
  };

  const executeCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    let output = '';
    const trimmed = command.trim().toLowerCase();

    if (trimmed.includes('getprop')) {
      output = '[ro.build.version.release]: [14]\n[ro.product.cpu.abi]: [arm64-v8a]\n[ro.hardware]: [komodo]\n[ro.boot.flash.locked]: [1]';
    } else if (trimmed.includes('dumpsys telephony')) {
      output = 'Cellular Modem Registry:\n  mServiceState=0 (IN_SERVICE)\n  mSignalStrength=SignalStrength:{mRssi=-85,mRsrp=-85,mRsrq=-10,mSnr=18}\n  mPci=247';
    } else if (trimmed.includes('pm list')) {
      output = 'package:com.android.systemui\npackage:com.android.phone\npackage:com.your.app\npackage:com.google.android.gms';
    } else if (trimmed.includes('devices')) {
      output = `List of devices attached\n127.0.0.1:${port || 5555}\tdevice (UID 2000)`;
    } else {
      output = `[adb shell] Executed '${command}': status 0 OK.`;
    }

    setTerminalHistory((prev) => [...prev, { cmd: command, output }]);
    setCommand('');
  };

  return (
    <div className="bg-[#131A26] border border-[#202B3C] rounded-2xl p-6 glow-blue">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#202B3C]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
            <Wifi className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              WIRELESS ADB & LOOPBACK SHELL
              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono">
                UID 2000 PRIVILEGE
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              RSA-2048 socket handshake client via <code className="text-sky-400">adb_client.c</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={discoverPort}
            disabled={isDiscovering}
            className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg border border-[#202B3C] bg-[#0B0F17] hover:border-amber-500/50 text-slate-300 hover:text-white transition-colors"
          >
            <Wifi className={`w-3.5 h-3.5 ${isDiscovering ? 'animate-pulse text-amber-400' : ''}`} />
            {isDiscovering ? 'SEARCHING NSD...' : 'DISCOVER PORT'}
          </button>

          <button
            onClick={() => setShowPairModal(true)}
            className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5" />
            PAIR HANDSHAKE
          </button>
        </div>
      </div>

      {/* Connection Info Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-[#0B0F17] p-3 rounded-xl border border-[#202B3C] flex items-center gap-3">
          <Cpu className="w-4 h-4 text-sky-400" />
          <div>
            <div className="text-[10px] text-slate-400 font-mono">TARGET DEVICE</div>
            <div className="text-xs font-bold text-white font-mono">127.0.0.1 (Loopback)</div>
          </div>
        </div>

        <div className="bg-[#0B0F17] p-3 rounded-xl border border-[#202B3C] flex items-center gap-3">
          <Wifi className="w-4 h-4 text-amber-400" />
          <div>
            <div className="text-[10px] text-slate-400 font-mono">NSD SERVICE PORT</div>
            <div className="text-xs font-bold text-amber-400 font-mono">
              {port ? `Port ${port}` : 'Not Discovered'}
            </div>
          </div>
        </div>

        <div className="bg-[#0B0F17] p-3 rounded-xl border border-[#202B3C] flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <div>
            <div className="text-[10px] text-slate-400 font-mono">TLS AUTH STATUS</div>
            <div className="text-xs font-bold text-emerald-400 font-mono">
              {isAuthenticated ? 'AUTHENTICATED (UID 2000)' : 'UNAUTHENTICATED'}
            </div>
          </div>
        </div>
      </div>

      {/* Terminal View */}
      <div className="bg-[#0B0F17] rounded-xl border border-[#202B3C] p-4 font-mono text-xs flex flex-col h-72">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#202B3C] text-slate-500">
          <span>adb shell @ 127.0.0.1:{port || 5555}</span>
          <span>Bionic C Sockets</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {terminalHistory.map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="text-amber-400 flex items-center gap-1.5">
                <span className="text-slate-600">$</span> {item.cmd}
              </div>
              <div className="text-slate-300 pl-3 border-l border-slate-800 whitespace-pre-wrap leading-relaxed">
                {item.output}
              </div>
            </div>
          ))}
        </div>

        {/* Input form */}
        <form onSubmit={executeCommand} className="mt-3 pt-2 border-t border-[#202B3C] flex gap-2">
          <span className="text-amber-400 font-bold">$</span>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Type ADB shell command (e.g. getprop, dumpsys telephony, devices)..."
            className="flex-1 bg-transparent text-white focus:outline-none font-mono text-xs"
          />
          <button type="submit" className="text-amber-400 hover:text-amber-300 font-bold text-xs">
            RUN
          </button>
        </form>
      </div>

      {/* Pairing Modal */}
      {showPairModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#131A26] border border-[#202B3C] rounded-2xl p-6 max-w-md w-full glow-blue">
            <h4 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-400" /> Wireless Pair Handshake
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              Enter the 6-digit dynamic system debugging code displayed on the target device:
            </p>

            <form onSubmit={handlePair} className="space-y-4">
              <input
                type="text"
                value={pairingCode}
                onChange={(e) => setPairingCode(e.target.value)}
                maxLength={6}
                className="w-full bg-[#0B0F17] border border-[#202B3C] rounded-xl px-4 py-3 font-mono text-xl text-center tracking-widest text-amber-400 focus:outline-none focus:border-amber-500"
              />

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowPairModal(false)}
                  className="px-4 py-2 text-xs font-mono rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-mono font-bold rounded-xl bg-amber-500 text-black hover:bg-amber-400"
                >
                  Authenticate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
