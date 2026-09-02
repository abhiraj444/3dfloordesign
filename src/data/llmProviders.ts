import { LLMProviderConfig, LLMProviderType, ModelPreset } from '../types';

export interface EndpointPreset {
  name: string;
  url: string;
  description?: string;
}

export interface ProviderMeta {
  id: LLMProviderType;
  name: string;
  tagline: string;
  defaultBaseUrl: string;
  defaultModel: string;
  keyUrl: string;
  keyPlaceholder: string;
  popularModels: ModelPreset[];
  endpointPresets: EndpointPreset[];
  description: string;
}

export const PROVIDERS: Record<LLMProviderType, ProviderMeta> = {
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    tagline: 'Access 200+ models with one unified API key',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'google/gemini-2.5-flash',
    keyUrl: 'https://openrouter.ai/keys',
    keyPlaceholder: 'sk-or-v1-...',
    description: 'Use OpenRouter with Gemini 2.5 Flash, Claude 3.5 Sonnet, GPT-4o, Llama 3.2 Vision, and more.',
    endpointPresets: [
      { name: 'Default OpenRouter v1', url: 'https://openrouter.ai/api/v1', description: 'Recommended official endpoint' },
      { name: 'OpenRouter Root API', url: 'https://openrouter.ai/api', description: 'Alternative base path' },
    ],
    popularModels: [
      {
        id: 'google/gemini-2.5-flash',
        name: 'Google Gemini 2.5 Flash (Fast & Accurate)',
        provider: 'openrouter',
        description: 'Recommended for architectural plans with reasoning',
        supportsVision: true,
        supportsReasoning: true,
      },
      {
        id: 'anthropic/claude-3.7-sonnet:thinking',
        name: 'Anthropic Claude 3.7 Sonnet (Thinking CoT)',
        provider: 'openrouter',
        description: 'Elite spatial reasoning with step-by-step thinking trace',
        supportsVision: true,
        supportsReasoning: true,
      },
      {
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Anthropic Claude 3.5 Sonnet',
        provider: 'openrouter',
        description: 'Top-tier visual spatial reasoning',
        supportsVision: true,
        supportsReasoning: true,
      },
      {
        id: 'openai/gpt-4o',
        name: 'OpenAI GPT-4o',
        provider: 'openrouter',
        description: 'Omni multimodal vision model',
        supportsVision: true,
        supportsReasoning: true,
      },
      {
        id: 'qwen/qwen-2.5-vl-72b-instruct',
        name: 'Qwen 2.5 VL 72B',
        provider: 'openrouter',
        description: 'Exceptional document & blueprint parsing',
        supportsVision: true,
        supportsReasoning: true,
      },
      {
        id: 'meta-llama/llama-3.2-90b-vision-instruct',
        name: 'Llama 3.2 90B Vision',
        provider: 'openrouter',
        description: 'Open source high parameter vision model',
        supportsVision: true,
      },
    ],
  },
  groq: {
    id: 'groq',
    name: 'Groq Cloud',
    tagline: 'Ultra-fast LPU inference engine',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.2-90b-vision-preview',
    keyUrl: 'https://console.groq.com/keys',
    keyPlaceholder: 'gsk_...',
    description: 'Ultra fast inference on Groq Cloud using Llama 3.2 multimodal vision models.',
    endpointPresets: [
      { name: 'Default Groq OpenAI v1', url: 'https://api.groq.com/openai/v1', description: 'Official fast LPU endpoint' },
    ],
    popularModels: [
      {
        id: 'llama-3.2-90b-vision-preview',
        name: 'Llama 3.2 90B Vision Preview',
        provider: 'groq',
        description: 'Groq ultra-fast multimodal inference',
        supportsVision: true,
      },
      {
        id: 'llama-3.2-11b-vision-preview',
        name: 'Llama 3.2 11B Vision Preview',
        provider: 'groq',
        description: 'Lightweight high-speed vision model',
        supportsVision: true,
      },
    ],
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    tagline: 'Direct Google AI Studio API key',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-2.5-flash',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    keyPlaceholder: 'AIzaSy...',
    description: 'Direct access to Google Gemini models with native multimodal spatial parsing and thinking.',
    endpointPresets: [
      { name: 'Google Generative Language API', url: 'https://generativelanguage.googleapis.com', description: 'Default Google Gemini API' },
    ],
    popularModels: [
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash (Recommended)',
        provider: 'gemini',
        description: 'Flagship multimodal vision model with high spatial accuracy',
        supportsVision: true,
        supportsReasoning: true,
      },
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        provider: 'gemini',
        description: 'Fast multimodal spatial extraction',
        supportsVision: true,
        supportsReasoning: true,
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'gemini',
        description: 'Complex architectural plan & dimension verification',
        supportsVision: true,
        supportsReasoning: true,
      },
    ],
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    tagline: 'Direct OpenAI Platform API key',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyPlaceholder: 'sk-proj-...',
    description: 'Direct OpenAI API integration for GPT-4o and GPT-4o-mini vision models.',
    endpointPresets: [
      { name: 'Default OpenAI v1', url: 'https://api.openai.com/v1', description: 'Official OpenAI endpoint' },
    ],
    popularModels: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o (Omni)',
        provider: 'openai',
        description: 'High fidelity multimodal reasoning',
        supportsVision: true,
        supportsReasoning: true,
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        description: 'Fast, cost-effective vision model',
        supportsVision: true,
        supportsReasoning: true,
      },
    ],
  },
  custom: {
    id: 'custom',
    name: 'Custom / Local API',
    tagline: 'Any OpenAI-compatible endpoint (Ollama, vLLM, LMStudio, LocalAI, Proxy)',
    defaultBaseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llava:latest',
    keyUrl: '',
    keyPlaceholder: 'Optional API key or leave blank for local',
    description: 'Connect to your self-hosted local LLM or custom OpenAI-compatible proxy.',
    endpointPresets: [
      { name: 'Ollama (Localhost)', url: 'http://localhost:11434/v1', description: 'Default Ollama v1 API' },
      { name: 'LM Studio (Localhost)', url: 'http://localhost:1234/v1', description: 'LM Studio local server' },
      { name: 'vLLM / TextGen WebUI', url: 'http://localhost:8000/v1', description: 'Standard vLLM port' },
      { name: 'LocalAI', url: 'http://localhost:8080/v1', description: 'LocalAI endpoint' },
    ],
    popularModels: [
      {
        id: 'llava:latest',
        name: 'LLaVA (Local Ollama)',
        provider: 'custom',
        description: 'Local visual assistant model',
        supportsVision: true,
      },
      {
        id: 'minicpm-v:latest',
        name: 'MiniCPM-V (Local)',
        provider: 'custom',
        description: 'High performance edge vision model',
        supportsVision: true,
      },
      {
        id: 'qwen2-vl:7b',
        name: 'Qwen 2 VL (Local)',
        provider: 'custom',
        description: 'Local blueprint and floor plan parser',
        supportsVision: true,
        supportsReasoning: true,
      },
    ],
  },
};

