import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Mic, Play, Pause, Disc } from 'lucide-react';

export const AudioWaveformWidget: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [rms, setRms] = useState<number>(0.15);
  const [peak, setPeak] = useState<number>(0.42);
  const [db, setDb] = useState<number>(-18.4);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Envelope points (32 downsampled samples from Direct ByteBuffer)
  const envelopeRef = useRef<number[]>(Array(32).fill(0.1));

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      // Simulate AAudio / OpenSL ES Direct ByteBuffer frames
      const time = Date.now() / 150;
      const newEnvelope = Array.from({ length: 32 }, (_, i) => {
        const val = Math.abs(Math.sin(time + i * 0.3) * 0.5 + Math.cos(time * 0.8 + i * 0.1) * 0.3 + (Math.random() - 0.5) * 0.2);
        return Math.min(1.0, Math.max(0.05, val));
      });

      envelopeRef.current = newEnvelope;
      const currentRms = newEnvelope.reduce((a, b) => a + b, 0) / 32;
      const currentPeak = Math.max(...newEnvelope);
      const currentDb = 20 * Math.log10(Math.max(0.001, currentRms));

      setRms(parseFloat(currentRms.toFixed(3)));
      setPeak(parseFloat(currentPeak.toFixed(3)));
      setDb(parseFloat(currentDb.toFixed(1)));

      // Render onto canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;
          ctx.clearRect(0, 0, width, height);

          // Draw bars
          const barWidth = (width / 32) - 2;
          newEnvelope.forEach((val, i) => {
            const barHeight = val * (height * 0.85);
            const x = i * (barWidth + 2);
            const y = (height - barHeight) / 2;

            const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
            gradient.addColorStop(0, '#00E5FF');
            gradient.addColorStop(1, '#0088FF');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, 3);
            ctx.fill();
          });
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="bg-[#131A26] border border-[#202B3C] rounded-2xl p-6 glow-teal">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#202B3C]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#00E5FF]/10 text-[#00E5FF]">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              NATIVE AUDIO WAVEFORM ENGINE
              <span className="text-xs px-2 py-0.5 rounded bg-[#00E5FF]/10 text-[#00E5FF] font-mono">
                AAUDIO DIRECT BUFFER
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              32-float envelope downsampling routed via <code className="text-sky-400">NaclAudioBridge.kt</code>
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg border transition-colors ${
            isPlaying
              ? 'bg-[#00E5FF]/10 border-[#00E5FF]/30 text-[#00E5FF]'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {isPlaying ? 'PAUSE STREAM' : 'START STREAM'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Canvas Visualizer */}
        <div className="bg-[#0B0F17] p-4 rounded-xl border border-[#202B3C] flex flex-col items-center justify-center">
          <canvas
            ref={canvasRef}
            width={600}
            height={120}
            className="w-full h-28 object-contain"
          />
        </div>

        {/* Meters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0B0F17] p-4 rounded-xl border border-[#202B3C]">
            <div className="flex justify-between items-center text-xs mb-1 font-mono">
              <span className="text-slate-400">RMS ENERGY</span>
              <span className="text-[#00E5FF] font-bold">{rms}</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#00E5FF] h-full rounded-full transition-all duration-75"
                style={{ width: `${Math.min(100, rms * 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-[#0B0F17] p-4 rounded-xl border border-[#202B3C]">
            <div className="flex justify-between items-center text-xs mb-1 font-mono">
              <span className="text-slate-400">PEAK AMPLITUDE</span>
              <span className="text-[#0088FF] font-bold">{peak}</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#0088FF] h-full rounded-full transition-all duration-75"
                style={{ width: `${Math.min(100, peak * 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-[#0B0F17] p-4 rounded-xl border border-[#202B3C]">
            <div className="flex justify-between items-center text-xs mb-1 font-mono">
              <span className="text-slate-400">DECIBELS (dB)</span>
              <span className="text-emerald-400 font-bold">{db} dB</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-75"
                style={{ width: `${Math.min(100, Math.max(0, ((db + 60) / 60) * 100))}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
