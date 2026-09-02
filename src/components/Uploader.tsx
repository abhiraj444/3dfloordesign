import React, { useState, useRef } from 'react';
import { FloorPlanData, LLMProviderConfig, AIStreamInputPayload } from '../types';
import { SAMPLE_PLANS } from '../data/samples';
import { PROVIDERS, getDefaultLLMConfig, getSavedLLMConfig } from '../data/llmProviders';
import { extractFloorPlanStream } from '../utils/aiClient';
import { optimizeFloorPlanImage } from '../utils/imageOptimizer';
import { AIStreamInspector } from './AIStreamInspector';
import {
  Upload,
  Sparkles,
  AlertCircle,
  FileText,
  Layers,
  ArrowRight,
  Zap,
  Settings2,
  Camera,
  KeyRound,
  ChevronRight,
  ImageIcon,
  Loader2,
  RefreshCw,
  Terminal,
} from 'lucide-react';

interface UploaderProps {
  onPlanExtracted: (plan: FloorPlanData, imagePreview?: string) => void;
  onUseSample: (sampleKey: string) => void;
  llmConfig?: LLMProviderConfig;
  currentProviderConfig?: LLMProviderConfig;
  onOpenSettings?: () => void;
  onOpenProviderSettings?: () => void;
}

export const Uploader: React.FC<UploaderProps> = ({
  onPlanExtracted,
  onUseSample,
  llmConfig: propLlmConfig,
  currentProviderConfig,
  onOpenSettings: propOnOpenSettings,
  onOpenProviderSettings,
}) => {
  // Safe resolution of configuration and modal handlers
  const activeLlmConfig: LLMProviderConfig =
    propLlmConfig || currentProviderConfig || getSavedLLMConfig() || getDefaultLLMConfig();
  const openSettings = propOnOpenSettings || onOpenProviderSettings || (() => {});

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [imageSizeInfo, setImageSizeInfo] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStep, setExtractionStep] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // 3-Box Real-Time Stream Inspector State
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [inputPayload, setInputPayload] = useState<AIStreamInputPayload | null>(null);
  const [reasoningStream, setReasoningStream] = useState<string>('');
  const [rawContentStream, setRawContentStream] = useState<string>('');
  const [extractedPlan, setExtractedPlan] = useState<FloorPlanData | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const steps = [
    'Scanning architectural boundary & outer walls...',
    'Extracting room labels & dimension callouts...',
    'Mapping door openings, hallways & balconies...',
    'Synthesizing canonical 3D layout coordinates...',
  ];

  const currentProviderMeta = PROVIDERS[activeLlmConfig.provider] || PROVIDERS.openrouter;
  const hasKey = Boolean(activeLlmConfig.apiKey?.trim()) || activeLlmConfig.provider === 'custom';

  const handleFileChange = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPEG, PNG, WebP).');
      return;
    }
    setError(null);
    setIsOptimizing(true);

    try {
      const optimized = await optimizeFloorPlanImage(file, 1800, 0.88);
      setSelectedImage(optimized.base64Url);
      setMimeType(optimized.mimeType);
      const kbSize = Math.round(optimized.optimizedSize / 1024);
      setImageSizeInfo(`Optimized: ${kbSize} KB`);
    } catch (err: any) {
      console.warn('Image optimization fallback:', err);
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
        setMimeType(file.type || 'image/jpeg');
      };
      reader.readAsDataURL(file);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleStartExtraction = async () => {
    if (!selectedImage) return;

    // Verify if API key is provided
    if (!hasKey) {
      setError(`Please enter your ${currentProviderMeta.name} API key to start extraction.`);
      openSettings();
      return;
    }

    setIsExtracting(true);
    setError(null);
    setExtractionStep(0);
    setReasoningStream('');
    setRawContentStream('');
    setExtractedPlan(null);
    setIsInspectorOpen(true); // Open the 3-Box Response Inspector!

    // Step simulation intervals for responsive feedback
    const interval = setInterval(() => {
      setExtractionStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 1500);

    try {
      const plan = await extractFloorPlanStream(
        selectedImage,
        mimeType,
        userPrompt,
        activeLlmConfig,
        {
          onInput: (input) => {
            setInputPayload(input);
          },
          onReasoningChunk: (_chunk, accumulated) => {
            setReasoningStream(accumulated);
          },
          onContentChunk: (_chunk, accumulated) => {
            setRawContentStream(accumulated);
          },
          onDone: (finalPlan, rawText) => {
            setExtractedPlan(finalPlan);
            if (rawText) setRawContentStream(rawText);
          },
          onError: (errMsg) => {
            setError(errMsg);
          },
        }
      );

      clearInterval(interval);
      setExtractedPlan(plan);
      // Plan is ready in inspector
    } catch (err: any) {
      clearInterval(interval);
      console.error('AI extraction error:', err);
      const msg = err.message || 'Error occurred while processing the floor plan image.';
      if (
        msg.includes('API key') ||
        msg.includes('unauthorized') ||
        msg.includes('401') ||
        msg.includes('Authentication failed')
      ) {
        setError(msg);
        openSettings();
      } else {
        setError(msg);
      }
    } finally {
      setIsExtracting(false);
    }
  };

  const handleApplyPlanFromInspector = (plan: FloorPlanData) => {
    setIsInspectorOpen(false);
    if (selectedImage) {
      onPlanExtracted(plan, selectedImage);
    } else {
      onPlanExtracted(plan);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-5 sm:space-y-7 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold tracking-wide">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Multimodal Architectural Vision Engine</span>
        </div>
        <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
          2D Floor Plan <span className="text-amber-400">→</span> 3D Walkthrough
        </h1>
        <p className="text-neutral-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed px-1">
          Upload any architectural blueprint or sketch to generate an interactive 3D model with realistic walls,
          furnishings, and first-person walkthrough.
        </p>
      </div>

      {/* Active AI Provider Status Pill */}
      <div
        id="active-provider-pill"
        onClick={openSettings}
        className="cursor-pointer bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/50 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-lg transition-all group"
      >
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="text-xs text-neutral-400 font-medium">Vision Engine:</span>
              <span className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                {currentProviderMeta.name}
              </span>
              <span className="text-[10px] sm:text-[11px] font-mono text-neutral-400 bg-neutral-800 px-1.5 sm:px-2 py-0.5 rounded border border-neutral-700 max-w-[150px] sm:max-w-[220px] truncate">
                {activeLlmConfig.model || currentProviderMeta.defaultModel}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              {hasKey ? (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  API Key Configured & Ready
                </span>
              ) : (
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <KeyRound className="w-3 h-3 shrink-0" />
                  Click to add API Key (OpenRouter, Groq, Gemini, OpenAI)
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-center">
          <span className="text-xs font-semibold text-amber-400 group-hover:text-amber-300 flex items-center gap-1">
            <Settings2 className="w-3.5 h-3.5" />
            <span>Settings</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>

      {/* Main Upload Dropzone */}
      <div className="bg-neutral-900/90 rounded-2xl sm:rounded-3xl border border-neutral-800 p-4 sm:p-7 shadow-2xl space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
        />

        {isOptimizing ? (
          <div className="p-8 sm:p-12 text-center rounded-2xl border border-neutral-800 bg-neutral-950/60 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
            <p className="text-sm font-semibold text-white">Preparing & Optimizing Image...</p>
            <p className="text-xs text-neutral-400">Scaling for rapid AI visual reasoning</p>
          </div>
        ) : !selectedImage ? (
          <div className="space-y-3">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-700 hover:border-amber-500/80 rounded-2xl p-5 sm:p-8 md:p-10 text-center cursor-pointer transition-all duration-200 bg-neutral-950/40 hover:bg-neutral-950/80 group"
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-neutral-800 group-hover:bg-amber-500/20 text-neutral-400 group-hover:text-amber-400 flex items-center justify-center mx-auto transition-colors duration-200 mb-3 sm:mb-4 shadow-inner">
                <Upload className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                Tap or Drag & Drop Floor Plan Image
              </h3>
              <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
                Supports Indian builder plans, blueprints, CAD exports, or hand-drawn sketches (JPG, PNG, WebP).
              </p>
            </div>

            {/* Quick Action Buttons for Tablet / Mobile / Desktop */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 py-2.5 sm:py-3 px-3 sm:px-4 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-xl text-xs font-semibold text-neutral-200 active:scale-98 transition"
              >
                <Camera className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Camera Photo</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 py-2.5 sm:py-3 px-3 sm:px-4 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-xl text-xs font-semibold text-neutral-200 active:scale-98 transition"
              >
                <Upload className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Browse Files</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Image Preview Card */}
            <div className="relative rounded-2xl overflow-hidden border border-neutral-700 bg-neutral-950 max-h-72 sm:max-h-80 flex items-center justify-center p-2">
              <img
                src={selectedImage}
                alt="Floor plan preview"
                className="max-h-60 sm:max-h-72 object-contain rounded-lg"
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 bg-neutral-900/90 text-neutral-300 border border-neutral-700 rounded-lg text-[10px] font-mono backdrop-blur-md">
                {imageSizeInfo || 'Image Ready'}
              </div>
              <button
                onClick={() => {
                  setSelectedImage(null);
                  setError(null);
                }}
                className="absolute top-3 right-3 px-3 py-1 bg-neutral-900/90 hover:bg-red-950 text-neutral-300 hover:text-red-300 border border-neutral-700 rounded-lg text-xs font-semibold backdrop-blur-md transition"
              >
                Change Image
              </button>
            </div>

            {/* Optional AI Notes / Instructions */}
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">
                Optional Guidance Notes for AI Parser
              </label>
              <input
                type="text"
                placeholder="e.g. 3 BHK with 2 Balconies, Master bedroom is on the top-right"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Extract Action Button */}
            <button
              id="start-extract-btn"
              onClick={handleStartExtraction}
              disabled={isExtracting}
              className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-extrabold rounded-xl sm:rounded-2xl shadow-xl flex items-center justify-center space-x-2 transition-all disabled:opacity-50 active:scale-98"
            >
              <Sparkles className="w-5 h-5 text-neutral-950 shrink-0" />
              <span className="text-xs sm:text-base font-bold">
                {isExtracting ? 'Synthesizing 3D Architectural Model...' : 'Generate 3D Architectural Model'}
              </span>
            </button>
          </div>
        )}

        {/* Loading Step Progress */}
        {isExtracting && (
          <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-3 animate-pulse">
            <div className="flex items-center space-x-3 text-amber-400 font-semibold text-xs sm:text-sm">
              <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" />
              <span className="line-clamp-1">{steps[extractionStep]}</span>
            </div>
            <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full transition-all duration-500 rounded-full"
                style={{ width: `${((extractionStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 sm:p-4 bg-red-950/70 border border-red-500/50 rounded-2xl flex items-start space-x-3 text-red-200 text-xs sm:text-sm">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1 min-w-0">
              <p className="font-semibold text-red-300">Extraction Issue</p>
              <p className="break-words leading-relaxed">{error}</p>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={openSettings}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg text-xs transition"
                >
                  Configure API Key / Endpoint
                </button>
                {selectedImage && (
                  <button
                    type="button"
                    onClick={handleStartExtraction}
                    className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium rounded-lg text-xs transition"
                  >
                    Retry Analysis
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Start Presets / Sample Plans */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs sm:text-sm md:text-base font-bold text-white">Instant Reference Plans</h2>
          </div>
          <span className="text-[11px] text-neutral-400">Ready to explore without API key</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(SAMPLE_PLANS).map(([key, sample]) => (
            <div
              key={key}
              id={`sample-plan-card-${key}`}
              onClick={() => onUseSample(key)}
              className="bg-neutral-900/80 hover:bg-neutral-800/90 border border-neutral-800 hover:border-amber-500/60 rounded-2xl p-4 cursor-pointer transition-all duration-200 shadow-lg flex flex-col justify-between group active:scale-98"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 uppercase tracking-wider">
                    {sample.tag}
                  </span>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    {sample.data.rooms.length} Rooms
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                  {sample.title}
                </h3>
                <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                  {sample.description}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-neutral-800/80 flex items-center justify-between text-xs text-amber-400 font-medium">
                <span>Open 3D Model</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating 3-Box Stream Inspector Button (if active or generated) */}
      {(isExtracting || rawContentStream || reasoningStream) && !isInspectorOpen && (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-8 z-30 animate-bounce">
          <button
            onClick={() => setIsInspectorOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-neutral-900/95 hover:bg-neutral-800 text-amber-400 font-bold text-xs rounded-full border border-amber-500/50 shadow-2xl backdrop-blur-xl transition"
          >
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>Open AI Stream Inspector (3-Box View)</span>
          </button>
        </div>
      )}

      {/* 3-Box Response Stream Inspector Modal */}
      <AIStreamInspector
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        inputPayload={inputPayload}
        reasoningStream={reasoningStream}
        rawContentStream={rawContentStream}
        isStreaming={isExtracting}
        error={error}
        parsedPlan={extractedPlan}
        onApplyPlan={handleApplyPlanFromInspector}
        onRetry={handleStartExtraction}
      />
    </div>
  );
};
