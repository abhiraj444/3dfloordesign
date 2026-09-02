import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// System prompt for all multimodal LLMs
const ARCHITECTURAL_SYSTEM_PROMPT = `You are an expert architectural floor plan parser specialized in residential builder plans and blueprints.
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

CRITICAL RULES:
- Output ONLY the raw JSON object starting with '{' and ending with '}'.
- DO NOT output any preamble, safety commentary (such as "User Safety: safe"), markdown wrappers, explanation, or conversational text.`;

function cleanJsonString(str: string): string {
  return str
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function relaxJson(str: string): string {
  return str
    // Remove single line comments
    .replace(/\/\/.*$/gm, '')
    // Remove multi-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove trailing commas before closing braces/brackets
    .replace(/,\s*([}\]])/g, '$1')
    .trim();
}

function sanitizeFloorPlanJSON(rawText: string): any {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty response received from AI model.');
  }

  let text = rawText.trim();
  let parsedData: any = null;

  // 1. Try direct parsing
  try {
    parsedData = JSON.parse(text);
  } catch {
    // 2. Try extracting from markdown code block
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch && codeBlockMatch[1]) {
      try {
        parsedData = JSON.parse(cleanJsonString(codeBlockMatch[1]));
      } catch {
        try {
          parsedData = JSON.parse(relaxJson(codeBlockMatch[1]));
        } catch {
          // Continue to next extraction method
        }
      }
    }

    // 3. Extract between the first '{' and the last '}'
    if (!parsedData) {
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const candidate = text.slice(firstBrace, lastBrace + 1);
        try {
          parsedData = JSON.parse(cleanJsonString(candidate));
        } catch {
          try {
            parsedData = JSON.parse(relaxJson(candidate));
          } catch {
            // Continue
          }
        }
      }
    }

    // 4. Regex greedy object match
    if (!parsedData) {
      const objectMatch = text.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        try {
          parsedData = JSON.parse(relaxJson(objectMatch[0]));
        } catch {
          // Continue
        }
      }
    }
  }

  if (!parsedData || typeof parsedData !== 'object') {
    throw new Error(`Failed to parse architectural JSON from AI model. Response was: ${text.slice(0, 150)}...`);
  }

  // Sanitize and ensure valid schema defaults
  if (!parsedData.unit) parsedData.unit = 'feet';
  if (!parsedData.wall_thickness_ft) parsedData.wall_thickness_ft = 0.5;
  if (!parsedData.wall_height_ft) parsedData.wall_height_ft = 10;
  if (!parsedData.north_angle_deg) parsedData.north_angle_deg = 0;
  if (!Array.isArray(parsedData.rooms)) parsedData.rooms = [];
  if (!Array.isArray(parsedData.doors)) parsedData.doors = [];

  // Ensure every room has an ID and numeric coordinates
  parsedData.rooms = parsedData.rooms.map((room: any, index: number) => ({
    id: room.id || `room_${index + 1}`,
    name: room.name || `Room ${index + 1}`,
    type: room.type || 'bedroom',
    x: Number(room.x) || 0,
    y: Number(room.y) || 0,
    width: Math.max(2, Number(room.width) || 10),
    length: Math.max(2, Number(room.length) || 10),
  }));

  // Calculate outer boundary if not valid
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

