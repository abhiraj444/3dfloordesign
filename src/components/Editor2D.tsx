import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FloorPlanData, Room, RoomType, Door, WindowOpening, FloorLevel, BalconyData } from '../types';
import {
  Plus,
  Trash2,
  Move,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Compass,
  Square,
  DoorOpen,
  Layers,
  Code,
  Check,
  Copy,
  Download,
  Upload,
  Sparkles,
  Info,
  Sliders,
  ChevronUp,
  ChevronDown,
  X,
  Building2,
  Eye,
  EyeOff,
  CopyPlus,
} from 'lucide-react';

interface Editor2DProps {
  plan: FloorPlanData;
  onChange: (updatedPlan: FloorPlanData) => void;
  selectedRoomId?: string | null;
  onSelectRoom?: (roomId: string | null) => void;
}

const ROOM_TYPE_COLORS: Record<RoomType, { fill: string; stroke: string; badge: string; name: string }> = {
  bedroom: { fill: '#3b82f620', stroke: '#3b82f6', badge: 'bg-blue-500/20 text-blue-300', name: 'Bed Room' },
  living_dining: { fill: '#f59e0b20', stroke: '#f59e0b', badge: 'bg-amber-500/20 text-amber-300', name: 'Living & Dining' },
  kitchen: { fill: '#10b98120', stroke: '#10b981', badge: 'bg-emerald-500/20 text-emerald-300', name: 'Kitchen' },
  toilet: { fill: '#06b6d420', stroke: '#06b6d4', badge: 'bg-cyan-500/20 text-cyan-300', name: 'Toilet / Bath' },
  pooja: { fill: '#ec489920', stroke: '#ec4899', badge: 'bg-pink-500/20 text-pink-300', name: 'Pooja Mandir' },
  balcony: { fill: '#84cc1620', stroke: '#84cc16', badge: 'bg-lime-500/20 text-lime-300', name: 'Balcony' },
  corridor: { fill: '#64748b20', stroke: '#64748b', badge: 'bg-slate-500/20 text-slate-300', name: 'Corridor' },
  staircase: { fill: '#8b5cf620', stroke: '#8b5cf6', badge: 'bg-purple-500/20 text-purple-300', name: 'Staircase' },
  other: { fill: '#71717a20', stroke: '#71717a', badge: 'bg-zinc-500/20 text-zinc-300', name: 'Other' },
};

