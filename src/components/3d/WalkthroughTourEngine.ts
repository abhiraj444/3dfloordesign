import * as THREE from 'three';
import { FloorPlanData, Room, FloorLevel } from '../../types';

export interface TourStation {
  id: string;
  name: string;
  type: string;
  category: string;
  floorId?: string;
  floorName?: string;
  floorIndex?: number;
  position: THREE.Vector3;
  entryPoint?: THREE.Vector3;
  lookYaw: number;
  sweepYawAngles: number[];
  dwellTime: number; // seconds to inspect room
  details: {
    areaSqFt: number;
    dimensions: string;
    flooring: string;
    vastuZone: string;
    description: string;
  };
}

export interface TourState {
  isActive: boolean;
  isPaused: boolean;
  currentStationIndex: number;
  currentStation: TourStation | null;
  progress: number; // 0 to 1
  speed: number; // 1.0, 1.5, 2.0
  statusText: string;
}

/**
 * Floor Plan Tour Generator:
 * Computes a sequential walkthrough route across all floor levels:
 * Ground Floor -> Staircase -> First Floor -> Staircase -> Second Floor ...
 * In each floor: Foyer/Staircase -> Hall -> Balcony -> Kitchen -> Master Bedroom -> Toilet -> Pooja
 */
export function generateTourStations(plan: FloorPlanData): TourStation[] {
  const stations: TourStation[] = [];
  const eyeHeight = 5.5;

  const getFlooringDescription = (type: string) => {
    switch (type) {
      case 'bedroom':
        return 'Warm Oak Wood Plank Flooring';
      case 'living_dining':
        return 'Polished Italian Vitrified Marble Tiles';
      case 'kitchen':
        return 'Anti-Stain Matte Slate Ceramic Tile';
      case 'toilet':
        return 'Slip-Resistant Textured Ceramic Tile';
      case 'pooja':
        return 'Sacred Makrana White Marble Inlay';
      case 'balcony':
        return 'Weatherproof Terracotta & Granite Pavers';
      case 'terrace':
        return 'Solar-Reflective Vitrified Outdoor Pavers';
      default:
        return 'Premium Vitrified Porcelain Finish';
    }
  };

  const getVastuZone = (x: number, y: number, w: number, l: number, totalW: number, totalL: number) => {
    const cx = x + w / 2;
    const cy = y + l / 2;
    const isEast = cx > totalW * 0.55;
    const isWest = cx < totalW * 0.45;
    const isNorth = cy < totalL * 0.45;
    const isSouth = cy > totalL * 0.55;

    if (isNorth && isEast) return 'North-East (Ishanya - Divine Energy)';
    if (isNorth && isWest) return 'North-West (Vayavya - Air & Social)';
    if (isSouth && isEast) return 'South-East (Agneya - Fire & Energy)';
    if (isSouth && isWest) return 'South-West (Nairutya - Earth & Stability)';
    if (isNorth) return 'North (Kubera - Prosperity)';
    if (isSouth) return 'South (Yama - Strength)';
    if (isEast) return 'East (Surya - Health & Clarity)';
    if (isWest) return 'West (Varuna - Growth)';
    return 'Brahmasthan (Central Harmonic Core)';
  };

  const totalW = plan.outer_boundary?.width || 30;
  const totalL = plan.outer_boundary?.height || 50;

  const floors: FloorLevel[] = plan.floors && plan.floors.length > 0 ? plan.floors : [
    {
      id: 'floor_ground',
      name: 'Ground Floor',
      levelIndex: 0,
      elevation: 0,
      height: plan.wall_height_ft || 10,
      rooms: plan.rooms || [],
      doors: plan.doors || [],
      windows: plan.windows || [],
      staircase: plan.staircase,
      balconies: plan.balconies,
    }
  ];

  const roomOrderMap: Record<string, number> = {
    living_dining: 1,
    kitchen: 2,
    bedroom: 3,
    toilet: 4,
    pooja: 5,
    balcony: 6,
    utility: 7,
    terrace: 8,
  };

  floors.forEach((floor, fIdx) => {
    const floorElevation = floor.elevation ?? (fIdx * (floor.height || 10));

    // 1. Staircase / Arrival on this floor
    if (floor.staircase) {
      const s = floor.staircase;
      stations.push({
        id: `station_${floor.id}_staircase`,
        name: `${floor.name} - Staircase Foyer`,
        type: 'staircase',
        category: 'Circulation & Entry',
        floorId: floor.id,
        floorName: floor.name,
        floorIndex: floor.levelIndex,
        position: new THREE.Vector3(s.x + s.width / 2, floorElevation + eyeHeight, s.y + 2.0),
        lookYaw: 0,
        sweepYawAngles: [0, 0.4, -0.4, 0],
        dwellTime: 3.0,
        details: {
          areaSqFt: Math.round(s.width * s.length),
          dimensions: `${s.width}′ × ${s.length}′`,
          flooring: 'Solid Teak Tread with Glass & Steel Balustrade',
          vastuZone: getVastuZone(s.x, s.y, s.width, s.length, totalW, totalL),
          description: `Access staircase foyer connecting ${floor.name} with vertical circulation.`,
        },
      });
    }

    // Sort rooms on this floor
    const sortedRooms = [...(floor.rooms || [])].sort((a, b) => {
      const orderA = roomOrderMap[a.type] ?? 10;
      const orderB = roomOrderMap[b.type] ?? 10;
      return orderA - orderB;
    });

    let balconyAdded = false;

    sortedRooms.forEach((room, idx) => {
      const cx = room.x + room.width / 2;
      const cy = room.y + room.length / 2;
      const area = Math.round(room.width * room.length);

      // Living room -> Balcony check
      if (room.type === 'living_dining' && floor.balconies && floor.balconies.length > 0 && !balconyAdded) {
        stations.push({
          id: `station_${floor.id}_${room.id}`,
          name: `${floor.name} - ${room.name || 'Living & Dining Hall'}`,
          type: room.type,
          category: 'Main Hall',
          floorId: floor.id,
          floorName: floor.name,
          floorIndex: floor.levelIndex,
          position: new THREE.Vector3(cx, floorElevation + eyeHeight, cy),
          lookYaw: 0,
          sweepYawAngles: [0, 0.7, 1.4, -0.7, 0],
          dwellTime: 4.5,
          details: {
            areaSqFt: area,
            dimensions: `${room.width}′ × ${room.length}′`,
            flooring: getFlooringDescription(room.type),
            vastuZone: getVastuZone(room.x, room.y, room.width, room.length, totalW, totalL),
            description: `Spacious central hall on ${floor.name} with natural lighting and dining space.`,
          },
        });

        const b = floor.balconies[0];
        stations.push({
          id: `station_${floor.id}_balcony_0`,
          name: `${floor.name} - Outdoor Scenic Balcony`,
          type: 'balcony',
          category: 'Outdoor Living',
          floorId: floor.id,
          floorName: floor.name,
          floorIndex: floor.levelIndex,
          position: new THREE.Vector3(b.x + b.width / 2, floorElevation + eyeHeight, b.y + b.length / 2),
          lookYaw: Math.PI,
          sweepYawAngles: [Math.PI, Math.PI + 0.6, Math.PI - 0.6, Math.PI],
          dwellTime: 3.5,
          details: {
            areaSqFt: Math.round(b.width * b.length),
            dimensions: `${b.width}′ × ${b.length}′`,
            flooring: getFlooringDescription('balcony'),
            vastuZone: getVastuZone(b.x, b.y, b.width, b.length, totalW, totalL),
            description: `Open-air scenic balcony deck on ${floor.name} bringing abundant breeze and views.`,
          },
        });
        balconyAdded = true;
        return;
      }

      stations.push({
        id: `station_${floor.id}_${room.id}`,
        name: `${floor.name} - ${room.name || room.type.replace('_', ' ').toUpperCase()}`,
        type: room.type,
        category: room.type.replace('_', ' ').toUpperCase(),
        floorId: floor.id,
        floorName: floor.name,
        floorIndex: floor.levelIndex,
        position: new THREE.Vector3(cx, floorElevation + eyeHeight, cy),
        lookYaw: (idx % 2 === 0 ? 0 : Math.PI / 2),
        sweepYawAngles: [0, 0.5, -0.5, 0],
        dwellTime: room.type === 'kitchen' ? 4.0 : room.type === 'bedroom' ? 4.5 : 3.0,
        details: {
          areaSqFt: area,
          dimensions: `${room.width}′ × ${room.length}′`,
          flooring: getFlooringDescription(room.type),
          vastuZone: getVastuZone(room.x, room.y, room.width, room.length, totalW, totalL),
          description:
            room.type === 'kitchen'
              ? `Modular culinary kitchen on ${floor.name} with ergonomic countertop and appliance layout.`
              : room.type === 'bedroom'
              ? `Comfortable bedroom suite on ${floor.name} featuring wardrobes and window views.`
              : room.type === 'pooja'
              ? `Serene prayer mandir on ${floor.name} with sacred Makrana marble finishes.`
              : room.type === 'toilet'
              ? `Modern sanitary bathroom on ${floor.name} with anti-slip ceramic tiles.`
              : `Functional interior room on ${floor.name} designed with optimal daylighting.`,
        },
      });
    });

    // Balconies if not already added
    if (!balconyAdded && floor.balconies && floor.balconies.length > 0) {
      floor.balconies.forEach((b, bIdx) => {
        stations.push({
          id: `station_${floor.id}_balcony_${bIdx}`,
          name: `${floor.name} - Outdoor Balcony`,
          type: 'balcony',
          category: 'Outdoor Living',
          floorId: floor.id,
          floorName: floor.name,
          floorIndex: floor.levelIndex,
          position: new THREE.Vector3(b.x + b.width / 2, floorElevation + eyeHeight, b.y + b.length / 2),
          lookYaw: 0,
          sweepYawAngles: [-0.5, 0, 0.5, 0],
          dwellTime: 3.5,
          details: {
            areaSqFt: Math.round(b.width * b.length),
            dimensions: `${b.width}′ × ${b.length}′`,
            flooring: getFlooringDescription('balcony'),
            vastuZone: getVastuZone(b.x, b.y, b.width, b.length, totalW, totalL),
            description: `Scenic outdoor deck on ${floor.name}.`,
          },
        });
      });
    }
  });

  return stations;
}