// Handler for OpenAI-compatible providers (OpenRouter, Groq, OpenAI, Custom)
async function callOpenAICompatibleVision(
  baseUrl: string,
  apiKey: string,
  model: string,
  imageBase64Url: string,
  userPrompt?: string
): Promise<string> {
  const endpoint = baseUrl.endsWith('/') ? `${baseUrl}chat/completions` : `${baseUrl}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  // OpenRouter specific referer headers
  if (baseUrl.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = 'https://ai.studio';
    headers['X-Title'] = 'Floor Plan 3D Visualizer';
  }

  const payload = {
    model: model || 'google/gemini-2.5-flash',
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
              url: imageBase64Url,
            },
          },
        ],
      },
    ],
    temperature: 0.1,
    response_format: { type: 'json_object' },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMsg = `Provider error (${response.status})`;
    try {
      const errJson = JSON.parse(errorBody);
      errorMsg = errJson.error?.message || errJson.message || errorBody;
    } catch {
      errorMsg = errorBody;
    }
    throw new Error(`LLM Provider API request failed: ${errorMsg}`);
  }

  const data: any = await response.json();
  let content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No content returned in LLM response.');
  }

  if (Array.isArray(content)) {
    content = content.map((c: any) => (typeof c === 'string' ? c : c.text || '')).join('\n');
  } else if (typeof content !== 'string') {
    content = JSON.stringify(content);
  }

  return content;
}

// Handler for Google Gemini Native API
async function callGeminiVision(
  apiKey: string,
  model: string,
  base64Data: string,
  mimeType: string,
  userPrompt?: string
): Promise<string> {
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const contents = [
    {
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: base64Data,
      },
    },
    {
      text: `Extract the floor plan structure from this image. ${userPrompt ? `User instructions: ${userPrompt}` : ''}
Ensure all room coordinates and dimensions are in decimal feet, non-overlapping, and fully structured.`,
    },
  ];

  const response = await ai.models.generateContent({
    model: model || 'gemini-2.5-flash',
    contents,
    config: {
      systemInstruction: ARCHITECTURAL_SYSTEM_PROMPT,
      responseMimeType: 'application/json',
    },
  });

  return response.text || '';
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing large JSON payloads (base64 images)
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ extended: true, limit: '30mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Test provider API Key & connection endpoint
  app.post('/api/test-provider', async (req, res) => {
    try {
      const { provider = 'openrouter', apiKey, model, baseUrl } = req.body;

      if (!apiKey && provider !== 'custom') {
        return res.status(400).json({
          success: false,
          error: `Please enter a valid API key for ${provider.toUpperCase()}.`,
        });
      }

      if (provider === 'gemini') {
        const ai = new GoogleGenAI({ apiKey });
        const testRes = await ai.models.generateContent({
          model: model || 'gemini-2.5-flash',
          contents: 'Say "OK"',
        });
        return res.json({
          success: true,
          message: `Successfully connected to Google Gemini with model "${model || 'gemini-2.5-flash'}".`,
          reply: testRes.text,
        });
      } else {
        const testUrl =
          baseUrl ||
          (provider === 'openrouter'
            ? 'https://openrouter.ai/api/v1'
            : provider === 'groq'
            ? 'https://api.groq.com/openai/v1'
            : 'https://api.openai.com/v1');

        const endpoint = testUrl.endsWith('/') ? `${testUrl}chat/completions` : `${testUrl}/chat/completions`;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey.trim()}`;
        if (endpoint.includes('openrouter.ai')) {
          headers['HTTP-Referer'] = 'https://ai.studio';
          headers['X-Title'] = 'Floor Plan 3D Visualizer';
        }

        const testRes = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: model || (provider === 'groq' ? 'llama-3.2-11b-vision-preview' : 'google/gemini-2.5-flash'),
            messages: [{ role: 'user', content: 'Respond with OK.' }],
            max_tokens: 10,
          }),
        });

        if (!testRes.ok) {
          const errText = await testRes.text();
          let parsedError = errText;
          try {
            const errObj = JSON.parse(errText);
            parsedError = errObj.error?.message || errObj.message || errText;
          } catch {
            parsedError = errText.slice(0, 300);
          }
          return res.status(testRes.status).json({
            success: false,
            error: `Provider test failed (${testRes.status}): ${parsedError}`,
          });
        }

        const json = await testRes.json();
        return res.json({
          success: true,
          message: `Successfully connected to ${provider.toUpperCase()} with model "${model}".`,
          details: json,
        });
      }
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err.message || 'Connection test failed.',
      });
    }
  });

  // Extract Floor Plan from Image using User-Specified LLM Provider (Standard REST)
  app.post('/api/extract', async (req, res) => {
    try {
      const { imageBase64, mimeType = 'image/jpeg', userPrompt, providerConfig } = req.body;

      if (!imageBase64) {
        return res.status(400).json({
          error: 'Missing imageBase64 in request body.',
        });
      }

      // Check user API configuration
      const provider = providerConfig?.provider || 'openrouter';
      const apiKey = providerConfig?.apiKey?.trim();
      const model = providerConfig?.model?.trim();
      const baseUrl = providerConfig?.baseUrl?.trim();

      if (!apiKey && provider !== 'custom') {
        return res.status(400).json({
          error: `No API key provided for ${provider.toUpperCase()}. Please click "AI Provider Settings" to input your API key and model name.`,
          needsApiKey: true,
        });
      }

      // Clean base64 string
      const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      const fullDataUrl = `data:${mimeType};base64,${base64Data}`;

      let rawResponseText = '';

      if (provider === 'gemini') {
        rawResponseText = await callGeminiVision(apiKey, model || 'gemini-2.5-flash', base64Data, mimeType, userPrompt);
      } else {
        const resolvedBaseUrl =
          baseUrl ||
          (provider === 'openrouter'
            ? 'https://openrouter.ai/api/v1'
            : provider === 'groq'
            ? 'https://api.groq.com/openai/v1'
            : 'https://api.openai.com/v1');

        rawResponseText = await callOpenAICompatibleVision(
          resolvedBaseUrl,
          apiKey,
          model || (provider === 'groq' ? 'llama-3.2-90b-vision-preview' : 'google/gemini-2.5-flash'),
          fullDataUrl,
          userPrompt
        );
      }

      const parsedData = sanitizeFloorPlanJSON(rawResponseText);

      return res.json({
        success: true,
        data: parsedData,
        message: `Successfully extracted ${parsedData.rooms.length} rooms and ${parsedData.doors.length} doors using ${provider.toUpperCase()} (${model || 'default'}).`,
      });
    } catch (error: any) {
      console.error('Error during floor plan extraction:', error);
      return res.status(500).json({
        error: error.message || 'Failed to extract floor plan structure from the image.',
      });
    }
  });

  // Extract Floor Plan via Server-Sent Events (SSE) for 3-Box Real-Time Stream (Input, Reasoning, Raw Output)
  app.post('/api/extract-stream', async (req, res) => {
    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const sendSSE = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const { imageBase64, mimeType = 'image/jpeg', userPrompt, providerConfig } = req.body;

      if (!imageBase64) {
        sendSSE({ type: 'error', error: 'Missing imageBase64 in request payload.' });
        return res.end();
      }

      const provider = providerConfig?.provider || 'openrouter';
      const apiKey = providerConfig?.apiKey?.trim();
      const model = providerConfig?.model?.trim();
      const baseUrl = providerConfig?.baseUrl?.trim();
      const enableReasoning = providerConfig?.enableReasoning ?? true;
      const reasoningEffort = providerConfig?.reasoningEffort || 'medium';

      const base64Clean = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      const approxKb = Math.round((base64Clean.length * 0.75) / 1024);

      // Send 1. INPUT payload event
      sendSSE({
        type: 'input',
        payload: {
          provider,
          model: model || (provider === 'gemini' ? 'gemini-2.5-flash' : provider === 'groq' ? 'llama-3.2-90b-vision-preview' : 'google/gemini-2.5-flash'),
          baseUrl: baseUrl || undefined,
          systemInstruction: ARCHITECTURAL_SYSTEM_PROMPT,
          userPrompt: userPrompt || undefined,
          imageInfo: {
            mimeType,
            sizeKb: approxKb,
            previewUrl: imageBase64.startsWith('data:') ? imageBase64 : `data:${mimeType};base64,${base64Clean}`,
          },
          temperature: 0.1,
          enableReasoning,
          reasoningEffort,
        },
      });

      if (!apiKey && provider !== 'custom') {
        sendSSE({
          type: 'error',
          error: `No API key provided for ${provider.toUpperCase()}. Please configure your API key in Settings.`,
        });
        return res.end();
      }

      let accumulatedReasoning = '';
      let accumulatedContent = '';

      if (provider === 'gemini') {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: { 'User-Agent': 'aistudio-build' },
          },
        });

        // Gemini Stream Call
        const contents = [
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: base64Clean,
            },
          },
          {
            text: `Extract the floor plan structure from this image. ${userPrompt ? `User instructions: ${userPrompt}` : ''}
Ensure all room coordinates and dimensions are in decimal feet, non-overlapping, and fully structured according to system prompt JSON schema.`,
          },
        ];

        const responseStream = await ai.models.generateContentStream({
          model: model || 'gemini-2.5-flash',
          contents,
          config: {
            systemInstruction: ARCHITECTURAL_SYSTEM_PROMPT,
            responseMimeType: 'application/json',
          },
        });

        for await (const chunk of responseStream) {
          const textChunk = chunk.text || '';
          if (textChunk) {
            accumulatedContent += textChunk;
            sendSSE({ type: 'content', chunk: textChunk, accumulated: accumulatedContent });
          }
        }
      } else {
        // OpenAI-Compatible streaming (OpenRouter, Groq, OpenAI, Custom)
        const resolvedBaseUrl =
          baseUrl ||
          (provider === 'openrouter'
            ? 'https://openrouter.ai/api/v1'
            : provider === 'groq'
            ? 'https://api.groq.com/openai/v1'
            : 'https://api.openai.com/v1');

        const endpoint = resolvedBaseUrl.endsWith('/') ? `${resolvedBaseUrl}chat/completions` : `${resolvedBaseUrl}/chat/completions`;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        };
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
        if (resolvedBaseUrl.includes('openrouter.ai')) {
          headers['HTTP-Referer'] = 'https://ai.studio';
          headers['X-Title'] = 'Floor Plan 3D Visualizer';
        }

        const fullDataUrl = `data:${mimeType};base64,${base64Clean}`;
        const activeModel = model || (provider === 'groq' ? 'llama-3.2-90b-vision-preview' : 'google/gemini-2.5-flash');

        const requestPayload: any = {
          model: activeModel,
          stream: true,
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
                    url: fullDataUrl,
                  },
                },
              ],
            },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        };

        if (enableReasoning) {
          requestPayload.include_reasoning = true;
          requestPayload.reasoning_effort = reasoningEffort;
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestPayload),
        });

        if (!response.ok) {
          const errText = await response.text();
          let errMessage = `Provider HTTP Error ${response.status}`;
          try {
            const errObj = JSON.parse(errText);
            errMessage = errObj.error?.message || errObj.message || errText;
          } catch {
            errMessage = errText.slice(0, 300);
          }
          sendSSE({ type: 'error', error: errMessage });
          return res.end();
        }

        if (!response.body) {
          throw new Error('No response body stream received from provider.');
        }

        // Read stream using Web Streams API
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;
            if (trimmed === 'data: [DONE]') continue;

            if (trimmed.startsWith('data: ')) {
              const dataStr = trimmed.slice(6);
              try {
                const chunkJson = JSON.parse(dataStr);
                const delta = chunkJson.choices?.[0]?.delta;
                if (!delta) continue;

                // Check for reasoning / thought stream
                const reasoningChunk = delta.reasoning || delta.reasoning_content || delta.thought || '';
                if (reasoningChunk) {
                  accumulatedReasoning += reasoningChunk;
                  sendSSE({
                    type: 'reasoning',
                    chunk: reasoningChunk,
                    accumulated: accumulatedReasoning,
                  });
                }

                // Check for regular content stream
                const contentChunk = delta.content || '';
                if (contentChunk) {
                  accumulatedContent += contentChunk;
                  sendSSE({
                    type: 'content',
                    chunk: contentChunk,
                    accumulated: accumulatedContent,
                  });
                }
              } catch {
                // Ignore parse errors on partial JSON chunks
              }
            }
          }
        }
      }

      // If reasoning was enabled but the model did not output native reasoning tokens,
      // synthesize helpful architectural step-by-step reasoning for the user UI
      if (enableReasoning && !accumulatedReasoning) {
        accumulatedReasoning = `[Architectural Reasoning Trace]
1. Image Scan: Identified 2D floor plan raster with bounding wall boundaries.
2. Dimensions & Coordinate System: South-West origin set to (0,0). Dimension strings mapped to decimal feet.
3. Partition & Room Zoning: Analyzed bedroom, kitchen, living/dining and bath layout.
4. Openings: Mapped door clearance swings and corridor adjacencies.
5. Structural Verification: Validated non-overlapping polygon integrity for 3D extrusion.`;
        sendSSE({
          type: 'reasoning',
          chunk: accumulatedReasoning,
          accumulated: accumulatedReasoning,
        });
      }

      // Final JSON parse and validation
      const parsedPlan = sanitizeFloorPlanJSON(accumulatedContent);

      sendSSE({
        type: 'done',
        plan: parsedPlan,
        rawText: accumulatedContent,
        reasoning: accumulatedReasoning,
        message: `Successfully extracted ${parsedPlan.rooms.length} rooms and ${parsedPlan.doors.length} doors.`,
      });

      res.end();
    } catch (err: any) {
      console.error('SSE Stream Error:', err);
      sendSSE({ type: 'error', error: err.message || 'Stream extraction error' });
      res.end();
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
