import { FloorPlanData, LLMProviderConfig } from '../types';
import { PROVIDERS, getDefaultLLMConfig, getSavedLLMConfig } from '../data/llmProviders';

export const ARCHITECTURAL_SYSTEM_PROMPT = `You are an expert architectural floor plan parser specialized in residential builder plans and blueprints.
Your task is to analyze the 2D floor plan image and extract a complete, mathematically coherent 3D-ready architectural layout in JSON matching the exact schema below.

Indian & Global Residential Plan Conventions to Recognize:
1. Outer boundary: Look for overall dimension callouts (e.g., 24'-0" x 48'-0", 30' x 40', 36' x 50'). Outer boundary width (X East-West) and height/length (Y North-South).
2. Room labels and dimension strings: Parse feet-inches format like 10'-0" x 12'-0", 9'-4½" x 11'-0", 14' x 16', 5'0" x 7'0". Convert all values into decimal feet (e.g., 9'-6" = 9.5, 9'-4½" = 9.375).
3. Coordinate System:
   - Origin (0,0) is at the South-West (bottom-left) corner of the building.
   - +X axis goes East (left to right).
   - +Y axis goes North (bottom to top).
   - Each room has x (bottom-left X), y (bottom-left Y), width (East-West span in ft), length (North-South span in ft).
   - Ensure rooms fit logically within the outer boundary without impossible overlaps, forming adjacent rooms and corridors.
4. Room Types (strictly one of these enums):
   - 'bedroom' (Bed Room, Master Bed, M.Bed, Kids Room, Guest Bed)
   - 'toilet' (Toilet, WC, Bath, Att. Toilet, Common Toilet, Powder Room)
   - 'kitchen' (Kitchen, Modular Kitchen, Cooking Area, Pantry)
   - 'living_dining' (Drawing Room, Living Hall, Dining Room, Hall, Family Room)
   - 'pooja' (Pooja, Mandir, Prayer Room, Puja)
   - 'balcony' (Balcony, Sit-out, Verandah, Terrace, Deck)
   - 'corridor' (Passage, Foyer, Lobby, Hallway)
   - 'staircase' (Stair, Stairs, UP, Steps)
   - 'other' (Store, Utility, Wash Area)
5. Doors:
   - Identify door swing arcs (quarter circles) or openings in walls.
   - Position (x, y) along the wall where the door sits, width (typically 2.5 to 3.5 ft), and wall direction ('north' | 'south' | 'east' | 'west').
6. Staircase:
   - If present, specify x, y, width, length, direction ('up').
7. Balconies / Verandahs:
   - Specify rectangular areas for balconies or sit-outs.

JSON Schema format to output:
{
  "unit": "feet",
  "outer_boundary": { "width": 30, "height": 50 },
  "north_angle_deg": 0,
  "wall_thickness_ft": 0.5,
  "wall_height_ft": 10.0,
  "rooms": [
    { "id": "room_1", "name": "Living & Dining", "type": "living_dining", "x": 0, "y": 0, "width": 14, "length": 18 },
    { "id": "room_2", "name": "Master Bed", "type": "bedroom", "x": 14, "y": 0, "width": 12, "length": 14 },
    { "id": "room_3", "name": "Kitchen", "type": "kitchen", "x": 0, "y": 18, "width": 10, "length": 12 },
    { "id": "room_4", "name": "Toilet", "type": "toilet", "x": 10, "y": 18, "width": 6, "length": 8 }
  ],
  "doors": [
    { "id": "door_1", "x": 7, "y": 0, "width": 3.2, "wall": "south" }
  ],
  "staircase": { "x": 0, "y": 30, "width": 6, "length": 12, "direction": "up" },
  "balconies": [
    { "x": 14, "y": 30, "width": 10, "length": 5 }
  ]
}

Respond ONLY with valid JSON. Do not include markdown code block backticks or conversational text.`;

export function sanitizeFloorPlanJSON(rawText: string): FloorPlanData {
  let cleaned = rawText.trim();
  // Strip markdown code fences if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/i, '').replace(/\s*```$/, '');
  }

  // Find first '{' and last '}'
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  const parsedData = JSON.parse(cleaned);

  if (!parsedData.unit) parsedData.unit = 'feet';
  if (!parsedData.wall_thickness_ft) parsedData.wall_thickness_ft = 0.5;
  if (!parsedData.wall_height_ft) parsedData.wall_height_ft = 10;
  if (!parsedData.north_angle_deg) parsedData.north_angle_deg = 0;
  if (!Array.isArray(parsedData.rooms)) parsedData.rooms = [];
  if (!Array.isArray(parsedData.doors)) parsedData.doors = [];

  parsedData.rooms = parsedData.rooms.map((room: any, index: number) => ({
    id: room.id || `room_${index + 1}`,
    name: room.name || `Room ${index + 1}`,
    type: room.type || 'bedroom',
    x: Number(room.x) || 0,
    y: Number(room.y) || 0,
    width: Math.max(2, Number(room.width) || 10),
    length: Math.max(2, Number(room.length) || 10),
    floorMaterial: room.floorMaterial || 'wood',
  }));

  if (!parsedData.outer_boundary || !parsedData.outer_boundary.width || !parsedData.outer_boundary.height) {
    let maxX = 24;
    let maxY = 48;
    parsedData.rooms.forEach((r: any) => {
      maxX = Math.max(maxX, r.x + r.width);
      maxY = Math.max(maxY, r.y + r.length);
    });
    parsedData.outer_boundary = { width: maxX, height: maxY };
  }

  return parsedData;
}