/**
 * Cinematic Walkthrough Tour Engine
 * Interpolates smooth walking motion, realistic head bob, door passage, and room inspection across multi-floors.
 */
export class WalkthroughTourEngine {
  private camera: THREE.Camera;
  private stations: TourStation[] = [];
  private currentStationIdx = 0;
  private stationTimer = 0; // timer inside current room dwell
  private transitionProgress = 0; // 0 to 1 between stations
  private isTraveling = false; // true when walking between stations, false when dwelling

  private fromPos = new THREE.Vector3();
  private toPos = new THREE.Vector3();
  private fromYaw = 0;
  private toYaw = 0;
  private travelDuration = 3.5; // seconds to walk between rooms

  public state: TourState = {
    isActive: false,
    isPaused: false,
    currentStationIndex: 0,
    currentStation: null,
    progress: 0,
    speed: 1.0,
    statusText: 'Ready',
  };

  // Callbacks
  public onStateUpdate?: (state: TourState) => void;
  public onStepSound?: () => void;
  private lastStepDist = 0;

  constructor(camera: THREE.Camera) {
    this.camera = camera;
  }

  public setPlan(plan: FloorPlanData) {
    this.stations = generateTourStations(plan);
    if (this.stations.length > 0) {
      this.state.currentStation = this.stations[0];
    }
  }

