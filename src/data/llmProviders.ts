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
        description: 'Recommended for architectural plans',
        supportsVision: true,
      },
      {
        id: 'google/gemini-2.0-flash-001',
        name: 'Google Gemini 2.0 Flash',
        provider: 'openrouter',
        description: 'High speed multimodal model',
        supportsVision: true,
      },
      {
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Anthropic Claude 3.5 Sonnet',
        provider: 'openrouter',
        description: 'Top-tier visual spatial reasoning',
        supportsVision: true,
      },
      {
        id: 'openai/gpt-4o',
        name: 'OpenAI GPT-4o',
        provider: 'openrouter',
        description: 'Omni multimodal vision model',
        supportsVision: true,
      },
      {
        id: 'meta-llama/llama-3.2-90b-vision-instruct',
        name: 'Llama 3.2 90B Vision',
        provider: 'openrouter',
        description: 'Open source high parameter vision model',
        supportsVision: true,
      },
      {
        id: 'qwen/qwen-2.5-vl-72b-instruct',
        name: 'Qwen 2.5 VL 72B',
        provider: 'openrouter',
        description: 'Exceptional document & blueprint parsing',
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
    description: 'Direct access to Google Gemini models with native multimodal spatial parsing.',
    endpointPresets: [
      { name: 'Google Generative Language API', url: 'https://generativelanguage.googleapis.com', description: 'Default Google Gemini API' },
    ],
    popularModels: [
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        provider: 'gemini',
        description: 'Default flagship model with structured schema output',
        supportsVision: true,
      },
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        provider: 'gemini',
        description: 'Fast multimodal spatial extraction',
        supportsVision: true,
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'gemini',
        description: 'Complex floor plan & dimension verification',
        supportsVision: true,
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
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        description: 'Fast, cost-effective vision model',
        supportsVision: true,
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
      },
    ],
  },
};

const STORAGE_KEY = 'floorplan_ai_llm_config';

export function getDefaultLLMConfig(): LLMProviderConfig {
  return {
    provider: 'openrouter',
    apiKey: '',
    model: 'google/gemini-2.5-flash',
    baseUrl: 'https://openrouter.ai/api/v1',
    temperature: 0.1,
  };
}

export function getSavedLLMConfig(): LLMProviderConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.provider) {
        return {
          ...getDefaultLLMConfig(),
          ...parsed,
        };
      }
    }
  } catch (e) {
    console.warn('Failed to parse saved LLM config from localStorage:', e);
  }
  return getDefaultLLMConfig();
}

export function saveLLMConfig(config: LLMProviderConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save LLM config to localStorage:', e);
  }
}
