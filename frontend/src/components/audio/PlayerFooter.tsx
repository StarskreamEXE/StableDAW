import React, { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Download, Music, Share2, Heart, Repeat, VolumeX, Maximize2, MoreHorizontal } from 'lucide-react';
import { motion } from 'motion/react';
import { useGenerateStore } from '../../state/generateStore';
import { usePlaybackStore } from '../../state/playbackStore';

const formatDuration = (sec: number | null): string => {
  if (sec == null || !Number.isFinite(sec)) return '--:--';
  const total = Math.max(0, Math.round(sec));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const PlayerFooter: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLooping, setIsLooping] = useState(true);

  const volume = usePlaybackStore((s) => s.volume);
  const setVolume = usePlaybackStore((s) => s.setVolume);
  const isMuted = usePlaybackStore((s) => s.muted);
  const toggleMute = usePlaybackStore((s) => s.toggleMute);

  const lastFilename = useGenerateStore((s) => s.lastFilename);
  const lastDurationSec = useGenerateStore((s) => s.lastDurationSec);
  const lastModelName = useGenerateStore((s) => s.lastModelName);
  const hasTrack = !!lastFilename;

  return (
    <footer className="fixed bottom-0 left-0 right-0 h-20 bg-[#0a080f]/95 backdrop-blur-xl border-t border-white/5 z-50 px-6 flex items-center justify-between gap-8 group">
      {/* 1. Track Info & Actions */}
      <div className="flex items-center gap-4 w-[300px] flex-shrink-0">
        <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/5 flex items-center justify-center relative overflow-hidden group/thumb">
          <Music className="w-5 h-5 text-purple-400 group-hover/thumb:scale-110 transition-transform" />
          {isPlaying && (
            <motion.div 
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute inset-0 bg-purple-500/10"
            />
          )}
        </div>
        <div className="flex flex-col min-width-0">
          <h4 className="text-[13px] font-bold text-zinc-100 truncate tracking-tight">
            {hasTrack ? lastFilename : 'No output loaded'}
          </h4>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-purple-400 font-mono uppercase tracking-widest border border-purple-500/20 px-1 rounded bg-purple-500/5">
              {lastModelName ? lastModelName.toUpperCase() : 'IDLE'}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              {hasTrack ? `${formatDuration(lastDurationSec)} // 48kHz` : '--:-- // 48kHz'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setIsLiked(!isLiked)} className={`p-1.5 transition-colors ${isLiked ? 'text-pink-500' : 'text-zinc-600 hover:text-white'}`}>
             <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
          </button>
          <button className="p-1.5 text-zinc-600 hover:text-white transition-colors">
             <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Main Transport Control */}
      <div className="flex-1 flex flex-col items-center gap-1.5 max-w-2xl min-width-0">
        <div className="flex items-center gap-8">
          <button onClick={() => setIsLooping(!isLooping)} className={`p-1 transition-colors ${isLooping ? 'text-purple-400' : 'text-zinc-600 hover:text-white'}`}>
            <Repeat className="w-4 h-4" />
          </button>
          <button className="text-zinc-500 hover:text-white transition-colors"><SkipBack className="w-5 h-5 fill-current" /></button>
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)]"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>
          <button className="text-zinc-500 hover:text-white transition-colors"><SkipForward className="w-5 h-5 fill-current" /></button>
          <button className="p-1 text-zinc-600 hover:text-white transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
        
        <div className="w-full flex items-center gap-3">
          <span className="text-[10px] font-mono text-zinc-500 w-8 text-right">0:00</span>
          <div className="flex-1 h-[3px] bg-white/5 rounded-full relative group cursor-pointer">
            <div className="absolute inset-0 bg-white/5" />
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-600 to-purple-400 rounded-full"
              style={{ width: `${progress}%` }}
            >
              <div className="hidden group-hover:block absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
            </div>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 w-8">{formatDuration(lastDurationSec)}</span>
        </div>
      </div>

      {/* 3. Utilities */}
      <div className="flex items-center justify-end gap-6 w-[320px] flex-shrink-0">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3">
            <button onClick={toggleMute} className="text-zinc-500 hover:text-white transition-colors">
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <div className="w-20 h-1 bg-white/10 rounded-full relative">
              <input 
                type="range" 
                value={volume} 
                onChange={(e) => setVolume(Number(e.target.value))}
                className="absolute inset-0 opacity-0 cursor-pointer z-10" 
              />
              <div 
                className={`h-full rounded-full transition-colors ${isMuted ? 'bg-zinc-700' : 'bg-purple-500'}`} 
                style={{ width: `${isMuted ? 0 : volume}%` }} 
              />
            </div>
          </div>
          
          <div className="h-6 w-px bg-white/5" />
          
          <div className="flex items-center gap-2">
            <button className="p-2 border border-white/5 rounded-lg hover:border-purple-500/50 hover:bg-purple-500/5 transition-all text-zinc-500 hover:text-purple-400">
               <Download className="w-4 h-4" />
            </button>
            <button className="p-2 border border-white/5 rounded-lg hover:border-white/20 transition-all text-zinc-500 hover:text-white">
               <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

    </footer>
  );
};

