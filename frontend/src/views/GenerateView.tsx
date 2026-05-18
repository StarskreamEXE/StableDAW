import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles, Command, Layers,
  Mic2, FileAudio, Activity,
  Plus, X, Settings2, Download, RefreshCw, Play, Scissors,
} from 'lucide-react';
import { Section } from '../components/ui/Section';
import { useGenerateStore } from '../state/generateStore';
import { WaveformPreview } from '../components/audio/WaveformPreview';

export const GenerateView: React.FC = () => {
  const initAudioInputRef = useRef<HTMLInputElement | null>(null);
  const [params, setParams] = useState({
    prompt: '',
    negativePrompt: '',
    model: 'medium',
    duration: 30,
    steps: 8,
    cfg: 1.0,
    seed: -1,
    batch: 1,
    shiftMode: 'Flux',
    initNoise: 1.0,
    initType: 'Audio',
    initAudioFile: null as File | null,
    inpaintAudioFile: null as File | null,
    inpaintEnabled: false,
    maskStart: 0,
    maskEnd: 0,
    loras: [{ name: 'Analog_Warmth', weight: 0.8 }]
  });
  const inpaintAudioInputRef = useRef<HTMLInputElement | null>(null);
  const inpaintAudioUrl = useMemo(
    () => (params.inpaintAudioFile ? URL.createObjectURL(params.inpaintAudioFile) : null),
    [params.inpaintAudioFile],
  );
  useEffect(() => {
    return () => {
      if (inpaintAudioUrl) URL.revokeObjectURL(inpaintAudioUrl);
    };
  }, [inpaintAudioUrl]);

  const isGenerating = useGenerateStore((state) => state.isGenerating);
  const statusLabel = useGenerateStore((state) => state.statusLabel);
  const progressPct = useGenerateStore((state) => state.progressPct);
  const error = useGenerateStore((state) => state.error);
  const lastAudioUrl = useGenerateStore((state) => state.lastAudioUrl);
  const lastFilename = useGenerateStore((state) => state.lastFilename);
  const submitGeneration = useGenerateStore((state) => state.submitGeneration);
  const cancelPolling = useGenerateStore((state) => state.cancelPolling);
  const clearResult = useGenerateStore((state) => state.clearResult);

  const handleGenerateClick = () => {
    if (isGenerating) {
      cancelPolling();
      return;
    }
    void submitGeneration(params);
  };

  const handleModelChange = (model: string) => {
    const isRf = model.endsWith('-rf');
    setParams((prev) => ({
      ...prev,
      model,
      // Follow docs defaults: ARC -> 8/1, RF -> 50/7.
      steps: isRf ? 50 : 8,
      cfg: isRf ? 7.0 : 1.0,
    }));
  };

  const handleMagicPrompt = () => {
    if (params.prompt.trim()) {
      return;
    }
    setParams((prev) => ({
      ...prev,
      prompt: 'Cinematic ambient texture, warm analog pads, evolving harmonic motion, detailed stereo field',
    }));
  };

  return (
    <div className="flex flex-col gap-2 h-full text-[11px] pb-0 px-2 pt-2">
      
      <Section title="PRIMARY SYNTHESIS / PROMPT" icon={Command} defaultOpen={true} rightNode={<span className="mono-tag !bg-purple-600/20 !border-purple-500/30 !text-purple-300">RF-ENGINE</span>}>
         <input
           ref={initAudioInputRef}
           type="file"
           accept="audio/*"
           className="hidden"
           onChange={(event) => {
             const file = event.target.files?.[0] ?? null;
             setParams((prev) => ({ ...prev, initAudioFile: file }));
           }}
         />
         <div className="bg-black/40 rounded border border-white/5 focus-within:border-purple-500/50 transition-colors relative group">
            <textarea 
              className="w-full bg-transparent border-none outline-none resize-none p-3 text-[12px] text-zinc-200 placeholder:text-zinc-600 min-h-[80px]"
              placeholder="PROMPT / Describe your soundscape, instrument, or atmosphere..."
              value={params.prompt}
              onChange={(e) => setParams({...params, prompt: e.target.value})}
            />
            <button
              type="button"
              onClick={handleMagicPrompt}
              className="absolute bottom-2 right-2 text-zinc-600 group-focus-within:text-purple-500 hover:text-purple-400"
              title="Auto-fill prompt"
            >
               <Sparkles className="w-3 h-3" />
            </button>
         </div>
         <input 
           type="text" 
           className="compact-input w-full" 
           placeholder="NEGATIVE PROMPT / Avoid specific frequencies, instruments..." 
           value={params.negativePrompt}
           onChange={(e) => setParams({...params, negativePrompt: e.target.value})}
         />
      </Section>

      <Section title="GENERATION PARAMETERS" icon={Settings2} defaultOpen={false}>
         <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1">
               <label className="mono-label">Model</label>
               <select
                 className="compact-input w-full"
                 value={params.model}
                 onChange={(e) => handleModelChange(e.target.value)}
               >
                 <option value="small">Small</option>
                 <option value="medium">Medium</option>
                 <option value="small-rf">Small-RF</option>
                 <option value="medium-rf">Medium-RF</option>
               </select>
            </div>
            <div className="flex flex-col gap-1">
               <label className="mono-label">Duration (s)</label>
               <input
                 type="number"
                 className="compact-input w-full"
                 value={params.duration}
                 onChange={(e) => setParams({...params, duration: parseInt(e.target.value) || 0})}
               />
            </div>
            <div className="flex flex-col gap-1">
               <label className="mono-label">Batch</label>
               <input
                 type="number"
                 className="compact-input w-full"
                 value={params.batch}
                 onChange={(e) => setParams({...params, batch: parseInt(e.target.value) || 1})}
               />
            </div>
            <div className="flex flex-col gap-1">
               <label className="mono-label">Steps</label>
               <input
                 type="number"
                 className="compact-input w-full"
                 value={params.steps}
                 onChange={(e) => setParams({...params, steps: parseInt(e.target.value) || 0})}
               />
            </div>
            <div className="flex flex-col gap-1">
               <label className="mono-label">CFG</label>
               <input
                 type="number"
                 step="0.1"
                 className="compact-input w-full"
                 value={params.cfg}
                 onChange={(e) => setParams({...params, cfg: parseFloat(e.target.value) || 0})}
               />
            </div>
            <div className="flex flex-col gap-1">
              <label className="mono-label">Seed</label>
              <div className="flex gap-1">
                 <input
                   type="text"
                   className="compact-input flex-1 min-w-0"
                   value={params.seed}
                   onChange={(e) => setParams({...params, seed: parseInt(e.target.value) || 0})}
                 />
                 <button
                   className="p-1 bg-white/5 hover:bg-white/10 rounded text-zinc-500 flex-shrink-0"
                   onClick={() => setParams({...params, seed: Math.floor(Math.random() * 100000000)})}
                   title="Random seed"
                 >
                   <RefreshCw className="w-2.5 h-2.5" />
                 </button>
              </div>
           </div>
         </div>
      </Section>

      <Section title="INIT SIGNAL / CONDITIONING" icon={Mic2} defaultOpen={false} rightNode={<span className="mono-tag !text-zinc-500">BYPASS</span>}>
         <div
           className="border border-dashed border-white/10 rounded p-4 flex flex-col items-center justify-center gap-2 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all cursor-pointer"
           onClick={() => initAudioInputRef.current?.click()}
         >
            <FileAudio className="w-5 h-5 text-zinc-600" />
            <span className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase">
              {params.initAudioFile ? `Loaded: ${params.initAudioFile.name}` : 'Drop Source Audio'}
            </span>
         </div>
         <div className="mt-1.5 grid grid-cols-2 gap-2 pt-1.5 border-t border-white/5">
           <div>
              <p className="mono-label mb-0.5 flex justify-between">Init Noise <span className="text-zinc-600">{params.initNoise}</span></p>
              <input 
                type="range" 
                className="pro-slider" 
                min="0" max="1" step="0.01"
                value={params.initNoise}
                onChange={(e) => setParams({...params, initNoise: parseFloat(e.target.value)})}
              />
           </div>
           <div>
               <p className="mono-label mb-0.5">Type</p>
               <select 
                 className="compact-input w-full font-mono text-[9px] uppercase"
                 value={params.initType}
                 onChange={(e) => setParams({...params, initType: e.target.value})}
               >
                 <option>Audio</option>
                 <option>RF-Inv</option>
               </select>
           </div>
        </div>
      </Section>

      <Section
        title="INPAINTING / REGEN REGION"
        icon={Scissors}
        defaultOpen={false}
        rightNode={
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setParams((prev) => ({ ...prev, inpaintEnabled: !prev.inpaintEnabled }));
            }}
            className={`mono-tag ${params.inpaintEnabled ? '!bg-purple-600/30 !text-purple-200 !border-purple-500/50' : '!bg-white/5 !text-zinc-500 !border-white/5'}`}
          >
            {params.inpaintEnabled ? 'ON' : 'OFF'}
          </button>
        }
      >
         <input
           ref={inpaintAudioInputRef}
           type="file"
           accept="audio/*"
           className="hidden"
           onChange={(event) => {
             const file = event.target.files?.[0] ?? null;
             setParams((prev) => ({
               ...prev,
               inpaintAudioFile: file,
               inpaintEnabled: file ? true : prev.inpaintEnabled,
               maskStart: 0,
               maskEnd: 0,
             }));
           }}
         />
         <div className="flex items-center gap-2 mb-1">
           <span className="text-[9px] font-mono text-purple-200 flex-1 truncate">
             {params.inpaintAudioFile ? params.inpaintAudioFile.name : 'No file loaded'}
           </span>
           {params.inpaintAudioFile ? (
             <button
               type="button"
               className="p-0.5 text-zinc-500 hover:text-red-400"
               onClick={() => setParams({ ...params, inpaintAudioFile: null, inpaintEnabled: false, maskStart: 0, maskEnd: 0 })}
               title="Clear inpaint source"
             >
               <X className="w-3 h-3" />
             </button>
           ) : (
             <button
               type="button"
               className="px-1.5 py-0.5 bg-white/5 hover:bg-white/10 rounded text-[8px] uppercase font-bold text-zinc-300"
               onClick={() => inpaintAudioInputRef.current?.click()}
             >
               Load
             </button>
           )}
         </div>
         {inpaintAudioUrl ? (
           <div className="rounded overflow-hidden">
             <WaveformPreview
               audioUrl={inpaintAudioUrl}
               height={48}
               enableRegions
               regionStart={params.maskStart}
               regionEnd={params.maskEnd}
               onRegionChange={(start, end) => setParams((prev) => ({ ...prev, maskStart: start, maskEnd: end }))}
             />
             <div className="flex justify-between text-[9px] font-mono text-purple-300 mt-1 px-0.5">
               <span>Start: {params.maskStart.toFixed(2)}s</span>
               <span>End: {params.maskEnd.toFixed(2)}s</span>
               <span className="text-zinc-600">
                 {params.maskEnd > params.maskStart ? `Region: ${(params.maskEnd - params.maskStart).toFixed(2)}s` : 'Drag to select region'}
               </span>
             </div>
           </div>
         ) : (
           <div
             className="border border-dashed border-white/10 rounded p-3 flex flex-col items-center justify-center gap-1.5 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all cursor-pointer"
             onClick={() => inpaintAudioInputRef.current?.click()}
           >
             <Scissors className="w-4 h-4 text-zinc-600" />
             <span className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase">Drop source to inpaint</span>
             <span className="text-[8px] text-zinc-700 font-mono">Drag a purple region on the waveform to mark the regen window</span>
           </div>
         )}
      </Section>

      <Section title="LORA / ADAPTIVE LAYERS" icon={Layers} defaultOpen={false} rightNode={
        <button className="flex items-center gap-1 px-1 bg-white/5 hover:bg-white/10 rounded text-[8px] uppercase font-bold">
          <Plus className="w-2.5 h-2.5" /> Add
        </button>
      }>
        <div className="space-y-1 mb-2">
           {params.loras.map((lora, i) => (
             <div key={i} className="flex items-center gap-2 bg-black/20 p-1.5 rounded border border-white/5">
                <span className="text-[8px] font-mono text-zinc-400 truncate uppercase w-20">{lora.name}</span>
                <input 
                  type="range" 
                  className="pro-slider flex-1" 
                  min="0" max="1" step="0.01"
                  value={lora.weight}
                  onChange={(e) => {
                    const newLoras = [...params.loras];
                    newLoras[i].weight = parseFloat(e.target.value);
                    setParams({...params, loras: newLoras});
                  }}
                />
                <button 
                  className="text-zinc-700 hover:text-red-500"
                  onClick={() => {
                    const newLoras = params.loras.filter((_, index) => index !== i);
                    setParams({...params, loras: newLoras});
                  }}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
             </div>
           ))}
        </div>
        <button
          className="w-full py-1 border border-dashed border-white/10 rounded text-[8px] uppercase font-bold text-zinc-500 hover:text-zinc-300"
          onClick={() => {
            setParams((prev) => ({
              ...prev,
              loras: [...prev.loras, { name: `Slot_${prev.loras.length + 1}`, weight: 1.0 }],
            }));
          }}
        >
          Add LoRA Slot
        </button>
      </Section>

      {/* Output Status Monitor */}
      {(isGenerating || !!lastAudioUrl || !!error) && (
        <div className="hardware-card border-blue-500/20 mt-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-blue-400" />
              <span className="mono-label">Output Progress</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isGenerating ? 'bg-blue-500 animate-pulse' : error ? 'bg-red-500' : 'bg-emerald-500'}`} />
              <span className={`text-[9px] font-mono ${error ? 'text-red-400' : isGenerating ? 'text-blue-500' : 'text-emerald-400'}`}>
                {error ? 'FAILED' : isGenerating ? 'SAMPLING...' : 'READY'}
              </span>
            </div>
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden mb-2">
             <motion.div
               initial={false}
               animate={{ width: `${Math.max(2, progressPct)}%` }}
               transition={{ duration: 0.2 }}
               className={`h-full ${error ? 'bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.5)]' : 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]'}`}
             />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-zinc-400">
             <span>{error ? error : `${params.model.toUpperCase()} // ${params.steps} steps`}</span>
             <span>{progressPct}%</span>
          </div>
          {lastAudioUrl && (
            <div className="mt-2 border-t border-white/10 pt-2 flex items-center gap-2">
              <audio className="w-full" controls src={lastAudioUrl} />
              <a
                href={lastAudioUrl}
                download={lastFilename || 'output.wav'}
                className="p-2 rounded bg-white/5 hover:bg-white/10 text-zinc-300"
                title="Download output"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
              <button
                className="p-2 rounded bg-white/5 hover:bg-white/10 text-zinc-300"
                onClick={clearResult}
                title="Clear output"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Sticky RUN CTA — button bottom hugs view bottom (= log top). Height 40 so its TOP aligns with spectrum top (spectrum 220 = log 180 + button 40). */}
      <div className="sticky bottom-0 -mx-2 -mb-0 mt-2 z-20">
        <button
          onClick={handleGenerateClick}
          className={`w-full rounded-none font-black uppercase tracking-widest text-[12px] flex items-center justify-center gap-2 transition-all
            ${isGenerating ? 'bg-red-600/30 border-t border-red-500/50 text-red-300 hover:bg-red-600/50' : 'btn-primary !rounded-none'}`}
          style={{ height: '40px' }}
        >
          {isGenerating ? <X className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          {isGenerating ? `ABORT (${progressPct}%)` : 'RUN GENERATION'}
        </button>
      </div>

    </div>
  );
};
