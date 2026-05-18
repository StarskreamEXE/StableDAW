import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play, Square, Layers, Target,
  Trash2, Sparkles, Plus, Activity,
} from 'lucide-react';
import { usePlaybackStore } from '../../state/playbackStore';
import { logInfo } from '../../state/logStore';

type Voice = 'kick' | 'snare' | 'hat' | 'tone' | 'noise';

interface Track {
  id: string;
  name: string;
  steps: boolean[];
  color: string;
  gain: number;
  voice: Voice;
  freq: number; // base frequency for tonal voices
}

const STEPS = 16;

const defaultTracks: Track[] = [
  { id: '1', name: 'Kick', steps: Array(STEPS).fill(false).map((_, i) => i % 4 === 0), color: '#ef4444', gain: 0.9, voice: 'kick', freq: 60 },
  { id: '2', name: 'Snare', steps: Array(STEPS).fill(false).map((_, i) => i === 4 || i === 12), color: '#f59e0b', gain: 0.7, voice: 'snare', freq: 180 },
  { id: '3', name: 'Hi-Hat', steps: Array(STEPS).fill(false).map((_, i) => i % 2 === 0), color: '#3b82f6', gain: 0.4, voice: 'hat', freq: 0 },
  { id: '4', name: 'Bass', steps: Array(STEPS).fill(false), color: '#8b5cf6', gain: 0.6, voice: 'tone', freq: 110 },
];

const VOICE_OPTIONS: Voice[] = ['kick', 'snare', 'hat', 'tone', 'noise'];
const NEW_TRACK_COLORS = ['#10b981', '#ec4899', '#06b6d4', '#a855f7', '#facc15', '#f97316'];

// Singleton AudioContext lazily created on first user interaction.
let _audioCtx: AudioContext | null = null;
const getAudioCtx = (): AudioContext => {
  if (!_audioCtx) {
    const Ctor = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    _audioCtx = new Ctor();
  }
  if (_audioCtx.state === 'suspended') void _audioCtx.resume();
  return _audioCtx;
};

const triggerVoice = (voice: Voice, freq: number, gain: number, masterGain: number, when: number): void => {
  const ctx = getAudioCtx();
  const out = ctx.createGain();
  out.gain.value = gain * masterGain;
  out.connect(ctx.destination);

  switch (voice) {
    case 'kick': {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 2.5, when);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq), when + 0.12);
      const env = ctx.createGain();
      env.gain.setValueAtTime(1, when);
      env.gain.exponentialRampToValueAtTime(0.001, when + 0.25);
      osc.connect(env).connect(out);
      osc.start(when);
      osc.stop(when + 0.3);
      break;
    }
    case 'snare': {
      // Tonal body
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, when);
      const oscEnv = ctx.createGain();
      oscEnv.gain.setValueAtTime(0.6, when);
      oscEnv.gain.exponentialRampToValueAtTime(0.001, when + 0.12);
      osc.connect(oscEnv).connect(out);
      osc.start(when); osc.stop(when + 0.15);
      // Noise body
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * 0.6;
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1500;
      const noiseEnv = ctx.createGain();
      noiseEnv.gain.setValueAtTime(0.8, when);
      noiseEnv.gain.exponentialRampToValueAtTime(0.001, when + 0.15);
      noise.connect(hp).connect(noiseEnv).connect(out);
      noise.start(when); noise.stop(when + 0.2);
      break;
    }
    case 'hat': {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1);
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 7000;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.8, when);
      env.gain.exponentialRampToValueAtTime(0.001, when + 0.05);
      noise.connect(hp).connect(env).connect(out);
      noise.start(when); noise.stop(when + 0.08);
      break;
    }
    case 'tone': {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, when);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.001, when);
      env.gain.exponentialRampToValueAtTime(0.8, when + 0.005);
      env.gain.exponentialRampToValueAtTime(0.001, when + 0.4);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2400;
      osc.connect(lp).connect(env).connect(out);
      osc.start(when); osc.stop(when + 0.45);
      break;
    }
    case 'noise': {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * 0.5;
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.7, when);
      env.gain.exponentialRampToValueAtTime(0.001, when + 0.3);
      noise.connect(env).connect(out);
      noise.start(when); noise.stop(when + 0.3);
      break;
    }
  }
};

