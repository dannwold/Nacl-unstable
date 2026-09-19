import React, { useState } from 'react';
import { QuickJSLog } from '../types';
import { Terminal, Play, RotateCcw, Code, Sparkles, CheckCircle2 } from 'lucide-react';

const PRESET_SCRIPTS = [
  {
    name: 'Cellular Diagnostics',
    code: `// Evaluate QuickJS telephony binding
const metrics = nacl.telephony.getMetrics();
console.log("RSRP dBm: " + metrics.rsrp);
console.log("Signal Quality: " + metrics.quality);
console.log("Tech Band: " + metrics.techString);
metrics;`
  },
  {
    name: 'Hardware IPC Crypto',
    code: `// Hardware TEE / StrongBox Key Vault
const keyAlias = "nacl_ipc_aes_gcm_key";
const key = nacl.crypto.getOrCreateHardwareKey(keyAlias);
const payload = "SECRET_TELEMETRY_PACKET_0x994F";
const encrypted = nacl.crypto.encryptPayload(key, payload);
console.log("Encrypted Payload Frame: " + encrypted.ciphertext);
console.log("GCM Auth Tag: " + encrypted.tag);
encrypted;`
  },
  {
    name: 'Wireless ADB Shell',
    code: `// Open loopback shell channel to adbd
const adb = nacl.adb.connect(5555);
const prop = adb.execute("getprop ro.build.version.release");
console.log("Android OS Release Version: " + prop.trim());
const cpu = adb.execute("getprop ro.product.cpu.abi");
console.log("Bare-metal ABI: " + cpu.trim());
prop;`
  },
  {
    name: 'Shared Memory Ring Buffer',
    code: `// Zero-copy memfd_create ring buffer
const ring = nacl.shm.createRingBuffer("nacl_shm_audio", 65536);
ring.push(new Uint8Array([0x4e, 0x41, 0x43, 0x4c, 0x20, 0x56, 0x31]));
console.log("Pushed frame into shared ashmem ring buffer. Size: " + ring.getAvailableRead());
ring;`
  }
];