export const Editor2D: React.FC<Editor2DProps> = ({
  plan,
  onChange,
  selectedRoomId,
  onSelectRoom,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Active Floor Selection
  const [activeFloorId, setActiveFloorId] = useState<string>(() => floorsList[0]?.id || 'floor_ground');
  const [showUnderlayGhost, setShowUnderlayGhost] = useState(true);

  // Keep active floor valid
  useEffect(() => {
    if (!floorsList.some((f) => f.id === activeFloorId)) {
      setActiveFloorId(floorsList[0]?.id || 'floor_ground');
    }
  }, [floorsList, activeFloorId]);

  const activeFloorIndex = floorsList.findIndex((f) => f.id === activeFloorId);
  const activeFloor = floorsList[activeFloorIndex >= 0 ? activeFloorIndex : 0];

  // Lower floor for underlay ghosting
  const lowerFloor = activeFloorIndex > 0 ? floorsList[activeFloorIndex - 1] : null;

  // Active rooms & doors for the current floor
  const currentRooms = activeFloor?.rooms || plan.rooms || [];
  const currentDoors = activeFloor?.doors || plan.doors || [];
  const currentStaircase = activeFloor?.staircase ?? plan.staircase;
  const currentBalconies = activeFloor?.balconies ?? plan.balconies ?? [];

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Dragging / Resizing State
  const [dragMode, setDragMode] = useState<'move_room' | 'resize_room' | 'move_door' | null>(null);
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [initialRoomState, setInitialRoomState] = useState<Room | null>(null);

  // Mobile Bottom Sheet toggle
  const [mobileSheetOpen, setMobileSheetOpen] = useState(true);

  // JSON View & Edit state
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonText, setJsonText] = useState(JSON.stringify(plan, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // New Floor Modal
  const [showAddFloorModal, setShowAddFloorModal] = useState(false);
  const [newFloorName, setNewFloorName] = useState('');
  const [cloneFromFloorId, setCloneFromFloorId] = useState<string>('none');

  // Grid Snapping
  const snapToGrid = (val: number, step = 0.5) => Math.round(val / step) * step;

  // Selected Room Object
  const selectedRoom = useMemo(() => {
    return currentRooms.find((r) => r.id === selectedRoomId) || null;
  }, [currentRooms, selectedRoomId]);

  // Total built-up area computation for active floor
  const totalAreaSqFt = useMemo(() => {
    return currentRooms.reduce((acc, r) => acc + r.width * r.length, 0);
  }, [currentRooms]);

  // Sync floor updates to master plan
  const updateActiveFloor = (updater: (prevFloor: FloorLevel) => FloorLevel) => {
    const nextFloors = floorsList.map((f) => {
      if (f.id === activeFloor.id) {
        return updater(f);
      }
      return f;
    });

    const updatedCurrentFloor = nextFloors.find((f) => f.id === activeFloor.id)!;

    onChange({
      ...plan,
      floors: nextFloors,
      rooms: activeFloorIndex === 0 ? updatedCurrentFloor.rooms : plan.rooms,
      doors: activeFloorIndex === 0 ? updatedCurrentFloor.doors : plan.doors,
      windows: activeFloorIndex === 0 ? updatedCurrentFloor.windows : plan.windows,
      staircase: activeFloorIndex === 0 ? updatedCurrentFloor.staircase : plan.staircase,
      balconies: activeFloorIndex === 0 ? updatedCurrentFloor.balconies : plan.balconies,
    });
  };

  // Convert client SVG coordinates to plan feet coordinates
  const getSvgCoordinates = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const svgP = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    return {
      x: svgP.x,
      y: svgP.y,
    };
  };

  // Pointer Down on Canvas (Pan or Deselect)
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.target === svgRef.current || (e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).tagName === 'rect') {
      const target = e.target as HTMLElement;
      if (target.tagName === 'svg' || target.getAttribute('fill')?.includes('url(#grid')) {
        onSelectRoom?.(null);
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    }
  };

  // Pointer Down on a Room (Select & Start Move)
  const handleRoomPointerDown = (e: React.PointerEvent, room: Room) => {
    e.stopPropagation();
    onSelectRoom?.(room.id);
    setMobileSheetOpen(true);
    const coords = getSvgCoordinates(e.clientX, e.clientY);
    setDragMode('move_room');
    setDragTargetId(room.id);
    setInitialRoomState({ ...room });
    setDragOffset({
      x: coords.x - room.x,
      y: coords.y - room.y,
    });
  };

  // Pointer Down on a Resize Handle
  const handleResizePointerDown = (e: React.PointerEvent, room: Room, handle: string) => {
    e.stopPropagation();
    setDragMode('resize_room');
    setActiveHandle(handle);
    setDragTargetId(room.id);
    setInitialRoomState({ ...room });
  };

  // Pointer Move (Handling Move, Resize, and Canvas Pan)
  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (!dragMode || !dragTargetId || !initialRoomState) return;

    const coords = getSvgCoordinates(e.clientX, e.clientY);

    if (dragMode === 'move_room') {
      const newX = snapToGrid(coords.x - dragOffset.x);
      const newY = snapToGrid(coords.y - dragOffset.y);

      updateActiveFloor((f) => ({
        ...f,
        rooms: f.rooms.map((r) => (r.id === dragTargetId ? { ...r, x: Math.max(0, newX), y: Math.max(0, newY) } : r)),
      }));
    } else if (dragMode === 'resize_room' && activeHandle) {
      let { x, y, width, length } = initialRoomState;
      const curX = snapToGrid(coords.x);
      const curY = snapToGrid(coords.y);

      switch (activeHandle) {
        case 'se':
          width = Math.max(2, curX - x);
          length = Math.max(2, curY - y);
          break;
        case 'sw':
          const rightEdgeX = x + width;
          x = Math.min(rightEdgeX - 2, curX);
          width = rightEdgeX - x;
          length = Math.max(2, curY - y);
          break;
        case 'ne':
          width = Math.max(2, curX - x);
          const bottomEdgeY = y + length;
          y = Math.min(bottomEdgeY - 2, curY);
          length = bottomEdgeY - y;
          break;
        case 'nw':
          const rightE = x + width;
          const bottomE = y + length;
          x = Math.min(rightE - 2, curX);
          width = rightE - x;
          y = Math.min(bottomE - 2, curY);
          length = bottomE - y;
          break;
        case 'e':
          width = Math.max(2, curX - x);
          break;
        case 'w':
          const rX = x + width;
          x = Math.min(rX - 2, curX);
          width = rX - x;
          break;
        case 'n':
          length = Math.max(2, curY - y);
          break;
        case 's':
          const bY = y + length;
          y = Math.min(bY - 2, curY);
          length = bY - y;
          break;
      }

      updateActiveFloor((f) => ({
        ...f,
        rooms: f.rooms.map((r) => (r.id === dragTargetId ? { ...r, x, y, width, length } : r)),
      }));
    }
  };

  const handlePointerUp = () => {
    setIsPanning(false);
    setDragMode(null);
    setActiveHandle(null);
    setDragTargetId(null);
    setInitialRoomState(null);
  };

  // Add Room to Current Floor
  const handleAddRoom = (type: RoomType = 'bedroom') => {
    const newId = `room_${Date.now()}`;
    const defaultNames: Record<RoomType, string> = {
      bedroom: 'Master Bedroom',
      living_dining: 'Living Area',
      kitchen: 'Kitchen',
      toilet: 'Attached Bath',
      pooja: 'Pooja Room',
      balcony: 'Balcony Sitout',
      corridor: 'Corridor',
      staircase: 'Stairs',
      other: 'Utility',
    };

    const newRoom: Room = {
      id: newId,
      name: defaultNames[type] || 'Room',
      type,
      x: 0,
      y: 0,
      width: type === 'toilet' || type === 'pooja' ? 6 : 12,
      length: type === 'toilet' || type === 'pooja' ? 6 : 12,
    };

    updateActiveFloor((f) => ({
      ...f,
      rooms: [...f.rooms, newRoom],
    }));
    onSelectRoom?.(newId);
    setMobileSheetOpen(true);
  };

  // Add Staircase to Current Floor
  const handleAddStaircase = () => {
    const boundary = plan.outer_boundary || { width: 30, height: 50 };
    updateActiveFloor((f) => ({
      ...f,
      staircase: {
        x: Math.max(0, boundary.width - 9),
        y: 2,
        width: 8,
        length: 12,
        direction: 'up',
        connectingFloorId: floorsList[activeFloorIndex + 1]?.id,
      },
    }));
  };

  // Add Balcony to Current Floor
  const handleAddBalcony = () => {
    const newBalcony: BalconyData = {
      x: 2,
      y: 0,
      width: 10,
      length: 4,
      railing_type: 'glass',
    };
    updateActiveFloor((f) => ({
      ...f,
      balconies: [...(f.balconies || []), newBalcony],
    }));
  };

  // Delete Room from Current Floor
  const handleDeleteRoom = (roomId: string) => {
    updateActiveFloor((f) => ({
      ...f,
      rooms: f.rooms.filter((r) => r.id !== roomId),
    }));
    if (selectedRoomId === roomId) {
      onSelectRoom?.(null);
    }
  };

  // Update selected room property
  const handleUpdateRoomProp = (prop: keyof Room, val: any) => {
    if (!selectedRoomId) return;
    updateActiveFloor((f) => ({
      ...f,
      rooms: f.rooms.map((r) => (r.id === selectedRoomId ? { ...r, [prop]: val } : r)),
    }));
  };

  // Add Door
  const handleAddDoor = () => {
    const newDoor: Door = {
      id: `door_${Date.now()}`,
      x: 5,
      y: 5,
      width: 3.0,
      wall: 'south',
    };
    updateActiveFloor((f) => ({
      ...f,
      doors: [...(f.doors || []), newDoor],
    }));
  };

  // Add New Floor Handler
  const handleCreateNewFloor = () => {
    const levelIndex = floorsList.length;
    const newFloorId = `floor_level_${levelIndex}`;
    const defaultName = levelIndex === 1 ? 'First Floor' : levelIndex === 2 ? 'Second Floor' : `Floor ${levelIndex}`;
    const name = newFloorName.trim() || defaultName;

    let clonedRooms: Room[] = [];
    let clonedDoors: Door[] = [];
    let clonedWindows: WindowOpening[] = [];
    let clonedStaircase = activeFloor?.staircase ? { ...activeFloor.staircase } : undefined;
    let clonedBalconies: BalconyData[] = [];

    if (cloneFromFloorId !== 'none') {
      const sourceFloor = floorsList.find((f) => f.id === cloneFromFloorId);
      if (sourceFloor) {
        clonedRooms = sourceFloor.rooms.map((r, i) => ({
          ...r,
          id: `room_${newFloorId}_${i}_${Date.now()}`,
        }));
        clonedDoors = (sourceFloor.doors || []).map((d, i) => ({
          ...d,
          id: `door_${newFloorId}_${i}_${Date.now()}`,
        }));
        clonedWindows = (sourceFloor.windows || []).map((w, i) => ({
          ...w,
          id: `win_${newFloorId}_${i}_${Date.now()}`,
        }));
        clonedStaircase = sourceFloor.staircase ? { ...sourceFloor.staircase } : undefined;
        clonedBalconies = (sourceFloor.balconies || []).map((b) => ({ ...b }));
      }
    }

    const newFloor: FloorLevel = {
      id: newFloorId,
      name,
      levelIndex,
      elevation: levelIndex * 10,
      height: 10,
      rooms: clonedRooms,
      doors: clonedDoors,
      windows: clonedWindows,
      staircase: clonedStaircase,
      balconies: clonedBalconies,
    };

    const updatedFloors = [...floorsList, newFloor];
    onChange({
      ...plan,
      floors: updatedFloors,
    });
    setActiveFloorId(newFloorId);
    setShowAddFloorModal(false);
    setNewFloorName('');
    setCloneFromFloorId('none');
  };

  // Delete Current Floor Handler
  const handleDeleteCurrentFloor = (floorId: string) => {
    if (floorsList.length <= 1) return;
    const updatedFloors = floorsList
      .filter((f) => f.id !== floorId)
      .map((f, idx) => ({
        ...f,
        levelIndex: idx,
        elevation: idx * (f.height || 10),
      }));

    onChange({
      ...plan,
      floors: updatedFloors,
      rooms: updatedFloors[0].rooms,
      doors: updatedFloors[0].doors,
      windows: updatedFloors[0].windows,
      staircase: updatedFloors[0].staircase,
      balconies: updatedFloors[0].balconies,
    });
    setActiveFloorId(updatedFloors[0].id);
  };

  // Boundary parameters
  const boundary = plan.outer_boundary || { width: 30, height: 50 };
  const pad = 6;
  const viewBoxW = boundary.width + pad * 2;
  const viewBoxH = boundary.height + pad * 2;

  // JSON sync
  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      onChange(parsed);
      setJsonError(null);
      setShowJsonModal(false);
    } catch (err: any) {
      setJsonError(`Invalid JSON format: ${err.message}`);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-neutral-950 text-neutral-100 select-none overflow-hidden pb-16 md:pb-0">
      {/* --- MULTI-FLOOR NAVIGATION RIBBON --- */}
      <div className="bg-neutral-900 border-b border-neutral-800 px-3 py-1.5 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none z-20">
        <div className="flex items-center space-x-1 shrink-0">
          <div className="flex items-center space-x-1.5 mr-2 text-xs font-bold text-amber-400">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Floors:</span>
          </div>

          {/* Floor Tab Buttons */}
          {floorsList.map((floor, idx) => {
            const isActive = floor.id === activeFloor.id;
            return (
              <button
                key={floor.id}
                id={`floor-tab-${floor.id}`}
                onClick={() => {
                  setActiveFloorId(floor.id);
                  onSelectRoom?.(null);
                }}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow-md'
                    : 'bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700'
                }`}
              >
                <span>{idx === 0 ? 'Ground' : idx === 1 ? '1st Floor' : idx === 2 ? '2nd Floor' : `${idx}F`}: {floor.name}</span>
                <span className="text-[10px] opacity-75 font-mono">({floor.rooms.length} rms)</span>
              </button>
            );
          })}

          {/* Add Floor Button */}
          <button
            id="add-new-floor-btn"
            onClick={() => {
              setNewFloorName(`Floor ${floorsList.length}`);
              setCloneFromFloorId(activeFloor.id);
              setShowAddFloorModal(true);
            }}
            className="flex items-center space-x-1 px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500 hover:text-neutral-950 rounded-lg text-xs font-bold transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Stack Floor</span>
          </button>
        </div>

        {/* Floor Tools: Ghost Underlay & Delete Floor */}
        <div className="flex items-center space-x-2 shrink-0">
          {activeFloorIndex > 0 && (
            <button
              id="toggle-ghost-underlay-btn"
              onClick={() => setShowUnderlayGhost(!showUnderlayGhost)}
              title="Show lower floor ghost outline to easily align walls and stairs"
              className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-mono transition ${
                showUnderlayGhost
                  ? 'bg-neutral-800 text-amber-300 border border-amber-500/40'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              {showUnderlayGhost ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">Lower Ghost</span>
            </button>
          )}

          {floorsList.length > 1 && (
            <button
              id="delete-current-floor-btn"
              onClick={() => handleDeleteCurrentFloor(activeFloor.id)}
              title="Delete Active Floor Level"
              className="p-1 rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300 text-xs transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Top Action Toolbar (Responsive for Mobile & Desktop) */}
      <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 z-10 overflow-x-auto scrollbar-none">
        <div className="flex items-center space-x-1.5 shrink-0">
          {/* Add Room Quick Bar */}
          <div className="flex items-center space-x-1 bg-neutral-800 p-1 rounded-xl">
            <button
              id="add-bedroom-btn"
              onClick={() => handleAddRoom('bedroom')}
              className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg text-xs shadow transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Room</span>
            </button>
            <button
              id="add-bath-btn"
              onClick={() => handleAddRoom('toilet')}
              className="px-2 py-1.5 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg text-xs transition"
            >
              + Bath
            </button>
            <button
              id="add-kitchen-btn"
              onClick={() => handleAddRoom('kitchen')}
              className="px-2 py-1.5 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg text-xs transition"
            >
              + Kitchen
            </button>
            <button
              id="add-pooja-btn"
              onClick={() => handleAddRoom('pooja')}
              className="hidden sm:inline-block px-2 py-1.5 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg text-xs transition"
            >
              + Pooja
            </button>
            <button
              id="add-staircase-btn"
              onClick={handleAddStaircase}
              className="flex items-center space-x-1 px-2 py-1.5 hover:bg-purple-900/40 text-purple-300 hover:text-purple-200 rounded-lg text-xs transition"
              title="Add Staircase to connect floors"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>+ Stairs</span>
            </button>
            <button
              id="add-balcony-btn"
              onClick={handleAddBalcony}
              className="hidden md:inline-block px-2 py-1.5 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg text-xs transition"
            >
              + Balcony
            </button>
            <button
              id="add-door-btn"
              onClick={handleAddDoor}
              className="flex items-center space-x-1 px-2 py-1.5 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg text-xs transition"
            >
              <DoorOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">+ Door</span>
            </button>
          </div>
        </div>

        {/* Middle Stats Badge (Desktop) */}
        <div className="hidden lg:flex items-center space-x-4 bg-neutral-950/80 px-4 py-1.5 rounded-xl border border-neutral-800 text-xs font-mono">
          <div>
            <span className="text-neutral-400">Boundary:</span>{' '}
            <span className="text-amber-400 font-semibold">{boundary.width}′ × {boundary.height}′</span>
          </div>
          <div className="w-px h-3.5 bg-neutral-700" />
          <div>
            <span className="text-neutral-400">{activeFloor.name} Area:</span>{' '}
            <span className="text-emerald-400 font-semibold">{Math.round(totalAreaSqFt)} sq.ft</span>
          </div>
          <div className="w-px h-3.5 bg-neutral-700" />
          <div>
            <span className="text-neutral-400">Rooms:</span>{' '}
            <span className="text-neutral-200 font-semibold">{currentRooms.length}</span>
          </div>
        </div>

        {/* Right Tools: Zoom, Reset, JSON */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            id="editor-zoom-in-btn"
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
            className="p-1.5 sm:p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            id="editor-zoom-out-btn"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
            className="p-1.5 sm:p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            id="editor-reset-btn"
            onClick={() => {
              setZoom(1.0);
              setPan({ x: 0, y: 0 });
            }}
            className="p-1.5 sm:p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition"
            title="Reset Canvas"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            id="editor-json-btn"
            onClick={() => {
              setJsonText(JSON.stringify(plan, null, 2));
              setShowJsonModal(true);
            }}
            className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-mono transition"
            title="View/Edit Schema JSON"
          >
            <Code className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">JSON</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas & Sidebar Layout */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* SVG Canvas Area */}
        <div
          ref={containerRef}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="flex-1 relative cursor-crosshair overflow-hidden bg-neutral-950 flex items-center justify-center touch-none"
        >
          {/* North Direction Compass Badge */}
          <div className="absolute top-3 left-3 bg-neutral-900/90 backdrop-blur-md p-2 rounded-xl border border-neutral-800 flex flex-col items-center justify-center shadow-xl pointer-events-none z-10">
            <div className="relative w-6 h-6 flex items-center justify-center">
              <div className="w-1 h-5 bg-gradient-to-t from-neutral-600 to-red-500 rounded-full" />
              <span className="absolute -top-1 text-[9px] font-bold text-red-400">N</span>
              <span className="absolute -bottom-1 text-[8px] font-bold text-neutral-400">S</span>
            </div>
            <span className="text-[8px] text-neutral-400 font-mono mt-0.5">0° N</span>
          </div>

          <svg
            ref={svgRef}
            viewBox={`-${pad} -${pad} ${viewBoxW} ${viewBoxH}`}
            className="w-full h-full max-h-[85vh] max-w-[95vw] sm:max-w-[85vw] transition-transform duration-75 origin-center"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) scaleY(-1)`, // North up coordinate system
            }}
          >
            <defs>
              {/* Fine Grid Pattern (1 ft) */}
              <pattern id="grid-1ft" width="1" height="1" patternUnits="userSpaceOnUse">
                <path d="M 1 0 L 0 0 0 1" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.05" />
              </pattern>
              {/* Major Grid Pattern (5 ft) */}
              <pattern id="grid-5ft" width="5" height="5" patternUnits="userSpaceOnUse">
                <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.1" />
              </pattern>
            </defs>

            {/* Grid background */}
            <rect x={-pad} y={-pad} width={viewBoxW} height={viewBoxH} fill="url(#grid-1ft)" />
            <rect x={-pad} y={-pad} width={viewBoxW} height={viewBoxH} fill="url(#grid-5ft)" />

            {/* Lower Floor Ghost Underlay (to align walls and staircases!) */}
            {showUnderlayGhost && lowerFloor && (
              <g id="lower-floor-ghost-underlay" opacity="0.35">
                {lowerFloor.rooms.map((lr) => (
                  <rect
                    key={`ghost_${lr.id}`}
                    x={lr.x}
                    y={lr.y}
                    width={lr.width}
                    height={lr.length}
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="0.25"
                    strokeDasharray="0.8 0.8"
                  />
                ))}
                {lowerFloor.staircase && (
                  <rect
                    x={lowerFloor.staircase.x}
                    y={lowerFloor.staircase.y}
                    width={lowerFloor.staircase.width}
                    height={lowerFloor.staircase.length}
                    fill="rgba(168, 85, 247, 0.15)"
                    stroke="#c084fc"
                    strokeWidth="0.3"
                    strokeDasharray="0.5 0.5"
                  />
                )}
              </g>
            )}

            {/* Outer Building Boundary */}
            <rect
              x={0}
              y={0}
              width={boundary.width}
              height={boundary.height}
              fill="none"
              stroke="#64748b"
              strokeWidth="0.4"
              strokeDasharray="1.0 1.0"
            />
            {/* Outer Dimension Callouts */}
            <g style={{ transform: 'scaleY(-1)' }}>
              <text x={boundary.width / 2} y={3.5} fill="#94a3b8" fontSize="1.4" textAnchor="middle" fontFamily="JetBrains Mono">
                {boundary.width}′-0″ (Width)
              </text>
            </g>

            {/* Balconies */}
            {currentBalconies.map((b, idx) => (
              <g key={`bal_${idx}`}>
                <rect
                  x={b.x}
                  y={b.y}
                  width={b.width}
                  height={b.length}
                  fill="rgba(180, 83, 9, 0.25)"
                  stroke="#b45309"
                  strokeWidth="0.3"
                  rx="0.2"
                />
                <g style={{ transform: 'scaleY(-1)' }}>
                  <text
                    x={b.x + b.width / 2}
                    y={-(b.y + b.length / 2)}
                    fill="#d97706"
                    fontSize="1.1"
                    textAnchor="middle"
                    fontFamily="Plus Jakarta Sans"
                    fontWeight="bold"
                  >
                    Balcony
                  </text>
                </g>
              </g>
            ))}

            {/* Staircase */}
            {currentStaircase && (
              <g>
                <rect
                  x={currentStaircase.x}
                  y={currentStaircase.y}
                  width={currentStaircase.width}
                  height={currentStaircase.length}
                  fill="rgba(139, 92, 246, 0.2)"
                  stroke="#8b5cf6"
                  strokeWidth="0.3"
                />
                {Array.from({ length: 8 }).map((_, i) => {
                  const stepY = currentStaircase!.y + (currentStaircase!.length / 8) * i;
                  return (
                    <line
                      key={i}
                      x1={currentStaircase!.x}
                      y1={stepY}
                      x2={currentStaircase!.x + currentStaircase!.width}
                      y2={stepY}
                      stroke="#8b5cf6"
                      strokeWidth="0.15"
                    />
                  );
                })}
                <g style={{ transform: 'scaleY(-1)' }}>
                  <text
                    x={currentStaircase.x + currentStaircase.width / 2}
                    y={-(currentStaircase.y + currentStaircase.length / 2)}
                    fill="#a78bfa"
                    fontSize="1.1"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    Stairs ({currentStaircase.direction === 'down' ? 'DN' : 'UP'})
                  </text>
                </g>
              </g>
            )}

            {/* Interactive Room Rectangles */}
            {currentRooms.map((room) => {
              const isSelected = selectedRoomId === room.id;
              const typeColor = ROOM_TYPE_COLORS[room.type] || ROOM_TYPE_COLORS.other;

              return (
                <g
                  key={room.id}
                  id={`room-svg-${room.id}`}
                  onPointerDown={(e) => handleRoomPointerDown(e, room)}
                  className="cursor-move group"
                >
                  {/* Room Box */}
                  <rect
                    x={room.x}
                    y={room.y}
                    width={room.width}
                    height={room.length}
                    fill={isSelected ? `${typeColor.stroke}40` : typeColor.fill}
                    stroke={isSelected ? '#fbbf24' : typeColor.stroke}
                    strokeWidth={isSelected ? '0.6' : '0.35'}
                    rx="0.2"
                    className="transition-colors duration-150"
                  />

                  {/* Room Labels */}
                  <g style={{ transform: 'scaleY(-1)' }}>
                    <text
                      x={room.x + room.width / 2}
                      y={-(room.y + room.length / 2 + 0.6)}
                      fill="#ffffff"
                      fontSize={Math.min(1.5, Math.max(0.8, room.width * 0.14))}
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="Plus Jakarta Sans"
                      className="pointer-events-none drop-shadow-sm"
                    >
                      {room.name}
                    </text>
                    <text
                      x={room.x + room.width / 2}
                      y={-(room.y + room.length / 2 - 0.8)}
                      fill="#fbbf24"
                      fontSize={Math.min(1.1, Math.max(0.7, room.width * 0.1))}
                      fontFamily="JetBrains Mono"
                      textAnchor="middle"
                      className="pointer-events-none font-medium"
                    >
                      {room.width}′-0″ × {room.length}′-0″
                    </text>
                  </g>

                  {/* Resize Handles if Selected */}
                  {isSelected && (
                    <>
                      {/* Corner Handles */}
                      <circle
                        cx={room.x + room.width}
                        cy={room.y + room.length}
                        r="0.7"
                        fill="#fbbf24"
                        stroke="#000000"
                        strokeWidth="0.15"
                        className="cursor-nwse-resize"
                        onPointerDown={(e) => handleResizePointerDown(e, room, 'se')}
                      />
                      <circle
                        cx={room.x}
                        cy={room.y + room.length}
                        r="0.7"
                        fill="#fbbf24"
                        stroke="#000000"
                        strokeWidth="0.15"
                        className="cursor-nesw-resize"
                        onPointerDown={(e) => handleResizePointerDown(e, room, 'sw')}
                      />
                      <circle
                        cx={room.x + room.width}
                        cy={room.y}
                        r="0.7"
                        fill="#fbbf24"
                        stroke="#000000"
                        strokeWidth="0.15"
                        className="cursor-nesw-resize"
                        onPointerDown={(e) => handleResizePointerDown(e, room, 'ne')}
                      />
                      <circle
                        cx={room.x}
                        cy={room.y}
                        r="0.7"
                        fill="#fbbf24"
                        stroke="#000000"
                        strokeWidth="0.15"
                        className="cursor-nwse-resize"
                        onPointerDown={(e) => handleResizePointerDown(e, room, 'nw')}
                      />
                      {/* Edge Handles */}
                      <rect
                        x={room.x + room.width - 0.3}
                        y={room.y + room.length / 2 - 0.6}
                        width="0.6"
                        height="1.2"
                        fill="#fbbf24"
                        rx="0.2"
                        className="cursor-ew-resize"
                        onPointerDown={(e) => handleResizePointerDown(e, room, 'e')}
                      />
                      <rect
                        x={room.x + room.width / 2 - 0.6}
                        y={room.y + room.length - 0.3}
                        width="1.2"
                        height="0.6"
                        fill="#fbbf24"
                        rx="0.2"
                        className="cursor-ns-resize"
                        onPointerDown={(e) => handleResizePointerDown(e, room, 'n')}
                      />
                    </>
                  )}
                </g>
              );
            })}

            {/* Doors with Swing Arc Symbols */}
            {currentDoors.map((door) => {
              const doorWidth = door.width || 3.0;
              return (
                <g key={door.id} className="cursor-pointer">
                  <line
                    x1={door.x - doorWidth / 2}
                    y1={door.y}
                    x2={door.x + doorWidth / 2}
                    y2={door.y}
                    stroke="#10b981"
                    strokeWidth="0.4"
                  />
                  <path
                    d={`M ${door.x - doorWidth / 2} ${door.y} A ${doorWidth} ${doorWidth} 0 0 1 ${door.x - doorWidth / 2 + doorWidth} ${door.y + doorWidth}`}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="0.25"
                    strokeDasharray="0.4 0.4"
                  />
                  <line
                    x1={door.x - doorWidth / 2}
                    y1={door.y}
                    x2={door.x - doorWidth / 2}
                    y2={door.y + doorWidth}
                    stroke="#10b981"
                    strokeWidth="0.3"
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Desktop Sidebar: Room Inspector */}
        <div className="hidden md:flex w-80 border-l border-neutral-800 bg-neutral-900/95 backdrop-blur-md p-5 flex-col space-y-5 overflow-y-auto z-10 shadow-2xl">
          {selectedRoom ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Square className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-sm text-white">Room Properties</h3>
                </div>
                <button
                  onClick={() => handleDeleteRoom(selectedRoom.id)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300 transition"
                  title="Delete Room"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Room Name */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">Room Label</label>
                <input
                  type="text"
                  value={selectedRoom.name}
                  onChange={(e) => handleUpdateRoomProp('name', e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              {/* Room Type */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">Room Function / Type</label>
                <select
                  value={selectedRoom.type}
                  onChange={(e) => handleUpdateRoomProp('type', e.target.value as RoomType)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-medium capitalize"
                >
                  <option value="bedroom">Bed Room (Furnished Bed + Closet)</option>
                  <option value="living_dining">Drawing & Dining (Sofa + Dining)</option>
                  <option value="kitchen">Modular Kitchen (Stove + Sink + Fridge)</option>
                  <option value="toilet">Toilet / Bath (WC + Vanity + Shower)</option>
                  <option value="pooja">Pooja Room (Mandir + Brass Shrine)</option>
                  <option value="balcony">Balcony / Sit-out (Deck + Plants)</option>
                  <option value="corridor">Corridor / Foyer</option>
                  <option value="staircase">Staircase (Steps)</option>
                  <option value="other">Other / Store</option>
                </select>
              </div>

              {/* Dimensions */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Width (East-West)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="2"
                      value={selectedRoom.width}
                      onChange={(e) => handleUpdateRoomProp('width', Math.max(2, parseFloat(e.target.value) || 2))}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-neutral-500 font-mono">ft</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Length (North-South)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="2"
                      value={selectedRoom.length}
                      onChange={(e) => handleUpdateRoomProp('length', Math.max(2, parseFloat(e.target.value) || 2))}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-neutral-500 font-mono">ft</span>
                  </div>
                </div>
              </div>

              {/* Position Coordinates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Origin X</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      value={selectedRoom.x}
                      onChange={(e) => handleUpdateRoomProp('x', parseFloat(e.target.value) || 0)}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-neutral-500 font-mono">ft</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Origin Y</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      value={selectedRoom.y}
                      onChange={(e) => handleUpdateRoomProp('y', parseFloat(e.target.value) || 0)}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-neutral-500 font-mono">ft</span>
                  </div>
                </div>
              </div>

              {/* Carpet Area */}
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-xs flex justify-between items-center">
                <span className="text-neutral-400">Carpet Area:</span>
                <span className="font-mono font-bold text-amber-400">
                  {Math.round(selectedRoom.width * selectedRoom.length)} sq.ft (
                  {(selectedRoom.width * selectedRoom.length * 0.0929).toFixed(1)} m²)
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-8 text-neutral-400 space-y-3">
              <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-amber-400">
                <Move className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-neutral-200">Select a Room</h4>
                <p className="text-xs text-neutral-400 mt-1 max-w-[200px]">
                  Click and drag any room rectangle on {activeFloor.name} to reposition or resize it.
                </p>
              </div>
            </div>
          )}

          {/* Building Global Settings */}
          <div className="border-t border-neutral-800 pt-4 space-y-3">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-sm text-white">Global Dimensions</h3>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Outer Width</label>
                <input
                  type="number"
                  value={boundary.width}
                  onChange={(e) =>
                    onChange({
                      ...plan,
                      outer_boundary: { ...boundary, width: Math.max(10, parseFloat(e.target.value) || 24) },
                    })
                  }
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Outer Length</label>
                <input
                  type="number"
                  value={boundary.height}
                  onChange={(e) =>
                    onChange({
                      ...plan,
                      outer_boundary: { ...boundary, height: Math.max(10, parseFloat(e.target.value) || 48) },
                    })
                  }
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Slide-Up Bottom Drawer Sheet for Selected Room */}
        {selectedRoom && (
          <div
            id="mobile-room-sheet"
            className="md:hidden absolute bottom-0 left-0 right-0 bg-neutral-900/95 border-t border-neutral-800 backdrop-blur-xl p-4 z-30 shadow-2xl rounded-t-3xl transition-transform animate-in slide-in-from-bottom-5 duration-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <h3 className="font-bold text-sm text-white truncate max-w-[180px]">{selectedRoom.name}</h3>
                <span className="text-xs text-neutral-400 font-mono">
                  {selectedRoom.width}′ × {selectedRoom.length}′
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDeleteRoom(selectedRoom.id)}
                  className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg text-xs"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onSelectRoom?.(null)}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-lg text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Properties Input for Mobile */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div>
                <label className="block text-[10px] text-neutral-400 font-medium mb-0.5">Label</label>
                <input
                  type="text"
                  value={selectedRoom.name}
                  onChange={(e) => handleUpdateRoomProp('name', e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-white font-medium"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-400 font-medium mb-0.5">Type</label>
                <select
                  value={selectedRoom.type}
                  onChange={(e) => handleUpdateRoomProp('type', e.target.value as RoomType)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-white capitalize"
                >
                  <option value="bedroom">Bed Room</option>
                  <option value="living_dining">Living & Dining</option>
                  <option value="kitchen">Kitchen</option>
                  <option value="toilet">Toilet / Bath</option>
                  <option value="pooja">Pooja Mandir</option>
                  <option value="balcony">Balcony</option>
                  <option value="corridor">Corridor</option>
                  <option value="staircase">Staircase</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-neutral-400 font-medium mb-0.5">Width (ft)</label>
                <input
                  type="number"
                  step="0.5"
                  value={selectedRoom.width}
                  onChange={(e) => handleUpdateRoomProp('width', Math.max(2, parseFloat(e.target.value) || 2))}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-400 font-medium mb-0.5">Length (ft)</label>
                <input
                  type="number"
                  step="0.5"
                  value={selectedRoom.length}
                  onChange={(e) => handleUpdateRoomProp('length', Math.max(2, parseFloat(e.target.value) || 2))}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- ADD NEW FLOOR MODAL --- */}
      {showAddFloorModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Stack New Floor Level</h3>
              </div>
              <button
                onClick={() => setShowAddFloorModal(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Floor Name</label>
                <input
                  type="text"
                  value={newFloorName}
                  onChange={(e) => setNewFloorName(e.target.value)}
                  placeholder="e.g. First Floor, Penthouse, Terrace..."
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Initial Blueprint Layout</label>
                <select
                  value={cloneFromFloorId}
                  onChange={(e) => setCloneFromFloorId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="none">✨ Start with Empty Floor</option>
                  {floorsList.map((f) => (
                    <option key={f.id} value={f.id}>
                      📋 Clone Layout from {f.name} ({f.rooms.length} rooms)
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Cloning layout from the floor below lets you keep structural columns & staircases aligned.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-neutral-800">
              <button
                onClick={() => setShowAddFloorModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewFloor}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-bold rounded-xl text-xs shadow-lg transition active:scale-95"
              >
                Create & Stack Floor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JSON Schema Code Editor Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-neutral-800">
              <div className="flex items-center space-x-2">
                <Code className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm sm:text-base text-white">Canonical Floor Plan JSON</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(jsonText);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 hover:text-white transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => setShowJsonModal(false)}
                  className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 flex-1 overflow-hidden flex flex-col">
              {jsonError && (
                <div className="mb-3 p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-300 font-mono">
                  {jsonError}
                </div>
              )}
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                className="flex-1 w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 sm:p-4 font-mono text-xs text-amber-200/90 focus:outline-none focus:border-amber-500 resize-none"
                rows={16}
                spellCheck={false}
              />
            </div>

            <div className="flex items-center justify-end space-x-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-neutral-800 bg-neutral-900/50">
              <button
                onClick={() => setShowJsonModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyJson}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs shadow-lg transition"
              >
                Apply Changes to Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