const VAULT_STORAGE_KEY = 'floorplan_ai_providers_vault_v2';
const ACTIVE_PROVIDER_KEY = 'floorplan_ai_active_provider_v2';
const LEGACY_STORAGE_KEY = 'floorplan_ai_llm_config';

export function getDefaultConfigForProvider(provider: LLMProviderType): LLMProviderConfig {
  const meta = PROVIDERS[provider] || PROVIDERS.openrouter;
  return {
    provider,
    apiKey: '',
    model: meta.defaultModel,
    baseUrl: meta.defaultBaseUrl,
    temperature: 0.1,
    enableReasoning: true,
    reasoningEffort: 'medium',
  };
}

export function getDefaultProvidersVault(): Record<LLMProviderType, LLMProviderConfig> {
  return {
    openrouter: getDefaultConfigForProvider('openrouter'),
    groq: getDefaultConfigForProvider('groq'),
    gemini: getDefaultConfigForProvider('gemini'),
    openai: getDefaultConfigForProvider('openai'),
    custom: getDefaultConfigForProvider('custom'),
  };
}

export function getSavedProvidersVault(): Record<LLMProviderType, LLMProviderConfig> {
  const vault = getDefaultProvidersVault();
  try {
    const rawVault = localStorage.getItem(VAULT_STORAGE_KEY);
    if (rawVault) {
      const parsed = JSON.parse(rawVault);
      if (parsed && typeof parsed === 'object') {
        (Object.keys(vault) as LLMProviderType[]).forEach((pKey) => {
          if (parsed[pKey]) {
            vault[pKey] = {
              ...vault[pKey],
              ...parsed[pKey],
              provider: pKey, // ensure strict type match
            };
          }
        });
        return vault;
      }
    }

    // Migrate from legacy single-config storage if present
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const legacyParsed = JSON.parse(legacyRaw);
      if (legacyParsed && legacyParsed.provider && vault[legacyParsed.provider as LLMProviderType]) {
        const pKey = legacyParsed.provider as LLMProviderType;
        vault[pKey] = {
          ...vault[pKey],
          ...legacyParsed,
        };
        // Save into new vault format
        saveProvidersVault(vault);
      }
    }
  } catch (e) {
    console.warn('Failed to parse saved LLM providers vault:', e);
  }
  return vault;
}

