import React, { useState } from 'react';
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
} from 'lucide-react';
import { LLMProviderConfig, LLMProviderType } from '../types';
import { PROVIDERS, getDefaultLLMConfig, saveLLMConfig } from '../data/llmProviders';

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
  const [formConfig, setFormConfig] = useState<LLMProviderConfig>({ ...initialConfig });
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [customModelInput, setCustomModelInput] = useState('');
  const [isCustomModel, setIsCustomModel] = useState(false);

  if (!isOpen) return null;

  const currentProvider = PROVIDERS[formConfig.provider] || PROVIDERS.openrouter;

  const handleProviderSelect = (pId: LLMProviderType) => {
    const pMeta = PROVIDERS[pId];
    setFormConfig((prev) => ({
      ...prev,
      provider: pId,
      model: pMeta.defaultModel,
      baseUrl: pMeta.defaultBaseUrl,
    }));
    setIsCustomModel(false);
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/test-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: formConfig.provider,
          apiKey: formConfig.apiKey,
          model: formConfig.model,
          baseUrl: formConfig.baseUrl,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || 'Connection test successful! Model is ready for floor plan vision extraction.',
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Failed to authenticate with provider. Please verify your API key and model.',
        });
      }
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
    const finalConfig = { ...formConfig };
    if (isCustomModel && customModelInput.trim()) {
      finalConfig.model = customModelInput.trim();
    }
    saveLLMConfig(finalConfig);
    onSave(finalConfig);
    onClose();
  };

  const handleResetDefaults = () => {
    const def = getDefaultLLMConfig();
    setFormConfig(def);
    setIsCustomModel(false);
    setTestResult(null);
  };

  return (
    <div
      id="llm-provider-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 md:p-6 overflow-y-auto"
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
                Configure your own API keys for OpenRouter, Groq, Gemini, OpenAI or Custom LLM
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
                const isSelected = formConfig.provider === pKey;
                return (
                  <button
                    key={pKey}
                    id={`provider-select-${pKey}`}
                    type="button"
                    onClick={() => handleProviderSelect(pKey)}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-sm ring-1 ring-amber-500/40'
                        : 'bg-neutral-800/60 border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-semibold text-sm text-neutral-100">{p.name}</span>
                      {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                    </div>
                    <span className="text-[11px] text-neutral-400 line-clamp-1">{p.tagline}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* API Key Input Section */}
          <div className="space-y-2 bg-neutral-800/40 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                {currentProvider.name} API Key
              </label>
              {currentProvider.keyUrl && (
                <a
                  href={currentProvider.keyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 hover:underline"
                >
                  Get {currentProvider.name} key <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="relative">
              <input
                id="llm-api-key-input"
                type={showKey ? 'text' : 'password'}
                value={formConfig.apiKey}
                onChange={(e) => {
                  setFormConfig((prev) => ({ ...prev, apiKey: e.target.value }));
                  setTestResult(null);
                }}
                placeholder={currentProvider.keyPlaceholder}
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
              Your API key is securely retained in your browser session and never stored permanently on any backend.
            </p>
          </div>

          {/* Model Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                Vision Model Selection
              </label>
              <button
                type="button"
                onClick={() => setIsCustomModel(!isCustomModel)}
                className="text-xs text-neutral-400 hover:text-neutral-200 underline"
              >
                {isCustomModel ? 'Choose from presets' : 'Enter custom model name'}
              </button>
            </div>

            {!isCustomModel ? (
              <div className="space-y-1.5">
                {currentProvider.popularModels.map((preset) => {
                  const isSelected = formConfig.model === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setFormConfig((prev) => ({ ...prev, model: preset.id }));
                        setTestResult(null);
                      }}
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
              <div className="space-y-2">
                <input
                  id="custom-model-input"
                  type="text"
                  value={formConfig.model}
                  onChange={(e) => {
                    setFormConfig((prev) => ({ ...prev, model: e.target.value }));
                    setTestResult(null);
                  }}
                  placeholder="e.g. meta-llama/llama-3.2-90b-vision-instruct or mistralai/pixtral-12b"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
                />
                <p className="text-[11px] text-neutral-400">
                  Ensure the model supports image/vision inputs for parsing blueprints and floor plan images.
                </p>
              </div>
            )}
          </div>

          {/* Custom Base URL (shown for Custom provider or advanced users) */}
          {(formConfig.provider === 'custom' || formConfig.baseUrl !== currentProvider.defaultBaseUrl) && (
            <div className="space-y-2 bg-neutral-800/40 border border-neutral-800 rounded-xl p-4">
              <label className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-amber-400" />
                API Base URL
              </label>
              <input
                id="llm-base-url-input"
                type="text"
                value={formConfig.baseUrl || ''}
                onChange={(e) => setFormConfig((prev) => ({ ...prev, baseUrl: e.target.value }))}
                placeholder="http://localhost:11434/v1"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          )}

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
                <p className="font-semibold mb-0.5">{testResult.success ? 'Ready to parse' : 'Configuration Issue'}</p>
                <p>{testResult.message}</p>
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
              disabled={isTesting || (!formConfig.apiKey && formConfig.provider !== 'custom')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-medium text-neutral-200 disabled:opacity-50 transition-colors"
            >
              <Zap className={`w-3.5 h-3.5 text-amber-400 ${isTesting ? 'animate-spin' : ''}`} />
              {isTesting ? 'Testing connection...' : 'Test Connection'}
            </button>

            <button
              id="reset-llm-btn"
              type="button"
              onClick={handleResetDefaults}
              className="p-2 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 text-xs flex items-center gap-1"
              title="Reset defaults"
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
              Save & Apply Provider
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
