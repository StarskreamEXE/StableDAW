import React, { useEffect, useRef, useState } from 'react';
import { Terminal, ChevronDown, ChevronUp, Trash2, Download } from 'lucide-react';
import { useLogStore, type LogLevel, type LogEntry } from '../../state/logStore';

const levelStyles: Record<LogLevel, string> = {
  info: 'text-zinc-300 border-l-2 border-purple-500/60',
  warn: 'text-amber-300 border-l-2 border-amber-500/70',
  error: 'text-red-300 border-l-2 border-red-500/70',
  debug: 'text-zinc-500 border-l-2 border-zinc-700',
};

const formatTime = (ts: number): string => {
  const d = new Date(ts);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ss = d.getSeconds().toString().padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};

const formatTimestampForFile = (): string => {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

const entryToLine = (e: LogEntry): string => {
  return `${new Date(e.ts).toISOString()} [${e.level.toUpperCase().padEnd(5)}] [${e.source}] ${e.msg}`;
};

const downloadLog = (entries: LogEntry[]): void => {
  if (entries.length === 0) return;
  const body = entries.map(entryToLine).join('\n') + '\n';
  const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stabledaw-log-${formatTimestampForFile()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const ProcessingLog: React.FC = () => {
  const entries = useLogStore((s) => s.entries);
  const clear = useLogStore((s) => s.clear);
  const [isOpen, setIsOpen] = useState(true);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const el = bodyRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [entries, isOpen]);

  return (
    <div className="border-t-2 border-purple-500/30 bg-[#0a080f] flex-shrink-0 flex flex-col">
      {/* Header — ALWAYS visible. Click anywhere on it to toggle. */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={`w-full flex items-center justify-between px-2 py-1.5 text-left transition-colors ${
          isOpen ? 'bg-black/40 hover:bg-black/60' : 'bg-purple-500/15 hover:bg-purple-500/25'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <Terminal className={`w-3.5 h-3.5 ${isOpen ? 'text-zinc-400' : 'text-purple-300'}`} />
          <span className={`text-[10px] font-black uppercase tracking-widest ${isOpen ? 'text-zinc-300' : 'text-purple-200'}`}>
            Processing Log
          </span>
          <span className="text-[9px] font-mono text-zinc-500">[{entries.length}]</span>
          {!isOpen && (
            <span className="text-[9px] font-mono text-purple-200 uppercase ml-2">— click to expand</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isOpen && (
            <>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); downloadLog(entries); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); downloadLog(entries); } }}
                className="p-0.5 text-zinc-600 hover:text-purple-400 transition-colors cursor-pointer"
                title="Download log as .txt"
              >
                <Download className="w-3 h-3" />
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); clear(); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); clear(); } }}
                className="p-0.5 text-zinc-600 hover:text-red-400 transition-colors cursor-pointer"
                title="Clear log"
              >
                <Trash2 className="w-3 h-3" />
              </span>
            </>
          )}
          {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronUp className="w-3.5 h-3.5 text-purple-300" />}
        </div>
      </button>
      {isOpen && (
        <div
          ref={bodyRef}
          className="overflow-y-auto px-2 py-1 font-mono text-[9px] space-y-0.5 bg-black/60"
          style={{ height: '180px' }}
        >
          {entries.length === 0 ? (
            <p className="text-zinc-700 italic">Waiting for signal...</p>
          ) : (
            entries.map((e) => (
              <p key={e.id} className={`pl-2 ${levelStyles[e.level]}`}>
                <span className="text-zinc-600">{formatTime(e.ts)}</span>{' '}
                <span className="text-zinc-500 uppercase">[{e.source}]</span>{' '}
                <span>{e.msg}</span>
              </p>
            ))
          )}
        </div>
      )}
    </div>
  );
};
