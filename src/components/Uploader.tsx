import React, { useState, useRef } from 'react';
import { FloorPlanData, LLMProviderConfig } from '../types';
import { SAMPLE_PLANS } from '../data/samples';
import { PROVIDERS } from '../data/llmProviders';
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
} from 'lucide-react';

interface UploaderProps {
  onPlanExtracted: (plan: FloorPlanData, imagePreview?: string) => void;
  onUseSample: (sampleKey: string) => void;
  llmConfig: LLMProviderConfig;
  onOpenSettings: () => void;
}

export const Uploader: React.FC<UploaderProps> = ({
  onPlanExtracted,
  onUseSample,
  llmConfig,
  onOpenSettings,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [userPrompt, setUserPrompt] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStep, setExtractionStep] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const steps = [
    'Scanning wall contours & building perimeter...',
    'Reading room labels & feet-inch dimension strings...',
    'Classifying architectural room types & door swings...',
    'Synthesizing canonical 3D layout coordinates...',
  ];

  const currentProviderMeta = PROVIDERS[llmConfig.provider] || PROVIDERS.openrouter;
  const hasKey = Boolean(llmConfig.apiKey?.trim()) || llmConfig.provider === 'custom';

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPEG, PNG, WebP).');
      return;
    }
    setError(null);
    setMimeType(file.type);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setSelectedImage(result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleStartExtraction = async () => {
    if (!selectedImage) return;

    // Check if API key is entered
    if (!hasKey) {
      setError(`Please enter your ${currentProviderMeta.name} API key to start extraction.`);
      onOpenSettings();
      return;
    }

    setIsExtracting(true);
    setError(null);
    setExtractionStep(0);

    // Step simulation intervals for smooth UX feedback
    const interval = setInterval(() => {
      setExtractionStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 1400);

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: selectedImage,
          mimeType,
          userPrompt: userPrompt.trim() || undefined,
          providerConfig: llmConfig,
        }),
      });

      const data = await response.json();

      clearInterval(interval);

      if (!response.ok || !data.success) {
        if (data.needsApiKey) {
          onOpenSettings();
        }
        throw new Error(data.error || 'Failed to extract floor plan from image.');
      }

      onPlanExtracted(data.data, selectedImage);
    } catch (err: any) {
      clearInterval(interval);
      console.error('AI extraction error:', err);
      setError(err.message || 'Error occurred while processing the floor plan image.');
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 md:py-10 space-y-6 md:space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="text-center space-y-2 md:space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold tracking-wide">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Multimodal Architectural Vision Engine</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          2D Floor Plan <span className="text-amber-400">→</span> 3D Walkthrough
        </h1>
        <p className="text-neutral-400 text-xs sm:text-base max-w-xl mx-auto leading-relaxed px-2">
          Upload any architectural blueprint or sketch to generate an interactive 3D model with realistic walls,
          furnishings, and first-person walkthrough.
        </p>
      </div>

      {/* Active AI Provider Status Pill */}
      <div
        id="active-provider-pill"
        onClick={onOpenSettings}
        className="cursor-pointer bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/50 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg transition-all group"
      >
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400 font-medium">Active AI Vision:</span>
              <span className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                {currentProviderMeta.name}
              </span>
              <span className="text-[11px] font-mono text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700 max-w-[140px] sm:max-w-[220px] truncate">
                {llmConfig.model || currentProviderMeta.defaultModel}
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              {hasKey ? (
                <span className="text-emerald-400 font-medium">✓ API Key Configured</span>
              ) : (
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <KeyRound className="w-3 h-3 inline" /> Click to add API Key (OpenRouter, Groq, Gemini, OpenAI)
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-end sm:self-center">
          <span className="text-xs font-semibold text-amber-400 group-hover:text-amber-300 flex items-center gap-1">
            <Settings2 className="w-3.5 h-3.5" />
            Provider Settings
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>

      {/* Main Upload Dropzone */}
      <div className="bg-neutral-900/90 rounded-2xl sm:rounded-3xl border border-neutral-800 p-4 sm:p-8 shadow-2xl space-y-5">
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

        {!selectedImage ? (
          <div className="space-y-3">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-700 hover:border-amber-500/80 rounded-2xl p-6 sm:p-10 text-center cursor-pointer transition-all duration-200 bg-neutral-950/40 hover:bg-neutral-950/80 group"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-neutral-800 group-hover:bg-amber-500/20 text-neutral-400 group-hover:text-amber-400 flex items-center justify-center mx-auto transition-colors duration-200 mb-3 sm:mb-4 shadow-inner">
                <Upload className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                Tap or Drag & Drop Floor Plan Image
              </h3>
              <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
                Supports Indian builder plans, architectural blueprints, CAD exports, or sketches (JPG, PNG, WebP).
              </p>
            </div>

            {/* Mobile Camera Quick Action */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 sm:hidden inline-flex items-center justify-center gap-2 py-3 px-4 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-xl text-xs font-semibold text-neutral-200 active:scale-98 transition"
              >
                <Camera className="w-4 h-4 text-amber-400" />
                Take Photo with Camera
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 sm:hidden inline-flex items-center justify-center gap-2 py-3 px-4 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-xl text-xs font-semibold text-neutral-200 active:scale-98 transition"
              >
                <Upload className="w-4 h-4 text-amber-400" />
                Browse Gallery
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-5">
            {/* Image Preview Card */}
            <div className="relative rounded-2xl overflow-hidden border border-neutral-700 bg-neutral-950 max-h-72 sm:max-h-80 flex items-center justify-center p-2">
              <img
                src={selectedImage}
                alt="Floor plan preview"
                className="max-h-64 sm:max-h-72 object-contain rounded-lg"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-3 right-3 px-3 py-1.5 bg-neutral-900/90 hover:bg-red-950 text-neutral-300 hover:text-red-300 border border-neutral-700 rounded-xl text-xs font-semibold backdrop-blur-md transition"
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
              <Sparkles className="w-5 h-5 text-neutral-950" />
              <span className="text-sm sm:text-base">
                {isExtracting ? 'Synthesizing 3D Architectural Model...' : 'Generate 3D Architectural Model'}
              </span>
            </button>
          </div>
        )}

        {/* Loading Step Progress */}
        {isExtracting && (
          <div className="p-4 sm:p-5 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-3 sm:space-y-4 animate-pulse">
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
          <div className="p-4 bg-red-950/60 border border-red-500/50 rounded-2xl flex items-start space-x-3 text-red-200 text-xs sm:text-sm">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <p className="font-semibold text-red-300">Extraction Notice</p>
              <p>{error}</p>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg text-xs"
                >
                  Configure API Key
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Start Presets / Sample Plans */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm sm:text-base font-bold text-white">Instant Reference Plans</h2>
          </div>
          <span className="text-[11px] sm:text-xs text-neutral-400">Ready to explore without API key</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {Object.entries(SAMPLE_PLANS).map(([key, sample]) => (
            <div
              key={key}
              id={`sample-plan-card-${key}`}
              onClick={() => onUseSample(key)}
              className="bg-neutral-900/80 hover:bg-neutral-800/90 border border-neutral-800 hover:border-amber-500/60 rounded-2xl p-4 sm:p-5 cursor-pointer transition-all duration-200 shadow-lg flex flex-col justify-between group active:scale-98"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 uppercase tracking-wider">
                    {sample.tag}
                  </span>
                  <span className="text-xs text-neutral-400 font-mono">
                    {sample.data.rooms.length} Rooms
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                  {sample.title}
                </h3>
                <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                  {sample.description}
                </p>
              </div>

              <div className="mt-3 sm:mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs text-amber-400 font-medium">
                <span>Open 3D Model</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
