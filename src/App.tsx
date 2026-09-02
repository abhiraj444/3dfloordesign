import React, { useState, useEffect } from 'react';
import { FloorPlanData, Room, ViewMode, LLMProviderConfig } from './types';
import { REFERENCE_INDIAN_PLAN_24X48, SAMPLE_PLANS } from './data/samples';
import { getSavedLLMConfig, saveLLMConfig, PROVIDERS } from './data/llmProviders';
import { Scene3D } from './components/Scene3D';
import { Editor2D } from './components/Editor2D';
import { Uploader } from './components/Uploader';
import { ProviderSettingsModal } from './components/ProviderSettingsModal';
import {
  Compass,
  Move,
  Edit3,
  Upload,
  Layers,
  Columns,
  Download,
  Sparkles,
  Home,
  Check,
  ChevronRight,
  HelpCircle,
  Key,
  Settings,
  Cpu,
} from 'lucide-react';

export default function App() {
  // Current active floor plan data (defaults to Reference 24x48 plan from spec)
  const [floorPlan, setFloorPlan] = useState<FloorPlanData>(REFERENCE_INDIAN_PLAN_24X48);
  const [planTitle, setPlanTitle] = useState<string>("Reference Indian Home (24' x 48')");

  // Navigation mode: 'upload' | 'visualizer'
  const [currentScreen, setCurrentScreen] = useState<'upload' | 'visualizer'>('visualizer');

  // Visualizer View Mode: '2d_edit' | '3d_orbit' | '3d_walkthrough'
  const [viewMode, setViewMode] = useState<ViewMode>('3d_orbit');

  // Split View: 2D on Left + 3D on Right (desktop only)
  const [isSplitView, setIsSplitView] = useState<boolean>(false);

  // Selected Room
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Original image preview (if uploaded)
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);

  // User-configured LLM provider settings (OpenRouter, Groq, Gemini, OpenAI, etc.)
  const [llmConfig, setLlmConfig] = useState<LLMProviderConfig>(getSavedLLMConfig());
  const [isProviderSettingsOpen, setIsProviderSettingsOpen] = useState<boolean>(false);

  // Handle plan extracted from AI
  const handlePlanExtracted = (extractedPlan: FloorPlanData, imagePreview?: string) => {
    setFloorPlan(extractedPlan);
    setPlanTitle('Custom Extracted Floor Plan');
    if (imagePreview) setUploadedImagePreview(imagePreview);
    setCurrentScreen('visualizer');
    setViewMode('3d_orbit');
  };

  // Handle sample selection
  const handleUseSample = (sampleKey: string) => {
    const sample = SAMPLE_PLANS[sampleKey];
    if (sample) {
      setFloorPlan(sample.data);
      setPlanTitle(sample.title);
      setUploadedImagePreview(null);
      setCurrentScreen('visualizer');
      setViewMode('3d_orbit');
    }
  };

  // Export JSON file
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(floorPlan, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `FloorPlan-3D-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const currentProviderMeta = PROVIDERS[llmConfig.provider] || PROVIDERS.openrouter;
  const hasApiKey = Boolean(llmConfig.apiKey && llmConfig.apiKey.trim().length > 0);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100 font-sans select-none">
      {/* Top Application Header */}
      <header className="h-14 border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-md px-2 sm:px-4 flex items-center justify-between z-20 shrink-0 gap-1.5 sm:gap-2">
        {/* Left: Brand & Active Plan Title */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 min-w-0 shrink">
          <div
            onClick={() => setCurrentScreen('visualizer')}
            className="flex items-center space-x-1.5 sm:space-x-2 cursor-pointer group shrink-0"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-neutral-950 font-black shadow-md shadow-amber-500/20 group-hover:scale-105 transition shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-white hidden sm:inline shrink-0">
              Floor Plan <span className="text-amber-400">3D</span>
            </span>
          </div>

          {/* Active Plan Name Badge */}
          {currentScreen === 'visualizer' && (
            <div className="hidden sm:flex items-center space-x-1.5 bg-neutral-800/80 px-2 sm:px-2.5 py-1 rounded-xl border border-neutral-700/60 max-w-[90px] md:max-w-[130px] lg:max-w-xs truncate shrink">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <span className="text-xs font-medium text-neutral-200 truncate">{planTitle}</span>
            </div>
          )}
        </div>

        {/* Center: Mode Switching Controls (visualizer screen) */}
        {currentScreen === 'visualizer' && (
          <div className="hidden md:flex items-center space-x-0.5 lg:space-x-1 bg-neutral-950 p-0.5 sm:p-1 rounded-xl border border-neutral-800 shadow-inner shrink">
            <button
              id="view-mode-3d-orbit"
              onClick={() => {
                setIsSplitView(false);
                setViewMode('3d_orbit');
              }}
              title="3D Dollhouse Perspective"
              className={`flex items-center space-x-1 sm:space-x-1.5 px-2 lg:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                !isSplitView && viewMode === '3d_orbit'
                  ? 'bg-amber-500 text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline">3D Dollhouse</span>
              <span className="lg:hidden">3D</span>
            </button>

            <button
              id="view-mode-3d-walk"
              onClick={() => {
                setIsSplitView(false);
                setViewMode('3d_walkthrough');
              }}
              title="First-Person Walkthrough"
              className={`flex items-center space-x-1 sm:space-x-1.5 px-2 lg:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                !isSplitView && viewMode === '3d_walkthrough'
                  ? 'bg-amber-500 text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Move className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline">Walkthrough</span>
              <span className="lg:hidden">Walk</span>
            </button>

            <button
              id="view-mode-2d-editor"
              onClick={() => {
                setIsSplitView(false);
                setViewMode('2d_edit');
              }}
              title="2D Floor Plan Editor"
              className={`flex items-center space-x-1 sm:space-x-1.5 px-2 lg:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                !isSplitView && viewMode === '2d_edit'
                  ? 'bg-amber-500 text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline">2D Editor</span>
              <span className="lg:hidden">2D</span>
            </button>

            {/* Split Screen Toggle */}
            <button
              id="view-mode-split"
              onClick={() => setIsSplitView(!isSplitView)}
              title="Side-by-Side 2D Plan & 3D View"
              className={`hidden xl:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isSplitView
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Columns className="w-3.5 h-3.5 shrink-0" />
              <span>Split</span>
            </button>
          </div>
        )}

        {/* Right: LLM Provider Pill & Action Buttons */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 md:space-x-2 shrink-0">
          {/* LLM Provider Status Button */}
          <button
            id="open-provider-settings-btn"
            onClick={() => setIsProviderSettingsOpen(true)}
            title={`AI Provider: ${currentProviderMeta.name} (${hasApiKey ? 'Key configured' : 'Click to add key'})`}
            className={`flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border text-xs font-medium transition shrink-0 ${
              hasApiKey
                ? 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden md:inline font-semibold">{currentProviderMeta.name}</span>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasApiKey ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          </button>

          {currentScreen === 'visualizer' ? (
            <>
              <button
                id="export-json-btn"
                onClick={handleExportJson}
                className="hidden lg:flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-medium border border-neutral-700 transition shrink-0"
                title="Export Floor Plan JSON"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden xl:inline">Export</span>
              </button>
              <button
                id="header-upload-btn"
                onClick={() => setCurrentScreen('upload')}
                className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-lg transition shrink-0"
              >
                <Upload className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">New Plan</span>
                <span className="sm:hidden">Upload</span>
              </button>
            </>
          ) : (
            <button
              id="back-to-scene-btn"
              onClick={() => setCurrentScreen('visualizer')}
              className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold border border-neutral-700 transition shrink-0"
            >
              <Home className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Back to Scene</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 relative overflow-hidden">
        {currentScreen === 'upload' ? (
          <div className="h-full overflow-y-auto pb-16 md:pb-0">
            <Uploader
              onPlanExtracted={handlePlanExtracted}
              onUseSample={handleUseSample}
              llmConfig={llmConfig}
              currentProviderConfig={llmConfig}
              onOpenSettings={() => setIsProviderSettingsOpen(true)}
              onOpenProviderSettings={() => setIsProviderSettingsOpen(true)}
            />
          </div>
        ) : isSplitView ? (
          /* Split View Mode (2D Editor on Left, 3D Scene on Right) */
          <div className="h-full w-full grid grid-cols-2 divide-x divide-neutral-800">
            <div className="h-full overflow-hidden">
              <Editor2D
                plan={floorPlan}
                onChange={setFloorPlan}
                selectedRoomId={selectedRoomId}
                onSelectRoom={setSelectedRoomId}
              />
            </div>
            <div className="h-full overflow-hidden">
              <Scene3D
                plan={floorPlan}
                viewMode={viewMode === '2d_edit' ? '3d_orbit' : viewMode}
                onViewModeChange={setViewMode}
                onSelectRoom={(r) => setSelectedRoomId(r.id)}
              />
            </div>
          </div>
        ) : viewMode === '2d_edit' ? (
          /* 2D Plan Editor Fullscreen */
          <div className="h-full w-full">
            <Editor2D
              plan={floorPlan}
              onChange={setFloorPlan}
              selectedRoomId={selectedRoomId}
              onSelectRoom={setSelectedRoomId}
            />
          </div>
        ) : (
          /* 3D Scene Fullscreen (Dollhouse or First-Person Walkthrough) */
          <div className="h-full w-full">
            <Scene3D
              plan={floorPlan}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onSelectRoom={(r) => setSelectedRoomId(r.id)}
            />
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Visible only on mobile screens < md) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-neutral-900/95 border-t border-neutral-800 backdrop-blur-xl flex items-center justify-around px-2 z-40">
        <button
          id="mobile-nav-orbit"
          onClick={() => {
            setCurrentScreen('visualizer');
            setIsSplitView(false);
            setViewMode('3d_orbit');
          }}
          className={`flex flex-col items-center justify-center space-y-1 py-1 px-3 rounded-xl transition ${
            currentScreen === 'visualizer' && viewMode === '3d_orbit'
              ? 'text-amber-400 font-bold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px]">Dollhouse</span>
        </button>

        <button
          id="mobile-nav-walk"
          onClick={() => {
            setCurrentScreen('visualizer');
            setIsSplitView(false);
            setViewMode('3d_walkthrough');
          }}
          className={`flex flex-col items-center justify-center space-y-1 py-1 px-3 rounded-xl transition ${
            currentScreen === 'visualizer' && viewMode === '3d_walkthrough'
              ? 'text-amber-400 font-bold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Move className="w-5 h-5" />
          <span className="text-[10px]">Walk</span>
        </button>

        <button
          id="mobile-nav-editor"
          onClick={() => {
            setCurrentScreen('visualizer');
            setIsSplitView(false);
            setViewMode('2d_edit');
          }}
          className={`flex flex-col items-center justify-center space-y-1 py-1 px-3 rounded-xl transition ${
            currentScreen === 'visualizer' && viewMode === '2d_edit'
              ? 'text-amber-400 font-bold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Edit3 className="w-5 h-5" />
          <span className="text-[10px]">2D Plan</span>
        </button>

        <button
          id="mobile-nav-upload"
          onClick={() => setCurrentScreen('upload')}
          className={`flex flex-col items-center justify-center space-y-1 py-1 px-3 rounded-xl transition ${
            currentScreen === 'upload'
              ? 'text-amber-400 font-bold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Upload className="w-5 h-5" />
          <span className="text-[10px]">AI Scan</span>
        </button>

        <button
          id="mobile-nav-settings"
          onClick={() => setIsProviderSettingsOpen(true)}
          className="flex flex-col items-center justify-center space-y-1 py-1 px-3 rounded-xl text-neutral-400 hover:text-neutral-200 transition"
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px]">Settings</span>
        </button>
      </nav>

      {/* LLM Provider Configuration Modal */}
      <ProviderSettingsModal
        isOpen={isProviderSettingsOpen}
        onClose={() => setIsProviderSettingsOpen(false)}
        config={llmConfig}
        onSave={(newCfg) => {
          setLlmConfig(newCfg);
          saveLLMConfig(newCfg);
        }}
      />
    </div>
  );
}
