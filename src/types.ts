export type RoomType =
  | 'bedroom'
  | 'toilet'
  | 'kitchen'
  | 'living_dining'
  | 'pooja'
  | 'balcony'
  | 'corridor'
  | 'staircase'
  | 'other';

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  x: number; // in feet, bottom-left X from building origin
  y: number; // in feet, bottom-left Y from building origin
  width: number; // in feet (East-West dimension)
  length: number; // in feet (North-South dimension)
  customColor?: string;
  floorMaterial?: 'wood' | 'tile' | 'marble' | 'stone' | 'carpet' | 'concrete';
}

export type WallSide = 'north' | 'south' | 'east' | 'west';

export interface Door {
  id: string;
  connects?: string[]; // room ids or 'exterior' / 'corridor'
  x: number; // center position in feet
  y: number; // center position in feet
  width: number; // door width (e.g. 2.5 - 3.5 ft)
  wall?: WallSide;
  swingDirection?: 'inward' | 'outward';
  swingSide?: 'left' | 'right';
}

export interface WindowOpening {
  id: string;
  x: number;
  y: number;
  width: number;
  height?: number;
  elevation?: number; // height above floor (default ~3 ft)
  wall?: WallSide;
}

export interface StaircaseData {
  x: number;
  y: number;
  width: number;
  length: number;
  direction: 'up' | 'down';
  stepCount?: number;
  connectingFloorId?: string;
}

export interface BalconyData {
  x: number;
  y: number;
  width: number;
  length: number;
  railing_type?: 'glass' | 'metal' | 'concrete';
}

export interface FloorLevel {
  id: string;
  name: string; // e.g. "Ground Floor", "First Floor", "Second Floor", "Terrace"
  levelIndex: number; // 0 for Ground, 1 for 1st, 2 for 2nd
  elevation: number; // vertical height in feet (0, 10, 20, ...)
  height: number; // floor-to-ceiling height (default 10 ft)
  rooms: Room[];
  doors: Door[];
  windows?: WindowOpening[];
  staircase?: StaircaseData;
  balconies?: BalconyData[];
}

export interface FloorPlanData {
  unit: 'feet' | 'meters';
  outer_boundary: {
    width: number;
    height: number;
  };
  north_angle_deg: number;
  wall_thickness_ft: number;
  wall_height_ft: number;
  // Multi-floor support
  floors?: FloorLevel[];
  activeFloorId?: string;
  // Current active floor convenience fields
  rooms: Room[];
  doors: Door[];
  windows?: WindowOpening[];
  staircase?: StaircaseData;
  balconies?: BalconyData[];
}

/**
 * Normalizes any FloorPlanData ensuring valid multi-floor structure
 */
export function normalizeMultiFloorPlan(plan: FloorPlanData): FloorPlanData {
  const defaultHeight = plan.wall_height_ft || 10;

  if (!plan.floors || plan.floors.length === 0) {
    const groundFloor: FloorLevel = {
      id: 'floor_ground',
      name: 'Ground Floor',
      levelIndex: 0,
      elevation: 0,
      height: defaultHeight,
      rooms: plan.rooms || [],
      doors: plan.doors || [],
      windows: plan.windows || [],
      staircase: plan.staircase,
      balconies: plan.balconies || [],
    };
    return {
      ...plan,
      floors: [groundFloor],
      activeFloorId: 'floor_ground',
      rooms: groundFloor.rooms,
      doors: groundFloor.doors,
      windows: groundFloor.windows,
      staircase: groundFloor.staircase,
      balconies: groundFloor.balconies,
    };
  }

  const activeId = plan.activeFloorId || plan.floors[0].id;
  const activeFloor = plan.floors.find((f) => f.id === activeId) || plan.floors[0];

  return {
    ...plan,
    activeFloorId: activeFloor.id,
    rooms: activeFloor.rooms,
    doors: activeFloor.doors,
    windows: activeFloor.windows,
    staircase: activeFloor.staircase,
    balconies: activeFloor.balconies,
  };
}

export type ViewMode = '2d_edit' | '3d_orbit' | '3d_walkthrough';
export type LightingPreset = 'daylight' | 'golden_hour' | 'night_cozy' | 'studio_bright';

export type LLMProviderType = 'openrouter' | 'groq' | 'gemini' | 'openai' | 'custom';

export interface LLMProviderConfig {
  provider: LLMProviderType;
  apiKey: string;
  model: string;
  baseUrl?: string;
  temperature?: number;
}

export interface ModelPreset {
  id: string;
  name: string;
  provider: LLMProviderType;
  description: string;
  supportsVision: boolean;
}