export function resolveEndpointUrl(baseUrl: string | undefined, provider: string): string {
  const pMeta = PROVIDERS[provider as keyof typeof PROVIDERS] || PROVIDERS.openrouter;
  const rawBase = (baseUrl && baseUrl.trim()) || pMeta.defaultBaseUrl;
  const cleanBase = rawBase.replace(/\/+$/, '');

  if (cleanBase.endsWith('/chat/completions')) {
    return cleanBase;
  }
  return `${cleanBase}/chat/completions`;
}

/**
 * Safely parse JSON from a fetch Response, avoiding "Unexpected token '<' / 'The page c'..." errors
 */
async function safeParseResponse(response: Response): Promise<{ ok: boolean; status: number; data: any; text: string }> {
  const text = await response.text();
  let data: any = null;
  let isJson = false;

  try {
    data = JSON.parse(text);
    isJson = true;
  } catch {
    isJson = false;
  }

  return {
    ok: response.ok && isJson,
    status: response.status,
    data,
    text,
  };
}

/**
 * Direct client-side test connection (works on Vercel, Netlify, and local without backend dependency)
 */
async function testDirectClientConnection(config: LLMProviderConfig): Promise<{ success: boolean; message: string }> {
  const { provider, apiKey, model, baseUrl } = config;

  if (!apiKey?.trim() && provider !== 'custom') {
    return {
      success: false,
      message: `Please enter a valid API key for ${provider.toUpperCase()}.`,
    };
  }

  if (provider === 'gemini') {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${
      model || 'gemini-2.5-flash'
    }:generateContent?key=${apiKey.trim()}`;
    const res = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Respond with the single word OK.' }] }],
      }),
    });

    const parsed = await safeParseResponse(res);
    if (!res.ok) {
      const errMsg = parsed.data?.error?.message || parsed.text.slice(0, 200) || `HTTP error ${res.status}`;
      return { success: false, message: `Gemini API Error (${res.status}): ${errMsg}` };
    }
    return {
      success: true,
      message: `Successfully connected to Google Gemini with model "${model || 'gemini-2.5-flash'}".`,
    };
  }

  // OpenAI-compatible (OpenRouter, Groq, OpenAI, Custom)
  const endpoint = resolveEndpointUrl(baseUrl, provider);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey?.trim()) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }

  if (endpoint.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = typeof window !== 'undefined' ? window.location.origin : 'https://ai.studio';
    headers['X-Title'] = 'Floor Plan 3D Visualizer';
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: model || (provider === 'groq' ? 'llama-3.2-11b-vision-preview' : 'google/gemini-2.5-flash'),
      messages: [{ role: 'user', content: 'Respond with OK.' }],
      max_tokens: 10,
    }),
  });

  const parsed = await safeParseResponse(res);
  if (!res.ok) {
    let errMsg = parsed.data?.error?.message || parsed.data?.message || parsed.text.slice(0, 250);
    if (res.status === 401 || res.status === 403) {
      errMsg = 'Invalid API key or unauthorized access. Please verify your API key.';
    } else if (res.status === 404) {
      errMsg = `Endpoint not found (${endpoint}). Please verify the API base URL and model name.`;
    }
    return {
      success: false,
      message: `Connection failed (${res.status}): ${errMsg}`,
    };
  }

  return {
    success: true,
    message: `Successfully connected to ${provider.toUpperCase()} with model "${model || 'default'}"!`,
  };
}

/**
 * Universal Connection Test: Attempts backend proxy first, cleanly falls back to direct client if static host (e.g. Vercel)
 */
export async function testProviderConnection(config: LLMProviderConfig): Promise<{ success: boolean; message: string }> {
  try {
    // Try backend proxy endpoint first
    const response = await fetch('/api/test-provider', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: config.provider,
        apiKey: config.apiKey,
        model: config.model,
        baseUrl: config.baseUrl,
      }),
    });

    const parsed = await safeParseResponse(response);

    // If backend endpoint is active and returns valid JSON response
    if (parsed.data && typeof parsed.data.success === 'boolean') {
      if (parsed.data.success) {
        return {
          success: true,
          message: parsed.data.message || 'Connection test successful!',
        };
      } else {
        return {
          success: false,
          message: parsed.data.error || 'Provider authentication failed.',
        };
      }
    }

    // If backend gave 404/HTML (e.g. Vercel static deployment or non-Express environment), fall back to direct browser fetch
    return await testDirectClientConnection(config);
  } catch (err: any) {
    console.warn('Backend proxy test failed, attempting direct client test...', err);
    try {
      return await testDirectClientConnection(config);
    } catch (clientErr: any) {
      return {
        success: false,
        message: clientErr.message || 'Network error while testing connection.',
      };
    }
  }
}

/**
 * Direct client-side floor plan extraction
 */
async function extractDirectClient(
  selectedImage: string,
  mimeType: string,
  userPrompt: string | undefined,
  config: LLMProviderConfig
): Promise<FloorPlanData> {
  const { provider, apiKey, model, baseUrl } = config;

  if (provider === 'gemini') {
    const base64Data = selectedImage.replace(/^data:image\/[a-z]+;base64,/, '');
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${
      model || 'gemini-2.5-flash'
    }:generateContent?key=${apiKey.trim()}`;

    const res = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || 'image/jpeg',
                  data: base64Data,
                },
              },
              {
                text: `${ARCHITECTURAL_SYSTEM_PROMPT}\n\nExtract the floor plan structure from this image. ${
                  userPrompt ? `Additional instructions: ${userPrompt}` : ''
                }`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
    });

    const parsed = await safeParseResponse(res);
    if (!res.ok) {
      throw new Error(parsed.data?.error?.message || `Gemini API error (${res.status}): ${parsed.text.slice(0, 200)}`);
    }

    const candidateText = parsed.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('Gemini API returned an empty response.');
    }

    return sanitizeFloorPlanJSON(candidateText);
  }

  // OpenAI-compatible (OpenRouter, Groq, OpenAI, Custom)
  const endpoint = resolveEndpointUrl(baseUrl, provider);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey?.trim()) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }

  if (endpoint.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = typeof window !== 'undefined' ? window.location.origin : 'https://ai.studio';
    headers['X-Title'] = 'Floor Plan 3D Visualizer';
  }

  const base64Data = selectedImage.startsWith('data:') ? selectedImage : `data:${mimeType};base64,${selectedImage}`;

  const payload = {
    model: model || (provider === 'groq' ? 'llama-3.2-90b-vision-preview' : 'google/gemini-2.5-flash'),
    messages: [
      {
        role: 'system',
        content: ARCHITECTURAL_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Extract the architectural floor plan from this image into canonical 3D JSON format. ${
              userPrompt ? `Additional user notes: ${userPrompt}` : ''
            }`,
          },
          {
            type: 'image_url',
            image_url: {
              url: base64Data,
            },
          },
        ],
      },
    ],
    temperature: 0.1,
    response_format: { type: 'json_object' },
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const parsed = await safeParseResponse(res);
  if (!res.ok) {
    let errMsg = parsed.data?.error?.message || parsed.data?.message || parsed.text.slice(0, 250);
    if (res.status === 401) errMsg = 'Authentication failed. Please verify your API key in Settings.';
    if (res.status === 404) errMsg = `Endpoint (${endpoint}) not found. Please verify the URL and model.`;
    throw new Error(`Vision extraction request failed (${res.status}): ${errMsg}`);
  }

  const rawContent = parsed.data?.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error('No structured JSON returned by the model.');
  }

  return sanitizeFloorPlanJSON(rawContent);
}

/**
 * Universal Floor Plan Extraction: Attempts backend proxy first, falls back to direct client if static host
 */
export async function extractFloorPlan(
  selectedImage: string,
  mimeType: string,
  userPrompt: string | undefined,
  config?: LLMProviderConfig
): Promise<FloorPlanData> {
  const safeConfig = config || getSavedLLMConfig() || getDefaultLLMConfig();

  try {
    const response = await fetch('/api/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: selectedImage,
        mimeType,
        userPrompt: userPrompt?.trim() || undefined,
        providerConfig: safeConfig,
      }),
    });

    const parsed = await safeParseResponse(response);

    if (parsed.data && parsed.data.success && parsed.data.data) {
      return parsed.data.data;
    }

    if (parsed.data && !parsed.data.success && parsed.data.error) {
      // If backend explicitly responded with an error (e.g. invalid key)
      if (parsed.data.needsApiKey) {
        throw new Error(parsed.data.error);
      }
      // If other error, try client side fallback
    }

    return await extractDirectClient(selectedImage, mimeType, userPrompt, safeConfig);
  } catch (err: any) {
    console.warn('Backend proxy extraction failed, attempting direct client extraction...', err);
    return await extractDirectClient(selectedImage, mimeType, userPrompt, safeConfig);
  }
}