export const QuickJsSandbox: React.FC = () => {
  const [script, setScript] = useState<string>(PRESET_SCRIPTS[0].code);
  const [logs, setLogs] = useState<QuickJSLog[]>([
    {
      id: '1',
      timestamp: new Date().toLocaleTimeString(),
      type: 'native',
      text: '[QuickJS Engine] Runtime initialized with nacl_unified_api bindings (Bionic C layer).'
    }
  ]);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const runScript = () => {
    setIsRunning(true);
    const newLogs: QuickJSLog[] = [
      ...logs,
      {
        id: String(Date.now()),
        timestamp: new Date().toLocaleTimeString(),
        type: 'info',
        text: `Executing script via JS_Eval()...`
      }
    ];

    setTimeout(() => {
      if (script.includes('nacl.telephony')) {
        newLogs.push({
          id: String(Date.now() + 1),
          timestamp: new Date().toLocaleTimeString(),
          type: 'log',
          text: 'RSRP dBm: -85'
        });
        newLogs.push({
          id: String(Date.now() + 2),
          timestamp: new Date().toLocaleTimeString(),
          type: 'log',
          text: 'Signal Quality: GOOD'
        });
        newLogs.push({
          id: String(Date.now() + 3),
          timestamp: new Date().toLocaleTimeString(),
          type: 'log',
          text: 'Tech Band: 5G NR-SA (Sub-6)'
        });
        newLogs.push({
          id: String(Date.now() + 4),
          timestamp: new Date().toLocaleTimeString(),
          type: 'native',
          text: 'Return Value: { rsrp: -85, rsrq: -10, rssnr: 18, quality: "GOOD", techString: "5G NR-SA" }'
        });
      } else if (script.includes('nacl.crypto')) {
        newLogs.push({
          id: String(Date.now() + 1),
          timestamp: new Date().toLocaleTimeString(),
          type: 'log',
          text: 'Encrypted Payload Frame: 0x9F82A1B3C4D5E6F708192A3B4C5D6E7F8091'
        });
        newLogs.push({
          id: String(Date.now() + 2),
          timestamp: new Date().toLocaleTimeString(),
          type: 'log',
          text: 'GCM Auth Tag: 0xA7B8C9D0E1F23456'
        });
        newLogs.push({
          id: String(Date.now() + 3),
          timestamp: new Date().toLocaleTimeString(),
          type: 'native',
          text: 'Return Value: { ciphertext: "0x9F82A1...", tag: "0xA7B8C9...", keyId: "StrongBox-TEE-AES256" }'
        });
      } else if (script.includes('nacl.adb')) {
        newLogs.push({
          id: String(Date.now() + 1),
          timestamp: new Date().toLocaleTimeString(),
          type: 'log',
          text: 'Android OS Release Version: 14'
        });
        newLogs.push({
          id: String(Date.now() + 2),
          timestamp: new Date().toLocaleTimeString(),
          type: 'log',
          text: 'Bare-metal ABI: arm64-v8a'
        });
        newLogs.push({
          id: String(Date.now() + 3),
          timestamp: new Date().toLocaleTimeString(),
          type: 'native',
          text: 'Return Value: "14"'
        });
      } else {
        newLogs.push({
          id: String(Date.now() + 1),
          timestamp: new Date().toLocaleTimeString(),
          type: 'log',
          text: 'Pushed frame into shared ashmem ring buffer. Size: 7 bytes'
        });
        newLogs.push({
          id: String(Date.now() + 2),
          timestamp: new Date().toLocaleTimeString(),
          type: 'native',
          text: 'Return Value: ShmBuffer { handle: 12, name: "nacl_shm_audio", bytes: 65536 }'
        });
      }

      setLogs(newLogs);
      setIsRunning(false);
    }, 300);
  };

  const clearConsole = () => {
    setLogs([]);
  };

  return (
    <div className="bg-[#131A26] border border-[#202B3C] rounded-2xl p-6 glow-blue">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#202B3C]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
            <Code className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              QUICKJS C-BINDINGS REPL SANDBOX
              <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-mono">
                EMBEDDED JS ENGINE
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Interactive execution environment for <code className="text-sky-400">quickjs_core_binding.c</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={clearConsole}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
            title="Clear Console"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={runScript}
            disabled={isRunning}
            className="flex items-center gap-2 text-xs font-bold font-mono px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-white" />
            {isRunning ? 'EVALUATING...' : 'EXECUTE JS'}
          </button>
        </div>
      </div>

      {/* Preset Selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {PRESET_SCRIPTS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => setScript(preset.code)}
            className="text-xs font-mono px-3 py-1.5 rounded-lg border border-[#202B3C] bg-[#0B0F17] hover:border-purple-500/50 text-slate-300 hover:text-white transition-colors"
          >
            {preset.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Editor */}
        <div className="bg-[#0B0F17] rounded-xl border border-[#202B3C] p-4 flex flex-col">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2 pb-2 border-b border-[#202B3C]">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" /> JS Editor
            </span>
            <span>QuickJS v0.2.0</span>
          </div>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            className="w-full h-64 bg-transparent font-mono text-xs text-sky-300 focus:outline-none resize-none leading-relaxed"
            spellCheck={false}
          />
        </div>

        {/* Console Logs */}
        <div className="bg-[#0B0F17] rounded-xl border border-[#202B3C] p-4 flex flex-col">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2 pb-2 border-b border-[#202B3C]">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" /> Output Terminal
            </span>
            <span className="text-emerald-400">Active Context</span>
          </div>

          <div className="h-64 overflow-y-auto space-y-2 font-mono text-xs pr-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`p-2 rounded border ${
                  log.type === 'error'
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : log.type === 'native'
                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                    : log.type === 'info'
                    ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                    : 'bg-slate-900 border-slate-800 text-slate-200'
                }`}
              >
                <div className="text-[10px] text-slate-500 flex justify-between mb-0.5">
                  <span>[{log.type.toUpperCase()}]</span>
                  <span>{log.timestamp}</span>
                </div>
                <div>{log.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
