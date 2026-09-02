import React, { useState, useEffect, useRef } from 'react';
import {
  BrainCircuit,
  Terminal,
  FileCode,
  Sparkles,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  X,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Cpu,
  Zap,
  Globe,
  ImageIcon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AIStreamInputPayload, FloorPlanData, LLMProviderType } from '../types';
import { PROVIDERS } from '../data/llmProviders';

interface AIStreamInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  inputPayload: AIStreamInputPayload | null;
  reasoningStream: string;
  rawContentStream: string;
  isStreaming: boolean;
  error: string | null;
  parsedPlan: FloorPlanData | null;
  onApplyPlan: (plan: FloorPlanData) => void;
  onRetry: () => void;
}

export const AIStreamInspector: React.FC<AIStreamInspectorProps> = ({
  isOpen,
  onClose,
  inputPayload,
  reasoningStream,
  rawContentStream,
  isStreaming,
  error,
  parsedPlan,
  onApplyPlan,
  onRetry,
}) => {
  const [activeBox, setActiveBox] = useState<'all' | 'input' | 'reasoning' | 'output'>('all');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);

  const reasoningScrollRef = useRef<HTMLDivElement>(null);
  const outputScrollRef = useRef<HTMLDivElement>(null);

  // Timer for generation duration
  useEffect(() => {
    let interval: any = null;
    if (isStreaming) {
      setElapsedSeconds(0);
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStreaming]);

  // Auto-scroll reasoning stream
  useEffect(() => {
    if (reasoningScrollRef.current && isStreaming) {
      reasoningScrollRef.current.scrollTop = reasoningScrollRef.current.scrollHeight;
    }
  }, [reasoningStream, isStreaming]);

  // Auto-scroll output stream
  useEffect(() => {
    if (outputScrollRef.current && isStreaming) {
      outputScrollRef.current.scrollTop = outputScrollRef.current.scrollHeight;
    }
  }, [rawContentStream, isStreaming]);

  if (!isOpen) return null;

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const providerMeta = inputPayload
    ? PROVIDERS[inputPayload.provider] || PROVIDERS.openrouter
    : PROVIDERS.openrouter;

  const reasoningWordCount = reasoningStream.trim().length > 0
    ? reasoningStream.trim().split(/\s+/).length
    : 0;

  const outputCharCount = rawContentStream.length;

  return (
    <div
      id="ai-stream-inspector-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
    >
      <div
        id="ai-stream-inspector-modal"
        className={`relative w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
          isExpanded ? 'h-[98vh] max-w-[98vw]' : 'h-[92vh] max-w-6xl'
        }`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-neutral-800 bg-neutral-900/90 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isStreaming
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
                  : parsedPlan
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
              }`}
            >
              {isStreaming ? (
                <Sparkles className="w-5 h-5 animate-spin" />
              ) : (
                <BrainCircuit className="w-5 h-5" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                  AI Architectural Stream Inspector
                </h2>
                {isStreaming && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    LIVE STREAMING
                  </span>
                )}
                {parsedPlan && !isStreaming && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <CheckCircle2 className="w-3 h-3" />
                    SYNTHESIS COMPLETE ({parsedPlan.rooms.length} Rooms)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 truncate">
                Provider: <span className="text-neutral-200 font-semibold">{providerMeta.name}</span> | Model: <span className="text-neutral-300 font-mono">{inputPayload?.model || 'default'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            {/* Box Filter Switcher on Desktop */}
            <div className="hidden md:flex items-center bg-neutral-900 border border-neutral-800 p-0.5 rounded-lg text-xs mr-2">
              <button
                onClick={() => setActiveBox('all')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                  activeBox === 'all'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                3-Box View
              </button>
              <button
                onClick={() => setActiveBox('input')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                  activeBox === 'input'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                1. Input
              </button>
              <button
                onClick={() => setActiveBox('reasoning')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                  activeBox === 'reasoning'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                2. Reasoning
              </button>
              <button
                onClick={() => setActiveBox('output')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                  activeBox === 'output'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                3. Raw Output
              </button>
            </div>

            {/* Time Elapsed Counter */}
            <div className="flex items-center gap-1 text-[11px] font-mono text-neutral-400 bg-neutral-900 px-2 py-1 rounded-lg border border-neutral-800">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>{elapsedSeconds}s</span>
            </div>

            {/* Expand / Maximize Toggle */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
              title={isExpanded ? 'Restore window size' : 'Maximize window'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
              title="Close Stream Inspector"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Tabs Switcher */}
        <div className="flex md:hidden border-b border-neutral-800 bg-neutral-900/60 px-3 py-1.5 gap-1 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveBox('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 ${
              activeBox === 'all'
                ? 'bg-amber-500 text-neutral-950'
                : 'bg-neutral-800 text-neutral-400'
            }`}
          >
            All Boxes
          </button>
          <button
            onClick={() => setActiveBox('input')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 ${
              activeBox === 'input'
                ? 'bg-amber-500 text-neutral-950'
                : 'bg-neutral-800 text-neutral-400'
            }`}
          >
            1. Input
          </button>
          <button
            onClick={() => setActiveBox('reasoning')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 ${
              activeBox === 'reasoning'
                ? 'bg-amber-500 text-neutral-950'
                : 'bg-neutral-800 text-neutral-400'
            }`}
          >
            2. Reasoning
          </button>
          <button
            onClick={() => setActiveBox('output')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 ${
              activeBox === 'output'
                ? 'bg-amber-500 text-neutral-950'
                : 'bg-neutral-800 text-neutral-400'
            }`}
          >
            3. Raw Output
          </button>
        </div>

        {/* 3-Box Main Body Grid */}
        <div
          id="inspector-boxes-container"
          className={`flex-1 p-3 sm:p-5 overflow-y-auto gap-4 ${
            activeBox === 'all'
              ? 'grid grid-cols-1 lg:grid-cols-3'
              : 'flex flex-col'
          }`}
        >
          {/* ============================================================ */}
          {/* BOX 1: INPUT FIELD / PAYLOAD                                */}
          {/* ============================================================ */}
          {(activeBox === 'all' || activeBox === 'input') && (
            <div
              id="stream-box-1-input"
              className="flex flex-col bg-neutral-900/80 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg"
            >
              {/* Box 1 Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800 bg-neutral-900 sticky top-0 z-10">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-bold font-mono">
                    1
                  </div>
                  <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                    Input Field & Instructions
                  </span>
                </div>
                <button
                  onClick={() =>
                    handleCopy(
                      JSON.stringify(inputPayload, null, 2),
                      'input'
                    )
                  }
                  className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 text-xs flex items-center gap-1"
                  title="Copy Input Payload"
                >
                  {copiedSection === 'input' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span className="text-[10px]">Copy</span>
                </button>
              </div>

              {/* Box 1 Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
                {/* Provider & Model Meta Badge */}
                <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400 flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5 text-blue-400" /> LLM Target:
                    </span>
                    <span className="font-semibold text-white font-mono">{providerMeta.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-400" /> Model ID:
                    </span>
                    <span className="font-mono text-neutral-300 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800 truncate max-w-[200px]">
                      {inputPayload?.model || 'default'}
                    </span>
                  </div>
                  {inputPayload?.baseUrl && (
                    <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80">
                      <span className="text-neutral-400 flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-emerald-400" /> Endpoint:
                      </span>
                      <span className="font-mono text-[11px] text-neutral-400 truncate max-w-[180px]">
                        {inputPayload.baseUrl}
                      </span>
                    </div>
                  )}
                </div>

                {/* Uploaded Image Metadata & Preview Thumbnail */}
                {inputPayload?.imageInfo && (
                  <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400 flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5 text-purple-400" /> Image Payload:
                      </span>
                      <span className="text-[11px] font-mono text-neutral-300">
                        {inputPayload.imageInfo.mimeType} (~{inputPayload.imageInfo.sizeKb} KB)
                      </span>
                    </div>
                    {inputPayload.imageInfo.previewUrl && (
                      <div className="relative rounded-lg overflow-hidden border border-neutral-800 max-h-32 bg-neutral-900 flex items-center justify-center p-1">
                        <img
                          src={inputPayload.imageInfo.previewUrl}
                          alt="Input floor plan"
                          className="max-h-28 object-contain rounded"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* User Prompt / Guidance */}
                <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-1">
                  <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                    User Guidance Note:
                  </div>
                  <p className="text-neutral-200 font-mono text-xs italic bg-neutral-900/90 p-2 rounded-lg border border-neutral-800/80">
                    {inputPayload?.userPrompt || '(No additional user notes specified)'}
                  </p>
                </div>

                {/* Architectural System Prompt */}
                <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                      Architectural System Prompt
                    </span>
                    <button
                      onClick={() => setShowSystemPrompt(!showSystemPrompt)}
                      className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-0.5"
                    >
                      {showSystemPrompt ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {showSystemPrompt ? 'Hide' : 'Inspect'}
                    </button>
                  </div>
                  {showSystemPrompt && (
                    <pre className="text-[10px] font-mono text-neutral-400 bg-neutral-900 p-2 rounded-lg border border-neutral-800 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                      {inputPayload?.systemInstruction || 'Canonical Indian & Global Architectural parser instructions...'}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* BOX 2: REASONING & CHAIN OF THOUGHT STREAM                  */}
          {/* ============================================================ */}
          {(activeBox === 'all' || activeBox === 'reasoning') && (
            <div
              id="stream-box-2-reasoning"
              className="flex flex-col bg-neutral-900/80 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg"
            >
              {/* Box 2 Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800 bg-neutral-900 sticky top-0 z-10">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-xs font-bold font-mono">
                    2
                  </div>
                  <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                    Reasoning & Chain-of-Thought
                    {isStreaming && (
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                    )}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono text-neutral-400 bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-800">
                    {reasoningWordCount} words
                  </span>
                  <button
                    onClick={() => handleCopy(reasoningStream, 'reasoning')}
                    className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 text-xs flex items-center gap-1"
                    title="Copy Reasoning Output"
                  >
                    {copiedSection === 'reasoning' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span className="text-[10px]">Copy</span>
                  </button>
                </div>
              </div>

              {/* Box 2 Content: Live Terminal-Style Reasoning Stream */}
              <div
                ref={reasoningScrollRef}
                className="flex-1 overflow-y-auto p-4 bg-neutral-950 text-indigo-200 font-mono text-xs leading-relaxed space-y-2 select-text"
              >
                {reasoningStream ? (
                  <div className="whitespace-pre-wrap break-words">
                    {reasoningStream}
                    {isStreaming && (
                      <span className="inline-block w-2 h-3.5 bg-indigo-400 ml-1 animate-pulse align-middle" />
                    )}
                  </div>
                ) : isStreaming ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center text-neutral-500 space-y-3">
                    <Sparkles className="w-6 h-6 text-indigo-400 animate-spin" />
                    <p className="text-xs text-indigo-300/80">Connecting to reasoning channel...</p>
                    <p className="text-[11px] text-neutral-500">
                      Analyzing pixel grid, dimension callouts & spatial boundaries
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center text-neutral-500 space-y-2">
                    <BrainCircuit className="w-6 h-6 text-neutral-600" />
                    <p className="text-xs text-neutral-400">
                      Reasoning output is ready once generation starts.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* BOX 3: RAW OUTPUT FIELD / GENERATED JSON                    */}
          {/* ============================================================ */}
          {(activeBox === 'all' || activeBox === 'output') && (
            <div
              id="stream-box-3-output"
              className="flex flex-col bg-neutral-900/80 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg"
            >
              {/* Box 3 Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800 bg-neutral-900 sticky top-0 z-10">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold font-mono">
                    3
                  </div>
                  <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                    Raw Output Field (JSON)
                    {isStreaming && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono text-neutral-400 bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-800">
                    {outputCharCount} chars
                  </span>
                  <button
                    onClick={() => handleCopy(rawContentStream, 'output')}
                    className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 text-xs flex items-center gap-1"
                    title="Copy Raw Output"
                  >
                    {copiedSection === 'output' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span className="text-[10px]">Copy</span>
                  </button>
                </div>
              </div>

              {/* Box 3 Content: Live JSON Output Stream */}
              <div
                ref={outputScrollRef}
                className="flex-1 overflow-y-auto p-4 bg-neutral-950 text-emerald-300 font-mono text-xs leading-relaxed space-y-2 select-text"
              >
                {rawContentStream ? (
                  <pre className="whitespace-pre-wrap break-words text-[11px] sm:text-xs">
                    {rawContentStream}
                    {isStreaming && (
                      <span className="inline-block w-2 h-3.5 bg-emerald-400 ml-1 animate-pulse align-middle" />
                    )}
                  </pre>
                ) : isStreaming ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center text-neutral-500 space-y-3">
                    <Terminal className="w-6 h-6 text-emerald-400 animate-pulse" />
                    <p className="text-xs text-emerald-300/80">Streaming raw architectural coordinates...</p>
                    <p className="text-[11px] text-neutral-500">
                      Constructing rooms, walls, door arcs, and boundaries
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center text-neutral-500 space-y-2">
                    <FileCode className="w-6 h-6 text-neutral-600" />
                    <p className="text-xs text-neutral-400">
                      Raw response stream will appear live here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Error Alert Bar (if failure occurred) */}
        {error && (
          <div className="mx-4 sm:mx-6 mb-3 p-3 bg-red-950/80 border border-red-500/50 rounded-xl flex items-center justify-between text-xs text-red-200 shrink-0">
            <div className="flex items-center space-x-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="font-semibold truncate">{error}</span>
            </div>
            <button
              onClick={onRetry}
              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg shrink-0 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Footer Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-t border-neutral-800 bg-neutral-900 shrink-0">
          <div className="flex items-center gap-2 text-xs text-neutral-400 w-full sm:w-auto">
            {isStreaming ? (
              <div className="flex items-center gap-2 text-amber-400 font-medium">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Live streaming token streams in real-time...</span>
              </div>
            ) : parsedPlan ? (
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Successfully parsed {parsedPlan.rooms.length} rooms & {parsedPlan.doors.length} doors
                </span>
              </div>
            ) : (
              <span>Ready for generation.</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            >
              {parsedPlan ? 'Close Inspector' : 'Cancel'}
            </button>

            {parsedPlan && (
              <button
                id="apply-inspected-plan-btn"
                onClick={() => onApplyPlan(parsedPlan)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                Apply & Open in 3D Dollhouse
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
