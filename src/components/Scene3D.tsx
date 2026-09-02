import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FloorPlanData, Room, ViewMode, LightingPreset, FloorLevel } from '../types';
import { buildMultiFloorArchitecturalModel, WallMeshResult } from './3d/WallGeometry';
import { generateFurnitureForFloor } from './3d/FurnitureRegistry';
import { FirstPersonController } from './3d/WalkthroughControls';
import { Minimap } from './3d/Minimap';
import {
  Compass,
  Sun,
  Moon,
  Sunset,
  Eye,
  Camera,
  Layers,
  Sparkles,
  Move,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Zap,
  ZoomIn,
  ZoomOut,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Building2,
  Monitor,
  Smartphone,
} from 'lucide-react';

interface Scene3DProps {
  plan: FloorPlanData;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onSelectRoom?: (room: Room) => void;
}

export const Scene3D: React.FC<Scene3DProps> = ({ plan, viewMode, onViewModeChange, onSelectRoom }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orbitControlsRef = useRef<OrbitControls | null>(null);
  const fpControllerRef = useRef<FirstPersonController | null>(null);

  // Groups
  const architecturalGroupRef = useRef<THREE.Group | null>(null);
  const furnitureGroupRef = useRef<THREE.Group | null>(null);
  const ceilingsGroupRef = useRef<THREE.Group | null>(null);
  const labelsGroupRef = useRef<THREE.Group | null>(null);
  const lightsGroupRef = useRef<THREE.Group | null>(null);

  // Keep viewMode ref in sync to avoid stale closure in animation frame
  const viewModeRef = useRef<ViewMode>(viewMode);
  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  // State
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [playerPos, setPlayerPos] = useState<{ x: number; y: number; z: number; yaw: number; floorElevation?: number } | undefined>();
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [lighting, setLighting] = useState<LightingPreset>('daylight');
  const [showFurniture, setShowFurniture] = useState(true);
  const [showCeilings, setShowCeilings] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [isTakingSnapshot, setIsTakingSnapshot] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isMobileSprinting, setIsMobileSprinting] = useState(false);
  const [currentFov, setCurrentFov] = useState(50);
  const [showZoomToast, setShowZoomToast] = useState(false);
  const zoomToastTimerRef = useRef<any>(null);

  // Control Mode: 'desktop' (mouse/keyboard) or 'mobile' (touch/on-screen controls)
  const [controlMode, setControlMode] = useState<'desktop' | 'mobile'>(() => {
    if (typeof window !== 'undefined') {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      return hasTouch || window.innerWidth < 768 ? 'mobile' : 'desktop';
    }
    return 'desktop';
  });

  // Multi-Floor State
  const [activeFloorFilter, setActiveFloorFilter] = useState<string>('all');
  const [explodedSpacing, setExplodedSpacing] = useState<number>(0);

  // Normalized floors list
  const floorsList = useMemo<FloorLevel[]>(() => {
    if (plan.floors && plan.floors.length > 0) {
      return plan.floors;
    }
    return [
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
      },
    ];
  }, [plan]);

  // Step audio synth using Web Audio API
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playFootstep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120 + Math.random() * 30, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // Audio context might be restricted
    }
  }, [soundEnabled]);

  // Setup Lights based on preset
  const updateLighting = useCallback((preset: LightingPreset, scene: THREE.Scene) => {
    if (lightsGroupRef.current) {
      scene.remove(lightsGroupRef.current);
      lightsGroupRef.current.clear();
    }

    const lightsGroup = new THREE.Group();
    lightsGroupRef.current = lightsGroup;

    const boundary = plan.outer_boundary || { width: 30, height: 50 };
    const centerX = boundary.width / 2;
    const centerZ = boundary.height / 2;
    const totalFloors = floorsList.length;
    const buildingHeight = totalFloors * 12 + 20;

    switch (preset) {
      case 'daylight': {
        const ambient = new THREE.AmbientLight(0xdce7f0, 0.75);
        const sun = new THREE.DirectionalLight(0xfffaed, 1.4);
        sun.position.set(centerX + 35, buildingHeight + 30, centerZ + 25);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 250;
        const d = Math.max(boundary.width, boundary.height) * 1.5;
        sun.shadow.camera.left = -d;
        sun.shadow.camera.right = d;
        sun.shadow.camera.top = d;
        sun.shadow.camera.bottom = -d;
        sun.shadow.bias = -0.0005;

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0xb0bec5, 0.55);
        lightsGroup.add(ambient, sun, hemiLight);
        scene.background = new THREE.Color(0xe8f0fe);
        break;
      }
      case 'golden_hour': {
        const ambient = new THREE.AmbientLight(0xffd8b3, 0.6);
        const sun = new THREE.DirectionalLight(0xff9e43, 1.8);
        sun.position.set(centerX + 40, buildingHeight + 10, centerZ - 20);
        sun.castShadow = true;
        const hemiLight = new THREE.HemisphereLight(0xffeedd, 0x5c4033, 0.4);
        lightsGroup.add(ambient, sun, hemiLight);
        scene.background = new THREE.Color(0xfde2b8);
        break;
      }
      case 'night_cozy': {
        const ambient = new THREE.AmbientLight(0x1a233a, 0.35);
        const moon = new THREE.DirectionalLight(0x738cb3, 0.4);
        moon.position.set(-20, buildingHeight + 20, -20);
        lightsGroup.add(ambient, moon);

        floorsList.forEach((floor, fIdx) => {
          const elev = floor.elevation ?? (fIdx * (floor.height || 10));
          floor.rooms.forEach((room) => {
            const pointLight = new THREE.PointLight(0xffdf9e, 1.1, Math.max(room.width, room.length) * 1.5);
            pointLight.position.set(room.x + room.width / 2, elev + (floor.height || 10) - 1.0, room.y + room.length / 2);
            pointLight.castShadow = true;
            lightsGroup.add(pointLight);
          });
        });

        scene.background = new THREE.Color(0x0a0e17);
        break;
      }
      case 'studio_bright':
      default: {
        const ambient = new THREE.AmbientLight(0xffffff, 0.9);
        const dir1 = new THREE.DirectionalLight(0xffffff, 0.8);
        dir1.position.set(30, buildingHeight + 20, 30);
        const dir2 = new THREE.DirectionalLight(0xffffff, 0.4);
        dir2.position.set(-30, buildingHeight + 20, -30);
        lightsGroup.add(ambient, dir1, dir2);
        scene.background = new THREE.Color(0xf1f5f9);
        break;
      }
    }

    scene.add(lightsGroup);
  }, [plan, floorsList]);

  // Create 3D Room Text Badges floating above rooms on active floors
  const createRoomLabels = useCallback((scene: THREE.Scene) => {
    if (labelsGroupRef.current) {
      scene.remove(labelsGroupRef.current);
      labelsGroupRef.current.clear();
    }

    const labelsGroup = new THREE.Group();
    labelsGroupRef.current = labelsGroup;

    floorsList.forEach((floor, fIdx) => {
      if (activeFloorFilter !== 'all' && floor.id !== activeFloorFilter) return;

      const baseElevation = (floor.elevation ?? (fIdx * (floor.height || 10))) + (fIdx * explodedSpacing);
      const floorH = floor.height || 10;

      floor.rooms.forEach((room) => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
          ctx.beginPath();
          ctx.roundRect(16, 16, 480, 224, 32);
          ctx.fill();

          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 8;
          ctx.beginPath();
          ctx.roundRect(16, 16, 480, 224, 32);
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 42px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(room.name, 256, 105);

          ctx.fillStyle = '#fbbf24';
          ctx.font = '32px monospace';
          ctx.fillText(`${room.width}′ × ${room.length}′`, 256, 175);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.95 });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(6, 3, 1);
        sprite.position.set(room.x + room.width / 2, baseElevation + floorH + 2.2, room.y + room.length / 2);
        labelsGroup.add(sprite);
      });
    });

    scene.add(labelsGroup);
  }, [floorsList, activeFloorFilter, explodedSpacing]);

  // Build Scene Content (Multi-Floor Architecture & Furniture)
  const rebuildScene = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (architecturalGroupRef.current) {
      scene.remove(architecturalGroupRef.current);
      architecturalGroupRef.current.clear();
    }
    if (furnitureGroupRef.current) {
      scene.remove(furnitureGroupRef.current);
      furnitureGroupRef.current.clear();
    }
    if (ceilingsGroupRef.current) {
      scene.remove(ceilingsGroupRef.current);
      ceilingsGroupRef.current.clear();
    }

    // Build multi-floor architectural model
    const architecturalModel: WallMeshResult = buildMultiFloorArchitecturalModel(plan, {
      activeFloorOnly: activeFloorFilter !== 'all',
      activeFloorId: activeFloorFilter,
      explodedSpacing,
    });

    architecturalGroupRef.current = architecturalModel.group;
    scene.add(architecturalModel.group);

    // Update collision boxes & doors in FPS controller
    if (fpControllerRef.current) {
      fpControllerRef.current.setCollisionBoxes(architecturalModel.collisionBoxes);
      fpControllerRef.current.setRooms(plan.rooms || []);
      fpControllerRef.current.setDoors(plan.doors || []);
      fpControllerRef.current.setFloors(floorsList);
    }

    // Build furniture per floor
    const furnitureGroup = new THREE.Group();
    furnitureGroupRef.current = furnitureGroup;

    floorsList.forEach((floor, fIdx) => {
      if (activeFloorFilter !== 'all' && floor.id !== activeFloorFilter) return;

      const elevation = (floor.elevation ?? (fIdx * (floor.height || 10))) + (fIdx * explodedSpacing);
      const floorFurniture = generateFurnitureForFloor(
        floor.rooms,
        floor.staircase,
        floor.balconies,
        elevation
      );
      furnitureGroup.add(floorFurniture);
    });

    scene.add(furnitureGroup);
    ceilingsGroupRef.current = architecturalModel.ceilingsGroup;
    scene.add(architecturalModel.ceilingsGroup);

    furnitureGroup.visible = showFurniture;
    architecturalModel.ceilingsGroup.visible = showCeilings;

    createRoomLabels(scene);
    updateLighting(lighting, scene);
  }, [plan, floorsList, activeFloorFilter, explodedSpacing, showFurniture, showCeilings, lighting, createRoomLabels, updateLighting]);

  // Init Three.js Scene
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 800);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    rendererRef.current = renderer;

    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;
    orbitControls.maxPolarAngle = Math.PI / 2 - 0.02;
    orbitControls.minDistance = 5;
    orbitControls.maxDistance = 300;
    orbitControlsRef.current = orbitControls;

    const boundary = plan.outer_boundary || { width: 30, height: 50 };
    const centerX = boundary.width / 2;
    const centerZ = boundary.height / 2;

    camera.position.set(centerX - 30, 48, centerZ + 45);
    orbitControls.target.set(centerX, 0, centerZ);
    orbitControls.update();

    // First Person Controller setup
    const fpController = new FirstPersonController(camera, renderer.domElement);
    fpController.setRooms(plan.rooms || []);
    fpController.setDoors(plan.doors || []);
    fpController.setFloors(floorsList);

    fpController.onRoomChange = (room) => {
      setActiveRoom(room);
      if (room) onSelectRoom?.(room);
    };
    fpController.onPositionChange = (pos) => {
      setPlayerPos(pos);
    };
    fpController.onFovChange = (fov) => {
      setCurrentFov(Math.round(fov));
    };
    fpControllerRef.current = fpController;

    rebuildScene();

    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      if (viewModeRef.current === '3d_walkthrough') {
        if (fpControllerRef.current) {
          fpControllerRef.current.update(delta);
        }
      } else {
        if (orbitControlsRef.current && orbitControlsRef.current.enabled) {
          orbitControlsRef.current.update();
        }
      }

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      orbitControls.dispose();
      fpController.dispose();
    };
  }, []);

  useEffect(() => {
    rebuildScene();
  }, [rebuildScene]);

  // Mode change handler
  useEffect(() => {
    if (!orbitControlsRef.current || !fpControllerRef.current || !cameraRef.current) return;

    if (viewMode === '3d_walkthrough') {
      orbitControlsRef.current.enabled = false;
      fpControllerRef.current.enabled = true;
      const groundFloor = floorsList[0];
      const startRoom = groundFloor?.rooms[0];
      if (startRoom) {
        fpControllerRef.current.setPosition(
          startRoom.x + startRoom.width / 2,
          5.5,
          startRoom.y + startRoom.length / 2,
          0
        );
      }
      setShowCeilings(true);
    } else {
      orbitControlsRef.current.enabled = true;
      fpControllerRef.current.enabled = false;
      setIsPointerLocked(false);
      setShowCeilings(false);
      const boundary = plan.outer_boundary || { width: 30, height: 50 };
      const centerX = boundary.width / 2;
      const centerZ = boundary.height / 2;
      cameraRef.current.position.set(centerX - 30, 48, centerZ + 45);
      orbitControlsRef.current.target.set(centerX, 0, centerZ);
      orbitControlsRef.current.update();
    }
  }, [viewMode, floorsList, plan]);

  useEffect(() => {
    if (furnitureGroupRef.current) {
      furnitureGroupRef.current.visible = showFurniture;
    }
  }, [showFurniture]);

  useEffect(() => {
    if (ceilingsGroupRef.current) {
      ceilingsGroupRef.current.visible = showCeilings;
    }
  }, [showCeilings]);

  useEffect(() => {
    if (labelsGroupRef.current) {
      labelsGroupRef.current.visible = showLabels && viewMode === '3d_orbit';
    }
  }, [showLabels, viewMode]);

  useEffect(() => {
    const handleLockChange = () => {
      const locked = document.pointerLockElement === rendererRef.current?.domElement;
      setIsPointerLocked(locked);
    };
    document.addEventListener('pointerlockchange', handleLockChange);
    return () => document.removeEventListener('pointerlockchange', handleLockChange);
  }, []);

  // Zoom Toast
  const triggerZoomToast = () => {
    setShowZoomToast(true);
    if (zoomToastTimerRef.current) clearTimeout(zoomToastTimerRef.current);
    zoomToastTimerRef.current = setTimeout(() => {
      setShowZoomToast(false);
    }, 1500);
  };

  // Zoom In / Out / Reset
  const zoomIn = () => {
    if (viewMode === '3d_orbit' && cameraRef.current && orbitControlsRef.current) {
      const cam = cameraRef.current;
      const target = orbitControlsRef.current.target;
      const dir = new THREE.Vector3().subVectors(target, cam.position);
      const dist = dir.length();
      if (dist > 6) {
        cam.position.addScaledVector(dir.normalize(), Math.min(dist * 0.25, 15));
        orbitControlsRef.current.update();
      }
    } else if (viewMode === '3d_walkthrough' && fpControllerRef.current) {
      const fov = fpControllerRef.current.zoomFov(-5);
      setCurrentFov(Math.round(fov));
      triggerZoomToast();
    }
  };

  const zoomOut = () => {
    if (viewMode === '3d_orbit' && cameraRef.current && orbitControlsRef.current) {
      const cam = cameraRef.current;
      const target = orbitControlsRef.current.target;
      const dir = new THREE.Vector3().subVectors(cam.position, target);
      cam.position.addScaledVector(dir.normalize(), 15);
      orbitControlsRef.current.update();
    } else if (viewMode === '3d_walkthrough' && fpControllerRef.current) {
      const fov = fpControllerRef.current.zoomFov(5);
      setCurrentFov(Math.round(fov));
      triggerZoomToast();
    }
  };

  const resetZoom = () => {
    if (viewMode === '3d_orbit' && cameraRef.current && orbitControlsRef.current) {
      const boundary = plan.outer_boundary || { width: 30, height: 50 };
      const centerX = boundary.width / 2;
      const centerZ = boundary.height / 2;
      cameraRef.current.position.set(centerX - 30, 48, centerZ + 45);
      orbitControlsRef.current.target.set(centerX, 0, centerZ);
      orbitControlsRef.current.update();
    } else if (viewMode === '3d_walkthrough' && fpControllerRef.current) {
      fpControllerRef.current.resetFov();
      setCurrentFov(50);
      triggerZoomToast();
    }
  };

  // Teleport to room
  const teleportToRoom = (room: Room, floorElevation = 0) => {
    if (fpControllerRef.current) {
      fpControllerRef.current.setPosition(
        room.x + room.width / 2,
        floorElevation + 5.5,
        room.y + room.length / 2,
        0
      );
      setActiveRoom(room);
      onSelectRoom?.(room);
    }
  };

  // Snapshot capture
  const takeSnapshot = () => {
    if (!rendererRef.current) return;
    setIsTakingSnapshot(true);
    setTimeout(() => {
      try {
        const dataUrl = rendererRef.current!.domElement.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `3D-FloorPlan-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      } catch (e) {
        console.error('Failed to capture snapshot:', e);
      } finally {
        setIsTakingSnapshot(false);
      }
    }, 100);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[500px] overflow-hidden bg-neutral-950 select-none pb-16 md:pb-0"
    >
      <canvas ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing outline-none block touch-none" />

      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 flex flex-wrap items-center justify-between gap-2 pointer-events-none z-10">
        {/* Left: View Mode Toggle & Mode Switcher */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 bg-neutral-900/90 backdrop-blur-md p-1 sm:p-1.5 rounded-xl border border-neutral-700/60 shadow-xl pointer-events-auto">
          <button
            id="dollhouse-mode-toggle"
            onClick={() => onViewModeChange('3d_orbit')}
            className={`flex items-center space-x-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === '3d_orbit'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dollhouse 3D</span>
            <span className="sm:hidden">3D</span>
          </button>
          <button
            id="walkthrough-mode-toggle"
            onClick={() => onViewModeChange('3d_walkthrough')}
            className={`flex items-center space-x-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === '3d_walkthrough'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Move className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Walkthrough</span>
            <span className="sm:hidden">Walk</span>
          </button>

          {/* Explicit Desktop vs Touch/Mobile Mode Switcher Icon */}
          <div className="border-l border-neutral-700 pl-1 sm:pl-1.5 ml-1">
            <button
              id="toggle-control-mode-btn"
              onClick={() => setControlMode((prev) => (prev === 'desktop' ? 'mobile' : 'desktop'))}
              title={`Switch between Desktop (Mouse/Keyboard) and Mobile (Touchscreen) Mode`}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                controlMode === 'desktop'
                  ? 'bg-neutral-800 text-amber-300 border border-amber-500/40 hover:bg-neutral-700'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30'
              }`}
            >
              {controlMode === 'desktop' ? (
                <>
                  <Monitor className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Desktop Mode</span>
                  <span className="sm:hidden">Desktop</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Mobile/Touch Mode</span>
                  <span className="sm:hidden">Touch</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Center: Multi-Floor Switcher & Exploded View Slider */}
        {floorsList.length > 1 && (
          <div className="flex items-center space-x-1 bg-neutral-900/90 backdrop-blur-md p-1 sm:p-1.5 rounded-xl border border-neutral-700/60 shadow-xl pointer-events-auto">
            <Building2 className="w-3.5 h-3.5 text-amber-400 ml-1" />
            <select
              id="active-floor-select"
              value={activeFloorFilter}
              onChange={(e) => setActiveFloorFilter(e.target.value)}
              className="bg-neutral-950 text-neutral-200 text-xs px-2 py-1 rounded-lg border border-neutral-700 outline-none font-medium"
            >
              <option value="all">🏢 All Stacked ({floorsList.length} Floors)</option>
              {floorsList.map((f, i) => (
                <option key={f.id} value={f.id}>
                  Floor {i}: {f.name}
                </option>
              ))}
            </select>

            {/* Exploded 3D Spacing in Orbit Mode */}
            {viewMode === '3d_orbit' && activeFloorFilter === 'all' && (
              <div className="flex items-center space-x-1 border-l border-neutral-700 pl-2">
                <span className="text-[10px] text-neutral-400 font-mono hidden md:inline">Explode:</span>
                <button
                  id="toggle-exploded-spacing-btn"
                  onClick={() => setExplodedSpacing((prev) => (prev === 0 ? 8 : prev === 8 ? 16 : 0))}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                    explodedSpacing > 0 ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                  title="Toggle Exploded Multi-Floor Slices"
                >
                  {explodedSpacing > 0 ? `${explodedSpacing}ft Gap` : 'Stacked'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Right: Lighting, Visual Layers & Tools */}
        <div className="flex items-center space-x-1 sm:space-x-2 bg-neutral-900/90 backdrop-blur-md p-1 sm:p-1.5 rounded-xl border border-neutral-700/60 shadow-xl pointer-events-auto">
          {/* Lighting Mode Selector */}
          <div className="flex items-center space-x-0.5 sm:space-x-1 border-r border-neutral-700 pr-1.5 sm:pr-2">
            <button
              id="lighting-daylight-btn"
              onClick={() => setLighting('daylight')}
              title="Daylight Lighting"
              className={`p-1.5 rounded-lg text-xs ${lighting === 'daylight' ? 'bg-amber-500/20 text-amber-300' : 'text-neutral-400 hover:text-white'}`}
            >
              <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              id="lighting-golden-btn"
              onClick={() => setLighting('golden_hour')}
              title="Golden Hour Sunset"
              className={`p-1.5 rounded-lg text-xs ${lighting === 'golden_hour' ? 'bg-amber-500/20 text-amber-300' : 'text-neutral-400 hover:text-white'}`}
            >
              <Sunset className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              id="lighting-night-btn"
              onClick={() => setLighting('night_cozy')}
              title="Night Cozy Interior"
              className={`p-1.5 rounded-lg text-xs ${lighting === 'night_cozy' ? 'bg-amber-500/20 text-amber-300' : 'text-neutral-400 hover:text-white'}`}
            >
              <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Furniture Toggle */}
          <button
            id="toggle-furniture-btn"
            onClick={() => setShowFurniture(!showFurniture)}
            title="Toggle Furniture"
            className={`flex items-center space-x-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs ${showFurniture ? 'bg-neutral-800 text-amber-400 font-medium' : 'text-neutral-400 hover:text-white'}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Furniture</span>
          </button>

          {/* Ceilings Toggle */}
          <button
            id="toggle-ceilings-btn"
            onClick={() => setShowCeilings(!showCeilings)}
            title="Toggle Ceiling Slabs"
            className={`flex items-center space-x-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs ${showCeilings ? 'bg-neutral-800 text-amber-400 font-medium' : 'text-neutral-400 hover:text-white'}`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Ceiling</span>
          </button>

          {/* Labels Toggle (Orbit mode) */}
          {viewMode === '3d_orbit' && (
            <button
              id="toggle-labels-btn"
              onClick={() => setShowLabels(!showLabels)}
              title="Toggle 3D Room Badges"
              className={`flex items-center space-x-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs ${showLabels ? 'bg-neutral-800 text-amber-400 font-medium' : 'text-neutral-400 hover:text-white'}`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Labels</span>
            </button>
          )}

          {/* Audio toggle */}
          {viewMode === '3d_walkthrough' && (
            <button
              id="toggle-sound-btn"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title="Footstep Audio Effects"
              className={`p-1.5 rounded-lg text-xs ${soundEnabled ? 'text-emerald-400 bg-emerald-950/40' : 'text-neutral-400 hover:text-white'}`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>
          )}

          {/* Quick Zoom In / Out / Reset */}
          <div className="flex items-center space-x-0.5 border-l border-neutral-700 pl-1 sm:pl-1.5">
            <button
              id="scene3d-zoom-in-btn"
              onClick={zoomIn}
              title="Zoom In"
              className="p-1.5 rounded-lg text-xs text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 transition"
            >
              <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              id="scene3d-zoom-out-btn"
              onClick={zoomOut}
              title="Zoom Out"
              className="p-1.5 rounded-lg text-xs text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 transition"
            >
              <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              id="scene3d-reset-zoom-btn"
              onClick={resetZoom}
              title="Reset View"
              className="p-1.5 rounded-lg text-xs text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            >
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Snapshot Button */}
          <button
            id="snapshot-btn"
            onClick={takeSnapshot}
            disabled={isTakingSnapshot}
            title="Capture Snapshot Image"
            className="p-1.5 rounded-lg text-xs text-neutral-300 hover:text-amber-400 hover:bg-neutral-800 transition"
          >
            <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Floating Zoom Toast Badge */}
      {showZoomToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-neutral-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-amber-500/40 shadow-xl flex items-center space-x-2 text-xs font-mono text-amber-300 z-30 pointer-events-none transition-all">
          <ZoomIn className="w-3.5 h-3.5 text-amber-400" />
          <span>
            {viewMode === '3d_walkthrough' ? `Lens Zoom: ${currentFov}° FOV` : 'View Zoom adjusted'}
          </span>
        </div>
      )}

      {/* Walkthrough Mode Overlays */}
      {viewMode === '3d_walkthrough' && (
        <>
          {/* Top-Right Minimap Radar */}
          <div className="absolute top-16 right-3 sm:top-20 sm:right-4 z-20 scale-90 sm:scale-100 origin-top-right">
            <Minimap
              plan={plan}
              playerPos={playerPos}
              activeRoom={activeRoom}
              onRoomClick={(r) => teleportToRoom(r, playerPos?.floorElevation || 0)}
            />
          </div>

          {/* Active Room Indicator Banner at Bottom */}
          {activeRoom && (
            <div className="absolute bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-amber-500/50 shadow-xl flex items-center space-x-2 pointer-events-none z-20">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <div className="text-center">
                <span className="text-xs font-bold text-white uppercase tracking-wider">{activeRoom.name}</span>
                <span className="text-[10px] text-amber-300 ml-2 font-mono">
                  {activeRoom.width}′ × {activeRoom.length}′
                </span>
              </div>
            </div>
          )}

          {/* Desktop Controls Helper Banner (When in Desktop Mode) */}
          {controlMode === 'desktop' && (
            <div className="absolute top-16 left-3 sm:top-20 sm:left-4 z-20 pointer-events-none bg-neutral-900/90 backdrop-blur-md p-2.5 rounded-xl border border-neutral-700/60 shadow-xl text-xs text-neutral-300 max-w-xs space-y-1">
              <div className="flex items-center space-x-1.5 text-amber-400 font-bold">
                <Monitor className="w-3.5 h-3.5" />
                <span>Desktop Controls</span>
              </div>
              <div className="font-mono text-[11px] text-neutral-300 space-y-0.5">
                <p><span className="text-amber-400 font-bold">W A S D / Arrows:</span> Walk & Strafe</p>
                <p><span className="text-amber-400 font-bold">Drag Mouse:</span> Look 360° around</p>
                <p><span className="text-amber-400 font-bold">Scroll Wheel / Pinch:</span> Zoom FOV</p>
                <p><span className="text-amber-400 font-bold">Shift:</span> Sprint / Run</p>
              </div>
            </div>
          )}

          {/* Touch / Mobile Virtual Touch Controller HUD (When in Mobile Mode or touch screen) */}
          {controlMode === 'mobile' && (
            <>
              {/* Left Side: Virtual D-Pad Movement & Sprint */}
              <div className="absolute bottom-20 left-3 sm:left-6 z-20 flex items-center space-x-2 pointer-events-auto">
                {/* Virtual D-Pad */}
                <div className="grid grid-cols-3 gap-1 bg-neutral-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-neutral-700 shadow-2xl">
                  <div />
                  <button
                    id="touch-forward-btn"
                    onTouchStart={(e) => {
                      e.preventDefault();
                      if (fpControllerRef.current) fpControllerRef.current.moveForward = true;
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      if (fpControllerRef.current) fpControllerRef.current.moveForward = false;
                    }}
                    onMouseDown={() => {
                      if (fpControllerRef.current) fpControllerRef.current.moveForward = true;
                    }}
                    onMouseUp={() => {
                      if (fpControllerRef.current) fpControllerRef.current.moveForward = false;
                    }}
                    className="w-11 h-11 bg-neutral-800 rounded-xl text-amber-400 font-bold flex items-center justify-center active:bg-amber-500 active:text-neutral-950 transition active:scale-95 shadow-md"
                  >
                    <ChevronUp className="w-6 h-6" />
                  </button>
                  <div />
                  <button
                    id="touch-left-btn"
                    onTouchStart={(e) => {
                      e.preventDefault();
                      if (fpControllerRef.current) fpControllerRef.current.moveLeft = true;
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      if (fpControllerRef.current) fpControllerRef.current.moveLeft = false;
                    }}
                    onMouseDown={() => {
                      if (fpControllerRef.current) fpControllerRef.current.moveLeft = true;
                    }}
                    onMouseUp={() => {
                      if (fpControllerRef.current) fpControllerRef.current.moveLeft = false;
                    }}
                    className="w-11 h-11 bg-neutral-800 rounded-xl text-amber-400 font-bold flex items-center justify-center active:bg-amber-500 active:text-neutral-950 transition active:scale-95 shadow-md"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    id="touch-backward-btn"
                    onTouchStart={(e) => {
                      e.preventDefault();
                      if (fpControllerRef.current) fpControllerRef.current.moveBackward = true;
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      if (fpControllerRef.current) fpControllerRef.current.moveBackward = false;
                    }}
                    onMouseDown={() => {
                      if (fpControllerRef.current) fpControllerRef.current.moveBackward = true;
                    }}
                    onMouseUp={() => {
                      if (fpControllerRef.current) fpControllerRef.current.moveBackward = false;
                    }}
                    className="w-11 h-11 bg-neutral-800 rounded-xl text-amber-400 font-bold flex items-center justify-center active:bg-amber-500 active:text-neutral-950 transition active:scale-95 shadow-md"
                  >
                    <ChevronDown className="w-6 h-6" />
                  </button>
                  <button
                    id="touch-right-btn"
                    onTouchStart={(e) => {
                      e.preventDefault();
                      if (fpControllerRef.current) fpControllerRef.current.moveRight = true;
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      if (fpControllerRef.current) fpControllerRef.current.moveRight = false;
                    }}
                    onMouseDown={() => {
                      if (fpControllerRef.current) fpControllerRef.current.moveRight = true;
                    }}
                    onMouseUp={() => {
                      if (fpControllerRef.current) fpControllerRef.current.moveRight = false;
                    }}
                    className="w-11 h-11 bg-neutral-800 rounded-xl text-amber-400 font-bold flex items-center justify-center active:bg-amber-500 active:text-neutral-950 transition active:scale-95 shadow-md"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>

                {/* Mobile Sprint Toggle */}
                <button
                  id="mobile-sprint-toggle"
                  onClick={() => {
                    const nextSprint = !isMobileSprinting;
                    setIsMobileSprinting(nextSprint);
                    if (fpControllerRef.current) {
                      fpControllerRef.current.isRunning = nextSprint;
                    }
                  }}
                  className={`p-3 rounded-2xl border shadow-xl flex flex-col items-center justify-center transition active:scale-95 ${
                    isMobileSprinting
                      ? 'bg-amber-500 text-neutral-950 font-bold border-amber-400 shadow-amber-500/20'
                      : 'bg-neutral-900/90 text-neutral-400 border-neutral-700'
                  }`}
                >
                  <Zap className="w-5 h-5" />
                  <span className="text-[9px] mt-0.5 font-bold">RUN</span>
                </button>
              </div>

              {/* Right Side: Quick Turn & Look Controls */}
              <div className="absolute bottom-20 right-3 sm:right-6 z-20 flex flex-col items-end space-y-1.5 pointer-events-auto">
                {/* 90-degree quick turn buttons */}
                <div className="flex items-center space-x-1.5 bg-neutral-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-neutral-700 shadow-2xl">
                  <button
                    id="quick-turn-left-btn"
                    onClick={() => fpControllerRef.current?.turnByAngle(Math.PI / 4)}
                    title="Turn Left 45°"
                    className="w-10 h-10 bg-neutral-800 rounded-xl text-amber-400 flex items-center justify-center active:bg-amber-500 active:text-neutral-950 transition active:scale-95"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    id="quick-turn-right-btn"
                    onClick={() => fpControllerRef.current?.turnByAngle(-Math.PI / 4)}
                    title="Turn Right 45°"
                    className="w-10 h-10 bg-neutral-800 rounded-xl text-amber-400 flex items-center justify-center active:bg-amber-500 active:text-neutral-950 transition active:scale-95"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>

                {/* Tilt Look Up / Down buttons */}
                <div className="flex items-center space-x-1.5 bg-neutral-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-neutral-700 shadow-2xl">
                  <button
                    id="quick-tilt-up-btn"
                    onClick={() => fpControllerRef.current?.tiltByAngle(0.25)}
                    title="Look Up"
                    className="w-10 h-10 bg-neutral-800 rounded-xl text-amber-400 flex items-center justify-center active:bg-amber-500 active:text-neutral-950 transition active:scale-95"
                  >
                    <ChevronUp className="w-5 h-5" />
                  </button>
                  <button
                    id="quick-tilt-down-btn"
                    onClick={() => fpControllerRef.current?.tiltByAngle(-0.25)}
                    title="Look Down"
                    className="w-10 h-10 bg-neutral-800 rounded-xl text-amber-400 flex items-center justify-center active:bg-amber-500 active:text-neutral-950 transition active:scale-95"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Quick Room Jump Chips Bar in Walkthrough Mode */}
          <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center space-x-1.5 overflow-x-auto max-w-full bg-neutral-900/90 backdrop-blur-md p-1.5 rounded-xl border border-neutral-700/60 shadow-xl pointer-events-auto scrollbar-none">
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-1.5 shrink-0">Teleport:</span>
            {floorsList
              .filter((f) => activeFloorFilter === 'all' || f.id === activeFloorFilter)
              .flatMap((f, fIdx) =>
                f.rooms.map((room) => ({
                  ...room,
                  floorElev: (f.elevation ?? (fIdx * (f.height || 10))) + (fIdx * explodedSpacing),
                  floorName: f.name,
                }))
              )
              .map((room) => (
                <button
                  key={room.id}
                  id={`walkthrough-jump-${room.id}`}
                  onClick={() => teleportToRoom(room, room.floorElev)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 hover:text-white whitespace-nowrap transition active:scale-95 shrink-0"
                >
                  {room.name}
                </button>
              ))}
          </div>
        </>
      )}

      {/* Orbit / Dollhouse Mode Bottom Bar Controls */}
      {viewMode === '3d_orbit' && (
        <div className="absolute bottom-20 md:bottom-4 left-3 right-3 sm:left-4 sm:right-4 flex items-center justify-between pointer-events-none z-10 gap-2">
          {/* Quick Room Teleport Chips */}
          <div className="flex items-center space-x-1.5 overflow-x-auto max-w-2xl bg-neutral-900/90 backdrop-blur-md p-1.5 rounded-xl border border-neutral-700/60 shadow-xl pointer-events-auto scrollbar-none">
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-1.5 hidden sm:inline">Jump:</span>
            {floorsList
              .filter((f) => activeFloorFilter === 'all' || f.id === activeFloorFilter)
              .flatMap((f, fIdx) =>
                f.rooms.map((room) => ({
                  ...room,
                  floorElev: (f.elevation ?? (fIdx * (f.height || 10))) + (fIdx * explodedSpacing),
                  floorName: f.name,
                }))
              )
              .map((room) => (
                <button
                  key={room.id}
                  id={`jump-room-${room.id}`}
                  onClick={() => {
                    onSelectRoom?.(room);
                    if (orbitControlsRef.current) {
                      orbitControlsRef.current.target.set(room.x + room.width / 2, room.floorElev, room.y + room.length / 2);
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 hover:text-white whitespace-nowrap transition active:scale-95"
                >
                  {room.name}
                </button>
              ))}
          </div>

          {/* Reset Orbit Camera */}
          <div className="pointer-events-auto shrink-0 flex items-center space-x-2">
            <button
              id="switch-to-walk-from-orbit-btn"
              onClick={() => onViewModeChange('3d_walkthrough')}
              title="Enter 3D Walkthrough"
              className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-neutral-950 px-3.5 py-2 rounded-xl font-bold text-xs shadow-xl transition active:scale-95"
            >
              <Move className="w-3.5 h-3.5" />
              <span>Enter Walkthrough</span>
            </button>

            <button
              id="reset-orbit-camera-btn"
              onClick={() => {
                if (orbitControlsRef.current && cameraRef.current) {
                  const b = plan.outer_boundary || { width: 30, height: 50 };
                  cameraRef.current.position.set(b.width / 2 - 30, 48, b.height / 2 + 45);
                  orbitControlsRef.current.target.set(b.width / 2, 0, b.height / 2);
                  orbitControlsRef.current.update();
                }
              }}
              title="Reset Camera Angle"
              className="flex items-center space-x-1.5 bg-neutral-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-neutral-700 text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 shadow-xl transition active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
