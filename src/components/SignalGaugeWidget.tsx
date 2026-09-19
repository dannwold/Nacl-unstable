import React, { useState, useEffect } from 'react';
import { DecodedCellTowerMetric, SignalQuality } from '../types';
import { Radio, RefreshCw, Zap, Shield, Activity, BarChart2 } from 'lucide-react';

export const SignalGaugeWidget: React.FC = () => {
  const [metric, setMetric] = useState<DecodedCellTowerMetric>({
    rsrp: -85,
    rsrq: -10,
    rssnr: 18,
    pci: 247,
    quality: 'GOOD',
    band: 71,
    frequency: 600,
    techString: '5G NR-SA (Sub-6)',
    earfcn: 125900,
    cgi: '310-260-0491823',
    tac: 14209,
    mcc: 310,
    mnc: 260,
  });

  const [isSimulating, setIsSimulating] = useState<boolean>(true);

  // Live telemetry stream simulator
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setMetric((prev) => {
        const delta = (Math.random() - 0.5) * 4;
        const newRsrp = Math.min(-50, Math.max(-120, Math.round(prev.rsrp + delta)));
        const newRsrq = Math.min(-3, Math.max(-20, Math.round(prev.rsrq + (Math.random() - 0.5) * 2)));
        const newSnr = Math.min(30, Math.max(-10, Math.round(prev.rssnr + (Math.random() - 0.5) * 3)));

        let newQuality: SignalQuality = 'DEAD';
        if (newRsrp >= -80) newQuality = 'EXCELLENT';
        else if (newRsrp >= -95) newQuality = 'GOOD';
        else if (newRsrp >= -105) newQuality = 'FAIR';
        else if (newRsrp >= -115) newQuality = 'POOR';

        return {
          ...prev,
          rsrp: newRsrp,
          rsrq: newRsrq,
          rssnr: newSnr,
          quality: newQuality,
        };
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [isSimulating]);

  // Compute gauge angle & color
  // RSRP range: -120 dBm (0%) to -50 dBm (100%)
  const progress = Math.min(1, Math.max(0, (metric.rsrp + 120) / 70));
  const sweepAngle = progress * 270;

  const getQualityColor = (quality: SignalQuality) => {
    switch (quality) {
      case 'EXCELLENT':
        return '#00E676'; // Vivid Green
      case 'GOOD':
        return '#0088FF'; // Deep Blue
      case 'FAIR':
        return '#FFEA00'; // Yellow
      case 'POOR':
        return '#FF1744'; // Red
      default:
        return '#8A99AD'; // Grey
    }
  };

  const qualityColor = getQualityColor(metric.quality);

  return (
    <div className="bg-[#131A26] border border-[#202B3C] rounded-2xl p-6 glow-blue transition-all">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#202B3C]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#0088FF]/10 text-[#0088FF]">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              CELLULAR MODEM DIAGNOSTIC
              <span className="text-xs px-2 py-0.5 rounded bg-[#00E676]/10 text-[#00E676] font-mono">
                BIONIC C-NATIVE
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Direct telemetry decoding via <code className="text-sky-400">telephony_client.c</code>
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsSimulating(!isSimulating)}
          className={`flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg border transition-colors ${
            isSimulating
              ? 'bg-[#0088FF]/10 border-[#0088FF]/30 text-[#0088FF]'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
          {isSimulating ? 'LIVE STREAMING' : 'PAUSED'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* SVG Arc Gauge */}
        <div className="flex flex-col items-center justify-center relative py-4">
          <div className="relative w-56 h-56 flex items-center justify-center">
            <svg className="w-full h-full -rotate-135 transform" viewBox="0 0 100 100">
              {/* Backing Arc Track */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="188.5"
                strokeDashoffset="47.1"
              />
              {/* Active Progress Arc */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke={qualityColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="188.5"
                strokeDashoffset={188.5 - (188.5 * 0.75 * progress)}
                className="transition-all duration-500 ease-out"
              />
            </svg>

            {/* Centered Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-3xl font-extrabold text-white font-mono tracking-tight">
                {metric.rsrp} <span className="text-sm text-slate-400 font-normal">dBm</span>
              </span>
              <span
                className="text-xs font-bold uppercase tracking-wider mt-1 px-2 py-0.5 rounded"
                style={{ color: qualityColor, backgroundColor: `${qualityColor}15` }}
              >
                {metric.quality} ({metric.techString})
              </span>
            </div>
          </div>

          <div className="mt-2 text-center text-xs text-slate-400 font-mono">
            RSRP Vector Mapping: -120dBm → -50dBm
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="space-y-4">
          <div className="bg-[#0B0F17] p-4 rounded-xl border border-[#202B3C] space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-mono flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-400" /> Reference Signal Quality (RSRQ)
              </span>
              <span className="font-bold text-white font-mono">{metric.rsrq} dB</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-sky-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, ((metric.rsrq + 20) / 17) * 100))}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs pt-1">
              <span className="text-slate-400 font-mono flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-yellow-400" /> Signal-to-Noise Ratio (RSSNR)
              </span>
              <span className="font-bold text-white font-mono">{metric.rssnr} dB</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-yellow-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, ((metric.rssnr + 10) / 40) * 100))}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#0B0F17] p-3 rounded-xl border border-[#202B3C] text-center">
              <div className="text-[10px] text-slate-400 font-mono uppercase">PCI</div>
              <div className="text-base font-bold text-white font-mono">{metric.pci}</div>
            </div>
            <div className="bg-[#0B0F17] p-3 rounded-xl border border-[#202B3C] text-center">
              <div className="text-[10px] text-slate-400 font-mono uppercase">BAND</div>
              <div className="text-base font-bold text-sky-400 font-mono">n{metric.band}</div>
            </div>
            <div className="bg-[#0B0F17] p-3 rounded-xl border border-[#202B3C] text-center">
              <div className="text-[10px] text-slate-400 font-mono uppercase">FREQ</div>
              <div className="text-base font-bold text-emerald-400 font-mono">{metric.frequency} MHz</div>
            </div>
          </div>

          <div className="bg-[#0B0F17]/60 p-3 rounded-xl border border-[#202B3C]/50 text-xs font-mono text-slate-400 flex items-center justify-between">
            <span>CGI: <strong className="text-slate-200">{metric.cgi}</strong></span>
            <span>EARFCN: <strong className="text-slate-200">{metric.earfcn}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