  public startTour(startIndex = 0) {
    if (this.stations.length === 0) return;
    this.currentStationIdx = Math.max(0, Math.min(this.stations.length - 1, startIndex));
    const station = this.stations[this.currentStationIdx];

    this.state.isActive = true;
    this.state.isPaused = false;
    this.state.currentStationIndex = this.currentStationIdx;
    this.state.currentStation = station;
    this.state.statusText = `Touring: ${station.name}`;

    // Place camera at starting station
    this.camera.position.copy(station.position);
    this.setCameraLook(station.lookYaw, 0);

    this.isTraveling = false;
    this.stationTimer = 0;
    this.transitionProgress = 0;
    this.lastStepDist = 0;

    this.notifyState();
  }

  public pauseTour() {
    this.state.isPaused = true;
    this.state.statusText = 'Tour Paused';
    this.notifyState();
  }

  public resumeTour() {
    this.state.isPaused = false;
    this.state.statusText = `Touring: ${this.stations[this.currentStationIdx]?.name || ''}`;
    this.notifyState();
  }

  public stopTour() {
    this.state.isActive = false;
    this.state.isPaused = false;
    this.state.statusText = 'Free Roam';
    this.notifyState();
  }

  public nextStation() {
    if (this.currentStationIdx < this.stations.length - 1) {
      this.beginTravelToStation(this.currentStationIdx + 1);
    } else {
      // Loop back to start
      this.beginTravelToStation(0);
    }
  }

  public prevStation() {
    if (this.currentStationIdx > 0) {
      this.beginTravelToStation(this.currentStationIdx - 1);
    }
  }

  public jumpToStation(index: number) {
    if (index >= 0 && index < this.stations.length) {
      this.beginTravelToStation(index);
    }
  }

  public setSpeed(multiplier: number) {
    this.state.speed = Math.max(0.5, Math.min(3.0, multiplier));
    this.notifyState();
  }