export function saveProvidersVault(vault: Record<LLMProviderType, LLMProviderConfig>): void {
  try {
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vault));
  } catch (e) {
    console.error('Failed to save providers vault to localStorage:', e);
  }
}

export function getActiveProviderId(): LLMProviderType {
  try {
    const active = localStorage.getItem(ACTIVE_PROVIDER_KEY);
    if (active && (active in PROVIDERS)) {
      return active as LLMProviderType;
    }
  } catch (e) {
    console.warn('Failed to read active provider id:', e);
  }
  return 'openrouter';
}

export function setActiveProviderId(provider: LLMProviderType): void {
  try {
    localStorage.setItem(ACTIVE_PROVIDER_KEY, provider);
  } catch (e) {
    console.error('Failed to set active provider id:', e);
  }
}

export function getDefaultLLMConfig(): LLMProviderConfig {
  return getDefaultConfigForProvider('openrouter');
}

/**
 * Returns the currently selected provider's configuration from the isolated vault.
 */
export function getSavedLLMConfig(): LLMProviderConfig {
  const activeId = getActiveProviderId();
  const vault = getSavedProvidersVault();
  return vault[activeId] || getDefaultConfigForProvider(activeId);
}

/**
 * Saves a specific provider's configuration without affecting any other provider's API key.
 * Also sets this provider as the currently active provider.
 */
export function saveLLMConfig(config: LLMProviderConfig): void {
  try {
    const vault = getSavedProvidersVault();
    const pId = config.provider || 'openrouter';
    vault[pId] = {
      ...getDefaultConfigForProvider(pId),
      ...config,
      provider: pId,
    };
    saveProvidersVault(vault);
    setActiveProviderId(pId);
  } catch (e) {
    console.error('Failed to save LLM config:', e);
  }
}

/**
 * Updates a single provider's settings in the vault
 */
export function updateProviderInVault(provider: LLMProviderType, partial: Partial<LLMProviderConfig>): void {
  try {
    const vault = getSavedProvidersVault();
    vault[provider] = {
      ...vault[provider],
      ...partial,
      provider,
    };
    saveProvidersVault(vault);
  } catch (e) {
    console.error(`Failed to update ${provider} in vault:`, e);
  }
}