export const StepSequencer: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>(defaultTracks);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(128);

  // Refs so the timer callback always reads the latest state without re-creating the interval.
  const tracksRef = useRef(tracks);
  const currentStepRef = useRef(currentStep);
  const masterGain = usePlaybackStore((s) => (s.muted ? 0 : s.volume / 100));
  const masterGainRef = useRef(masterGain);

  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => { currentStepRef.current = currentStep; }, [currentStep]);
  useEffect(() => { masterGainRef.current = masterGain; }, [masterGain]);

  // Sequencer clock — advance step + fire active voices.
  useEffect(() => {
    if (!isPlaying) return;
    const stepMs = 60000 / Math.max(40, Math.min(240, bpm)) / 4; // 16th notes
    const interval = window.setInterval(() => {
      const nextStep = (currentStepRef.current + 1) % STEPS;
      currentStepRef.current = nextStep;
      setCurrentStep(nextStep);
      const ctx = getAudioCtx();
      const when = ctx.currentTime + 0.02;
      const master = masterGainRef.current;
      for (const t of tracksRef.current) {
        if (t.steps[nextStep]) {
          triggerVoice(t.voice, t.freq, t.gain, master, when);
        }
      }
    }, stepMs);
    return () => window.clearInterval(interval);
  }, [isPlaying, bpm]);

  const handlePlayToggle = useCallback(() => {
    if (!isPlaying) {
      // Unlock AudioContext on user gesture.
      void getAudioCtx().resume();
      // Fire step 0 immediately so the user hears something on press.
      const ctx = getAudioCtx();
      const when = ctx.currentTime + 0.02;
      for (const t of tracksRef.current) {
        if (t.steps[0]) triggerVoice(t.voice, t.freq, t.gain, masterGainRef.current, when);
      }
      setCurrentStep(0);
      currentStepRef.current = 0;
      setIsPlaying(true);
      logInfo('sequencer', `Started at ${bpm} BPM`);
    } else {
      setIsPlaying(false);
      logInfo('sequencer', 'Stopped');
    }
  }, [isPlaying, bpm]);

  const toggleStep = (trackId: string, stepIndex: number) => {
    setTracks(tracks.map((t) =>
      t.id === trackId
        ? { ...t, steps: t.steps.map((s, i) => (i === stepIndex ? !s : s)) }
        : t,
    ));
  };

  const setTrackName = (trackId: string, name: string) => {
    setTracks(tracks.map((t) => (t.id === trackId ? { ...t, name } : t)));
  };

  const cycleVoice = (trackId: string) => {
    setTracks(tracks.map((t) => {
      if (t.id !== trackId) return t;
      const next = VOICE_OPTIONS[(VOICE_OPTIONS.indexOf(t.voice) + 1) % VOICE_OPTIONS.length];
      return { ...t, voice: next };
    }));
  };

  const addTrack = () => {
    const id = `t${Date.now()}`;
    const color = NEW_TRACK_COLORS[tracks.length % NEW_TRACK_COLORS.length];
    setTracks([...tracks, {
      id,
      name: `Track ${tracks.length + 1}`,
      steps: Array(STEPS).fill(false),
      color,
      gain: 0.6,
      voice: 'tone',
      freq: 220,
    }]);
  };

  const removeTrack = (trackId: string) => {
    setTracks(tracks.filter((t) => t.id !== trackId));
  };

  const clearAll = () => {
    setTracks(tracks.map((t) => ({ ...t, steps: Array(STEPS).fill(false) })));
  };

  const randomizeFill = () => {
    setTracks(tracks.map((t) => ({
      ...t,
      steps: Array(STEPS).fill(false).map(() => Math.random() > 0.7),
    })));
  };

  return (
    <div className="hardware-card h-full flex flex-col bg-black/40">
      <div className="flex items-center justify-between p-2 border-b border-white/5 bg-black/20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="mono-label">Step Sequencer</span>
          </div>

          <div className="h-4 w-px bg-white/10" />

          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[7px] font-mono text-zinc-600 uppercase leading-none">Tempo (BPM)</span>
              <input
                type="number"
                value={bpm}
                min={40}
                max={240}
                onChange={(e) => setBpm(parseInt(e.target.value) || 120)}
                className="bg-transparent border-none outline-none text-[12px] font-mono text-cyan-500 w-14 font-black"
              />
            </div>
            <button
              onClick={handlePlayToggle}
              className={`p-1.5 rounded transition-all ${isPlaying ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30'}`}
              title={isPlaying ? 'Stop' : 'Play'}
            >
              {isPlaying ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={randomizeFill}
            className="btn-ghost flex items-center gap-1.5 py-1 text-[9px]"
            title="Randomize all step patterns"
          >
            <Sparkles className="w-3 h-3 text-purple-400" /> RANDOM FILL
          </button>
          <button
            onClick={clearAll}
            className="btn-ghost flex items-center gap-1.5 py-1 text-[9px]"
            title="Clear all steps"
          >
            <Trash2 className="w-3 h-3" /> CLEAR
          </button>
          <button
            onClick={addTrack}
            className="p-1 px-2 border border-white/5 rounded hover:bg-white/5"
            title="Add track"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
        {tracks.map((track) => (
          <div key={track.id} className="flex gap-2 group">
            <div className="w-32 flex-shrink-0 flex flex-col bg-black/40 rounded p-1.5 border border-white/5 group-hover:border-white/10 transition-colors">
              <div className="flex justify-between items-center mb-1 gap-1">
                <input
                  type="text"
                  value={track.name}
                  onChange={(e) => setTrackName(track.id, e.target.value)}
                  className="bg-transparent border-none outline-none text-[9px] font-black uppercase truncate hover:bg-white/5 px-1 -mx-1 rounded transition-colors flex-1 min-w-0"
                  style={{ color: track.color }}
                />
                <button
                  onClick={() => cycleVoice(track.id)}
                  className="text-[7px] font-mono uppercase text-zinc-500 hover:text-white px-1 rounded bg-black/40 border border-white/5"
                  title={`Voice: ${track.voice} — click to change`}
                >
                  {track.voice}
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[7px] font-mono text-zinc-600 uppercase w-3">Vol</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={track.gain}
                  onChange={(e) => setTracks(tracks.map((t) => t.id === track.id ? { ...t, gain: parseFloat(e.target.value) } : t))}
                  className="pro-slider flex-1"
                />
              </div>
            </div>

            <div className="flex-1 grid grid-cols-16 gap-1">
              {track.steps.map((active, i) => (
                <button
                  key={i}
                  onClick={() => toggleStep(track.id, i)}
                  className={`relative aspect-square rounded-sm border transition-all
                    ${active ? 'shadow-[0_0_10px]' : 'border-white/5 hover:border-white/20 bg-white/[0.02]'}
                    ${i === currentStep && isPlaying ? 'ring-1 ring-white z-10 scale-110' : ''}
                    ${i % 4 === 0 ? 'opacity-100' : 'opacity-70'}
                  `}
                  style={{
                    backgroundColor: active ? track.color : undefined,
                    borderColor: active ? track.color : undefined,
                    boxShadow: active ? `0 0 10px ${track.color}66` : undefined,
                  }}
                >
                  {i % 4 === 0 && !active && <div className="absolute top-0.5 left-0.5 w-0.5 h-0.5 rounded-full bg-zinc-700" />}
                </button>
              ))}
            </div>

            <div className="w-8 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                className="text-zinc-700 hover:text-white"
                onClick={() => {
                  const ctx = getAudioCtx();
                  triggerVoice(track.voice, track.freq, track.gain, masterGainRef.current, ctx.currentTime + 0.02);
                }}
                title="Preview voice"
              >
                <Target className="w-3 h-3" />
              </button>
              <button
                className="text-zinc-700 hover:text-red-500"
                onClick={() => removeTrack(track.id)}
                title="Remove track"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}

        <div className="flex gap-2 mt-1">
          <div className="w-32 flex-shrink-0" />
          <div className="flex-1 grid grid-cols-16 gap-1">
            {Array.from({ length: STEPS }).map((_, i) => (
              <div key={i} className="flex justify-center">
                <div className={`w-1 h-1 rounded-full transition-all ${i === currentStep && isPlaying ? 'bg-cyan-500 scale-150' : 'bg-zinc-800'}`} />
              </div>
            ))}
          </div>
          <div className="w-8" />
        </div>
      </div>

      <div className="h-6 border-t border-white/5 bg-black/60 flex items-center justify-between px-3">
        <div className="flex items-center gap-4">
          <span className="text-[7px] font-mono text-zinc-600 uppercase flex items-center gap-1.5">
            <Activity className="w-2.5 h-2.5" /> {isPlaying ? 'PLAYING' : 'STOPPED'}
          </span>
          <span className="text-[7px] font-mono text-zinc-600 uppercase tracking-tighter">
            Step {currentStep + 1}/{STEPS} // {tracks.length} tracks
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[7px] font-mono text-cyan-500/80 uppercase">Web Audio Engine</span>
        </div>
      </div>
    </div>
  );
};