  private beginTravelToStation(targetIdx: number) {
    this.fromPos.copy(this.camera.position);
    this.fromYaw = this.getCameraYaw();

    this.currentStationIdx = targetIdx;
    const targetStation = this.stations[targetIdx];
    this.toPos.copy(targetStation.position);
    this.toYaw = targetStation.lookYaw;

    // Calculate duration based on distance (human walking speed ~4.5 ft/s)
    const dist = this.fromPos.distanceTo(this.toPos);
    this.travelDuration = Math.max(2.0, dist / 4.5);

    this.isTraveling = true;
    this.transitionProgress = 0;
    this.stationTimer = 0;

    this.state.currentStationIndex = this.currentStationIdx;
    this.state.currentStation = targetStation;
    this.state.statusText = `Walking to ${targetStation.name}...`;
    this.notifyState();
  }

  private getCameraYaw(): number {
    const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
    return euler.y;
  }

  private setCameraLook(yaw: number, pitch = 0) {
    const euler = new THREE.Euler(pitch, yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);
  }

  /**
   * Update tour frame by frame
   */
  public update(delta: number) {
    if (!this.state.isActive || this.state.isPaused || this.stations.length === 0) return;

    const scaledDelta = delta * this.state.speed;
    const currentStation = this.stations[this.currentStationIdx];

    if (this.isTraveling) {
      // Traveling / Walking between stations
      this.transitionProgress += scaledDelta / this.travelDuration;
      const t = Math.min(1.0, this.transitionProgress);

      // Smooth step easing (easeInOutQuad)
      const easeT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      // Base position interpolation
      const basePos = new THREE.Vector3().lerpVectors(this.fromPos, this.toPos, easeT);
      
      // Human walking subtle head bob (vertical sine wave)
      const headBob = Math.sin(t * Math.PI * 8) * 0.08;
      this.camera.position.set(basePos.x, basePos.y + headBob, basePos.z);

      // Footstep sound trigger every half-cycle of head bob
      const currentDist = t * this.travelDuration;
      if (currentDist - this.lastStepDist > 0.55) {
        this.lastStepDist = currentDist;
        this.onStepSound?.();
      }

      // Yaw rotation interpolation toward walking vector and final target
      const travelDir = new THREE.Vector3().subVectors(this.toPos, this.fromPos);
      const walkAngle = travelDir.length() > 0.1 ? Math.atan2(-travelDir.x, -travelDir.z) : this.toYaw;
      
      // Look forward along path in early half, blend to room look in second half
      const targetLookYaw = t < 0.7 ? walkAngle : this.toYaw;
      const currentYaw = THREE.MathUtils.lerp(this.fromYaw, targetLookYaw, easeT);
      this.setCameraLook(currentYaw, 0);

      if (t >= 1.0) {
        this.isTraveling = false;
        this.stationTimer = 0;
        this.state.statusText = `Viewing: ${currentStation.name}`;
        this.notifyState();
      }
    } else {
      // Dwelling & Room Panoramic Sweep
      this.stationTimer += scaledDelta;
      const dwellProgress = this.stationTimer / currentStation.dwellTime;

      // Gentle panoramic room sweep
      const sweepAngles = currentStation.sweepYawAngles;
      if (sweepAngles && sweepAngles.length > 1) {
        const sweepIndex = dwellProgress * (sweepAngles.length - 1);
        const segment = Math.floor(sweepIndex);
        const segT = sweepIndex - segment;
        if (segment < sweepAngles.length - 1) {
          const yawA = sweepAngles[segment];
          const yawB = sweepAngles[segment + 1];
          const smoothSegT = Math.sin((segT - 0.5) * Math.PI) * 0.5 + 0.5;
          const currentYaw = THREE.MathUtils.lerp(yawA, yawB, smoothSegT);
          this.setCameraLook(currentYaw, -0.02);
        }
      }

      // Idle subtle breathing motion at actual station height
      this.camera.position.y = currentStation.position.y + Math.sin(this.stationTimer * 1.5) * 0.02;

      if (dwellProgress >= 1.0) {
        // Proceed to next station
        this.nextStation();
      }
    }

    // Calculate total tour progress
    const totalStations = this.stations.length;
    const baseProgress = this.currentStationIdx / Math.max(1, totalStations);
    const stationFraction = (this.isTraveling ? this.transitionProgress * 0.5 : 0.5 + (this.stationTimer / currentStation.dwellTime) * 0.5) / Math.max(1, totalStations);
    this.state.progress = Math.min(1.0, baseProgress + stationFraction);

    this.notifyState();
  }

  private notifyState() {
    this.onStateUpdate?.({ ...this.state });
  }

  public getStations(): TourStation[] {
    return this.stations;
  }
}
