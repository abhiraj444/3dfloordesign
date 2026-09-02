import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Key,
  Cpu,
  Globe,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  Zap,
  RotateCcw,
  Check,
  Server,
  RefreshCw,
  BrainCircuit,
  Sliders,
} from 'lucide-react';
import { LLMProviderConfig, LLMProviderType } from '../types';
import {
  PROVIDERS,
  getDefaultConfigForProvider,
  getSavedProvidersVault,
  saveProvidersVault,
  setActiveProviderId,
  saveLLMConfig,
} from '../data/llmProviders';
import { testProviderConnection, resolveEndpointUrl } from '../utils/aiClient';

interface ProviderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: LLMProviderConfig;
  onSave: (newConfig: LLMProviderConfig) => void;
}

export const ProviderSettingsModal: React.FC<ProviderSettingsModalProps> = ({
  isOpen,
  onClose,
  config: initialConfig,
  onSave,
}) => {
  // Full isolated vault for all providers
  const [vault, setVault] = useState<Record<LLMProviderType, LLMProviderConfig>>(() => {
    const saved = getSavedProvidersVault();
    // Ensure active provider from props is synchronized
    if (initialConfig?.provider) {
      saved[initialConfig.provider] = {
        ...saved[initialConfig.provider],
        ...initialConfig,
      };
    }
    return saved;
  });

  const [activeTab, setActiveTab] = useState<LLMProviderType>(initialConfig?.provider || 'openrouter');
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      const freshVault = getSavedProvidersVault();
      if (initialConfig?.provider) {
        freshVault[initialConfig.provider] = {
          ...freshVault[initialConfig.provider],
          ...initialConfig,
        };
      }
      setVault(freshVault);
      setActiveTab(initialConfig?.provider || 'openrouter');
      setTestResult(null);
    }
  }, [isOpen, initialConfig]);

  if (!isOpen) return null;

  const currentConfig: LLMProviderConfig =
    vault[activeTab] || getDefaultConfigForProvider(activeTab);
  const currentProviderMeta = PROVIDERS[activeTab] || PROVIDERS.openrouter;

  const updateCurrentConfig = (patch: Partial<LLMProviderConfig>) => {
    setVault((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        ...patch,
      },
    }));
    setTestResult(null);
  };

  const isCustomModel =
    !currentProviderMeta.popularModels.some((m) => m.id === currentConfig.model);

  const isCustomEndpoint =
    activeTab === 'custom' ||
    (currentConfig.baseUrl && currentConfig.baseUrl !== currentProviderMeta.defaultBaseUrl);

  const handleProviderTabSelect = (pId: LLMProviderType) => {
    setActiveTab(pId);
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    const activeConfigToTest: LLMProviderConfig = {
      ...currentConfig,
      provider: activeTab,
      baseUrl: currentConfig.baseUrl || currentProviderMeta.defaultBaseUrl,
    };

    try {
      const result = await testProviderConnection(activeConfigToTest);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network error while testing connection.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndClose = () => {
    // 1. Persist the entire vault containing all saved provider keys
    saveProvidersVault(vault);
    // 2. Set the active provider
    setActiveProviderId(activeTab);
    // 3. Save active provider config
    const finalActiveConfig: LLMProviderConfig = {
      ...vault[activeTab],
      provider: activeTab,
      baseUrl: (vault[activeTab].baseUrl && vault[activeTab].baseUrl.trim()) || currentProviderMeta.defaultBaseUrl,
    };
    saveLLMConfig(finalActiveConfig);
    onSave(finalActiveConfig);
    onClose();
  };

  const handleResetCurrentProvider = () => {
    const def = getDefaultConfigForProvider(activeTab);
    updateCurrentConfig(def);
  };

  const resolvedFullEndpoint = resolveEndpointUrl(currentConfig.baseUrl, activeTab);

  return (
    <div
      id="llm-provider-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 md:p-6 overflow-y-auto"
    >
      <div
        id="llm-provider-modal-container"
        className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-900/90 sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
                AI Provider & Vision Settings
              </h2>
              <p className="text-xs text-neutral-400">
                Each provider key is stored independently in local storage. Switch between OpenRouter, Gemini, Groq, and OpenAI without losing keys.
              </p>
            </div>
          </div>
          <button
            id="close-provider-modal-btn"
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Provider Selection Tabs */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2.5">
              Select AI Inference Provider
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(PROVIDERS) as LLMProviderType[]).map((pKey) => {
                const p = PROVIDERS[pKey];
                const isSelected = activeTab === pKey;
                const hasKey = !!vault[pKey]?.apiKey?.trim();
                return (
                  <button
                    key={pKey}
                    id={`provider-select-${pKey}`}
                    type="button"
                    onClick={() => handleProviderTabSelect(pKey)}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all relative ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-sm ring-1 ring-amber-500/40'
                        : 'bg-neutral-800/60 border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-semibold text-sm text-neutral-100">{p.name}</span>
                      {isSelected ? (
                        <Check className="w-4 h-4 text-amber-400" />
                      ) : hasKey ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-400" title="API Key saved" />
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[11px] text-neutral-400 line-clamp-1">{p.tagline}</span>
                    </div>
                    {hasKey && (
                      <span className="mt-1 text-[9px] font-mono uppercase tracking-wider bg-emerald-500/10 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/20">
                        Key Saved
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* API Key Input Section for Current Selected Provider */}
          <div className="space-y-2 bg-neutral-800/40 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                {currentProviderMeta.name} API Key
              </label>
              {currentProviderMeta.keyUrl && (
                <a
                  href={currentProviderMeta.keyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 hover:underline"
                >
                  Get {currentProviderMeta.name} key <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="relative">
              <input
                id="llm-api-key-input"
                type={showKey ? 'text' : 'password'}
                value={currentConfig.apiKey || ''}
                onChange={(e) => updateCurrentConfig({ apiKey: e.target.value })}
                placeholder={currentProviderMeta.keyPlaceholder}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3.5 py-2.5 pr-10 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-1"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-[11px] text-neutral-400">
              Saved specifically for <strong className="text-neutral-300">{currentProviderMeta.name}</strong> in your local browser vault.
            </p>
          </div>

          {/* Reasoning & Chain of Thought Stream Settings */}
          <div className="space-y-3 bg-neutral-800/40 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-xs font-semibold text-neutral-200">
                    Chain of Thought & Reasoning Stream
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Live stream the AI's internal spatial reasoning steps before the final architectural layout.
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentConfig.enableReasoning ?? true}
                  onChange={(e) => updateCurrentConfig({ enableReasoning: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {(currentConfig.enableReasoning ?? true) && (
              <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-neutral-500" />
                  Reasoning Effort / Budget
                </span>
                <div className="inline-flex rounded-lg border border-neutral-700 p-0.5 bg-neutral-900">
                  {(['low', 'medium', 'high'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => updateCurrentConfig({ reasoningEffort: lvl })}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium capitalize transition-all ${
                        (currentConfig.reasoningEffort || 'medium') === lvl
                          ? 'bg-amber-500 text-neutral-950 font-semibold'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Vision Model Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                Vision Model Selection
              </label>
              <button
                id="toggle-custom-model-btn"
                type="button"
                onClick={() => {
                  if (isCustomModel) {
                    updateCurrentConfig({ model: currentProviderMeta.defaultModel });
                  } else {
                    updateCurrentConfig({ model: '' });
                  }
                }}
                className="text-xs text-amber-400 hover:text-amber-300 underline font-medium"
              >
                {isCustomModel ? 'Choose from presets' : 'Enter custom model name'}
              </button>
            </div>

            {!isCustomModel ? (
              <div className="space-y-1.5">
                {currentProviderMeta.popularModels.map((preset) => {
                  const isSelected = currentConfig.model === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => updateCurrentConfig({ model: preset.id })}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/50 text-white'
                          : 'bg-neutral-800/40 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                      }`}
                    >
                      <div>
                        <div className="font-medium text-sm text-neutral-100 flex items-center gap-2">
                          {preset.name}
                          {preset.supportsVision && (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                              Vision
                            </span>
                          )}
                          {preset.supportsReasoning && (
                            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded">
                              Thinking CoT
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-neutral-400 font-mono mt-0.5">{preset.id}</div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-amber-500 bg-amber-500' : 'border-neutral-600'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2 bg-neutral-800/40 border border-neutral-800 rounded-xl p-3.5">
                <div className="flex items-center justify-between text-xs text-neutral-300 font-medium">
                  <span>Custom Model Identifier</span>
                  <span className="text-neutral-500 text-[11px]">e.g. google/gemini-2.5-flash</span>
                </div>
                <input
                  id="custom-model-input"
                  type="text"
                  value={currentConfig.model || ''}
                  onChange={(e) => updateCurrentConfig({ model: e.target.value })}
                  placeholder="e.g. anthropic/claude-3.7-sonnet:thinking, meta-llama/llama-3.2-90b-vision-instruct, or gpt-4o"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
                />
                <p className="text-[11px] text-neutral-400">
                  Ensure the model supports image/vision inputs for parsing blueprints and floor plan images.
                </p>
              </div>
            )}
          </div>

          {/* API Endpoint & Base URL Selection (Editable for All Providers) */}
          <div className="space-y-3 bg-neutral-800/40 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-amber-400" />
                API Endpoint & Base URL
              </label>
              <div className="flex items-center gap-2">
                {currentConfig.baseUrl && currentConfig.baseUrl !== currentProviderMeta.defaultBaseUrl && (
                  <button
                    type="button"
                    onClick={() => updateCurrentConfig({ baseUrl: currentProviderMeta.defaultBaseUrl })}
                    className="text-[11px] text-neutral-400 hover:text-amber-400 flex items-center gap-1"
                    title="Reset to default endpoint"
                  >
                    <RefreshCw className="w-3 h-3" /> Reset Default
                  </button>
                )}
                <button
                  id="toggle-custom-endpoint-btn"
                  type="button"
                  onClick={() => {
                    if (isCustomEndpoint) {
                      updateCurrentConfig({ baseUrl: currentProviderMeta.defaultBaseUrl });
                    } else {
                      updateCurrentConfig({ baseUrl: currentProviderMeta.defaultBaseUrl });
                    }
                  }}
                  className="text-xs text-amber-400 hover:text-amber-300 underline font-medium"
                >
                  {isCustomEndpoint ? 'Choose preset endpoint' : 'Edit custom endpoint'}
                </button>
              </div>
            </div>

            {!isCustomEndpoint ? (
              <div className="space-y-1.5">
                {currentProviderMeta.endpointPresets?.map((ep) => {
                  const currentBase = currentConfig.baseUrl || currentProviderMeta.defaultBaseUrl;
                  const isSelected = currentBase === ep.url;
                  return (
                    <button
                      key={ep.url}
                      type="button"
                      onClick={() => updateCurrentConfig({ baseUrl: ep.url })}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/50 text-white'
                          : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold text-neutral-200">{ep.name}</div>
                        <div className="text-[11px] text-neutral-400 font-mono mt-0.5">{ep.url}</div>
                      </div>
                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-amber-500 bg-amber-500' : 'border-neutral-600'
                        }`}
                      >
                        {isSelected && <div className="w-1 h-1 rounded-full bg-black" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  id="llm-base-url-input"
                  type="text"
                  value={currentConfig.baseUrl || ''}
                  onChange={(e) => updateCurrentConfig({ baseUrl: e.target.value })}
                  placeholder={currentProviderMeta.defaultBaseUrl || 'https://openrouter.ai/api/v1'}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
                />
                <p className="text-[11px] text-neutral-400">
                  Custom OpenAI-compatible base URL (e.g., custom reverse proxy, self-hosted Ollama, or alternative gateway).
                </p>
              </div>
            )}

            {/* Resolved URL Preview */}
            <div className="pt-2 border-t border-neutral-800/80 flex items-center gap-1.5 text-[11px] text-neutral-400">
              <Server className="w-3.5 h-3.5 text-amber-400/70 shrink-0" />
              <span>Target route:</span>
              <code className="text-neutral-300 font-mono text-[11px] truncate bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                {resolvedFullEndpoint}
              </code>
            </div>
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="text-xs leading-relaxed">
                <p className="font-semibold mb-0.5">{testResult.success ? 'Connection Verified' : 'Configuration Issue'}</p>
                <p className="break-words">{testResult.message}</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-neutral-800 bg-neutral-900 sticky bottom-0 z-10">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              id="test-connection-btn"
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || (!currentConfig.apiKey && activeTab !== 'custom')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-medium text-neutral-200 disabled:opacity-50 transition-colors"
            >
              <Zap className={`w-3.5 h-3.5 text-amber-400 ${isTesting ? 'animate-spin' : ''}`} />
              {isTesting ? 'Testing connection...' : `Test ${currentProviderMeta.name}`}
            </button>

            <button
              id="reset-llm-btn"
              type="button"
              onClick={handleResetCurrentProvider}
              className="p-2 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 text-xs flex items-center gap-1"
              title="Reset current provider to defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              id="cancel-provider-btn"
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>

            <button
              id="save-provider-btn"
              type="button"
              onClick={handleSaveAndClose}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            >
              <Check className="w-4 h-4" />
              Save & Use {currentProviderMeta.name}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

