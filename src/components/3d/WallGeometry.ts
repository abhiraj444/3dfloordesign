import * as THREE from 'three';
import { FloorPlanData, Room, Door, WindowOpening } from '../../types';
import { Materials } from './FurnitureRegistry';

export interface WallSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  height: number;
  thickness: number;
  isExterior?: boolean;
}

export interface WallMeshResult {
  group: THREE.Group;
  collisionBoxes: THREE.Box3[];
  floorsGroup: THREE.Group;
  ceilingsGroup: THREE.Group;
}

export interface BuildFloorOptions {
  wallHeight?: number;
  showCeilings?: boolean;
  wallColor?: string;
  elevationOffset?: number;
  skipCeilingAboveStairs?: boolean;
}

export interface BuildMultiFloorOptions {
  wallHeight?: number;
  showCeilings?: boolean;
  wallColor?: string;
  activeFloorOnly?: boolean;
  activeFloorId?: string;
  explodedSpacing?: number; // extra vertical spacing in ft between floors for exploded view
}

// Floor Material Generators
export function createFloorMaterial(type: string, customColor?: string): THREE.Material {
  if (customColor) {
    return new THREE.MeshStandardMaterial({ color: customColor, roughness: 0.5, metalness: 0.1 });
  }

  switch (type) {
    case 'bedroom':
      // Warm oak wood plank flooring
      return new THREE.MeshStandardMaterial({
        color: 0xc89666,
        roughness: 0.45,
        metalness: 0.05,
      });
    case 'living_dining':
      // Polished Italian marble / off-white vitrified tile
      return new THREE.MeshStandardMaterial({
        color: 0xf2ede4,
        roughness: 0.2,
        metalness: 0.1,
      });
    case 'kitchen':
      // Matte ceramic grey / slate tile
      return new THREE.MeshStandardMaterial({
        color: 0x9ca3af,
        roughness: 0.35,
        metalness: 0.05,
      });
    case 'toilet':
      // Anti-skid ceramic tile
      return new THREE.MeshStandardMaterial({
        color: 0x718096,
        roughness: 0.4,
        metalness: 0.05,
      });
    case 'pooja':
      // White Makrana marble / sacred stone
      return new THREE.MeshStandardMaterial({
        color: 0xfaf5eb,
        roughness: 0.25,
        metalness: 0.15,
      });
    case 'balcony':
      // Terracotta / outdoor stone deck
      return new THREE.MeshStandardMaterial({
        color: 0xb45309,
        roughness: 0.7,
        metalness: 0.05,
      });
    default:
      return new THREE.MeshStandardMaterial({
        color: 0xe5e7eb,
        roughness: 0.5,
        metalness: 0.05,
      });
  }
}

/**
 * Builds the complete 3D Architectural Shell for a single floor:
 * - Room floors with distinct finishes
 * - Walls with door cutouts
 * - Doors & Windows
 * - Optional Ceilings
 * - Collision Bounding Boxes for First-Person Walkthrough
 */
export function buildArchitecturalModel(
  plan: FloorPlanData,
  options: BuildFloorOptions = {}
): WallMeshResult {
  const group = new THREE.Group();
  const floorsGroup = new THREE.Group();
  const ceilingsGroup = new THREE.Group();
  const collisionBoxes: THREE.Box3[] = [];

  const elevationOffset = options.elevationOffset || 0;
  const wallHeight = options.wallHeight ?? plan.wall_height_ft ?? 10;
  const wallThickness = plan.wall_thickness_ft ?? 0.6;
  const wallMat = new THREE.MeshStandardMaterial({
    color: options.wallColor || 0xedebe8,
    roughness: 0.8,
    metalness: 0.02,
  });

  const ceilingMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.0,
    side: THREE.BackSide,
  });

  // 1. Build Room Floors and Ceilings
  plan.rooms.forEach((room) => {
    const floorGeo = new THREE.BoxGeometry(room.width, 0.2, room.length);
    const floorMat = createFloorMaterial(room.type, room.customColor);
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(room.x + room.width / 2, elevationOffset - 0.1, room.y + room.length / 2);
    floorMesh.receiveShadow = true;
    floorsGroup.add(floorMesh);

    // Ceiling slab
    // Check if this room has a staircase above it that needs an opening
    const isStairRoom = room.type === 'staircase' || (plan.staircase && 
      plan.staircase.x >= room.x && plan.staircase.x + plan.staircase.width <= room.x + room.width &&
      plan.staircase.y >= room.y && plan.staircase.y + plan.staircase.length <= room.y + room.length
    );

    if (!isStairRoom || !options.skipCeilingAboveStairs) {
      const ceilingGeo = new THREE.BoxGeometry(room.width, 0.2, room.length);
      const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
      ceilingMesh.position.set(room.x + room.width / 2, elevationOffset + wallHeight + 0.1, room.y + room.length / 2);
      ceilingsGroup.add(ceilingMesh);
    }
  });

  // Balconies floors
  if (plan.balconies) {
    plan.balconies.forEach((balcony) => {
      const bFloorGeo = new THREE.BoxGeometry(balcony.width, 0.2, balcony.length);
      const bFloorMat = createFloorMaterial('balcony');
      const bFloorMesh = new THREE.Mesh(bFloorGeo, bFloorMat);
      bFloorMesh.position.set(balcony.x + balcony.width / 2, elevationOffset - 0.1, balcony.y + balcony.length / 2);
      bFloorMesh.receiveShadow = true;
      floorsGroup.add(bFloorMesh);
    });
  }

  // 2. Identify Wall Segments from all rooms and outer boundary
  interface RawWall {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    orientation: 'horizontal' | 'vertical';
  }

  const rawWalls: RawWall[] = [];

  // Helper to add wall
  const addWall = (x1: number, y1: number, x2: number, y2: number) => {
    if (x1 === x2) {
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);
      rawWalls.push({ x1, y1: minY, x2, y2: maxY, orientation: 'vertical' });
    } else if (y1 === y2) {
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      rawWalls.push({ x1: minX, y1, x2: maxX, y2, orientation: 'horizontal' });
    }
  };

  // Extract walls from all rooms
  plan.rooms.forEach((room) => {
    addWall(room.x, room.y, room.x + room.width, room.y); // South
    addWall(room.x + room.width, room.y, room.x + room.width, room.y + room.length); // East
    addWall(room.x + room.width, room.y + room.length, room.x, room.y + room.length); // North
    addWall(room.x, room.y + room.length, room.x, room.y); // West
  });

  const doors = plan.doors || [];
  const windows = plan.windows || [];

  // Helper: check if a point is close to a door
  const getDoorOnSegment = (x1: number, y1: number, x2: number, y2: number, isHoriz: boolean) => {
    for (const d of doors) {
      if (isHoriz) {
        if (Math.abs(d.y - y1) < 1.0 && d.x >= Math.min(x1, x2) - 0.5 && d.x <= Math.max(x1, x2) + 0.5) {
          return d;
        }
      } else {
        if (Math.abs(d.x - x1) < 1.0 && d.y >= Math.min(y1, y2) - 0.5 && d.y <= Math.max(y1, y2) + 0.5) {
          return d;
        }
      }
    }
    return null;
  };

  // Helper: check if window is on segment
  const getWindowOnSegment = (x1: number, y1: number, x2: number, y2: number, isHoriz: boolean) => {
    for (const w of windows) {
      if (isHoriz) {
        if (Math.abs(w.y - y1) < 1.0 && w.x >= Math.min(x1, x2) - 0.5 && w.x <= Math.max(x1, x2) + 0.5) {
          return w;
        }
      } else {
        if (Math.abs(w.x - x1) < 1.0 && w.y >= Math.min(y1, y2) - 0.5 && w.y <= Math.max(y1, y2) + 0.5) {
          return w;
        }
      }
    }
    return null;
  };

  // Helper to create a single solid wall mesh
  const createWallBox = (cx: number, cy: number, cz: number, w: number, h: number, d: number) => {
    if (w <= 0.05 || d <= 0.05) return;
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, wallMat);
    mesh.position.set(cx, elevationOffset + cy, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    // Add to collision
    const box = new THREE.Box3();
    box.setFromCenterAndSize(new THREE.Vector3(cx, elevationOffset + cy, cz), new THREE.Vector3(w, h, d));
    collisionBoxes.push(box);
  };

  // Process raw walls
  const uniqueSegments: { x1: number; y1: number; x2: number; y2: number; isHoriz: boolean }[] = [];

  rawWalls.forEach((w) => {
    const isHoriz = w.orientation === 'horizontal';
    const exists = uniqueSegments.some((u) => {
      if (u.isHoriz !== isHoriz) return false;
      if (isHoriz) {
        return Math.abs(u.y1 - w.y1) < 0.2 && Math.abs(u.x1 - w.x1) < 0.5 && Math.abs(u.x2 - w.x2) < 0.5;
      } else {
        return Math.abs(u.x1 - w.x1) < 0.2 && Math.abs(u.y1 - w.y1) < 0.5 && Math.abs(u.y2 - w.y2) < 0.5;
      }
    });
    if (!exists) {
      uniqueSegments.push({ x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2, isHoriz });
    }
  });

  // Render each wall segment with door & window cutouts
  uniqueSegments.forEach((seg) => {
    const door = getDoorOnSegment(seg.x1, seg.y1, seg.x2, seg.y2, seg.isHoriz);
    const win = getWindowOnSegment(seg.x1, seg.y1, seg.x2, seg.y2, seg.isHoriz);

    if (seg.isHoriz) {
      const len = Math.abs(seg.x2 - seg.x1);
      const y = seg.y1;

      if (door && len > (door.width || 3.0)) {
        const doorWidth = door.width || 3.0;
        const doorHeight = 7.0; // standard door opening height
        const doorCenterX = Math.max(seg.x1 + doorWidth / 2, Math.min(seg.x2 - doorWidth / 2, door.x));

        // Wall segment 1 (Left of door)
        const leftLen = doorCenterX - doorWidth / 2 - seg.x1;
        if (leftLen > 0.1) {
          createWallBox(seg.x1 + leftLen / 2, wallHeight / 2, y, leftLen, wallHeight, wallThickness);
        }

        // Wall segment 2 (Right of door)
        const rightLen = seg.x2 - (doorCenterX + doorWidth / 2);
        if (rightLen > 0.1) {
          createWallBox(doorCenterX + doorWidth / 2 + rightLen / 2, wallHeight / 2, y, rightLen, wallHeight, wallThickness);
        }

        // Wall Lintel above door
        const lintelHeight = wallHeight - doorHeight;
        if (lintelHeight > 0) {
          createWallBox(doorCenterX, doorHeight + lintelHeight / 2, y, doorWidth, lintelHeight, wallThickness);
        }

        // 3D Door Frame & Panel
        create3DDoor(doorCenterX, elevationOffset, y, doorWidth, doorHeight, 'horizontal', group);
      } else if (win && len > (win.width || 4.0)) {
        const winWidth = win.width || 4.0;
        const winHeight = win.height || 4.0;
        const winSill = win.elevation || 3.0;
        const winCenterX = Math.max(seg.x1 + winWidth / 2, Math.min(seg.x2 - winWidth / 2, win.x));

        // Left
        const leftLen = winCenterX - winWidth / 2 - seg.x1;
        if (leftLen > 0.1) createWallBox(seg.x1 + leftLen / 2, wallHeight / 2, y, leftLen, wallHeight, wallThickness);
        // Right
        const rightLen = seg.x2 - (winCenterX + winWidth / 2);
        if (rightLen > 0.1) createWallBox(winCenterX + winWidth / 2 + rightLen / 2, wallHeight / 2, y, rightLen, wallHeight, wallThickness);
        // Bottom Sill
        createWallBox(winCenterX, winSill / 2, y, winWidth, winSill, wallThickness);
        // Top Lintel
        const topH = wallHeight - (winSill + winHeight);
        if (topH > 0) createWallBox(winCenterX, winSill + winHeight + topH / 2, y, winWidth, topH, wallThickness);

        // 3D Window Frame & Glass
        create3DWindow(winCenterX, elevationOffset + winSill + winHeight / 2, y, winWidth, winHeight, 'horizontal', group);
      } else {
        // Continuous solid wall
        createWallBox((seg.x1 + seg.x2) / 2, wallHeight / 2, y, len, wallHeight, wallThickness);
      }
    } else {
      // Vertical Wall (along Y)
      const len = Math.abs(seg.y2 - seg.y1);
      const x = seg.x1;

      if (door && len > (door.width || 3.0)) {
        const doorWidth = door.width || 3.0;
        const doorHeight = 7.0;
        const doorCenterY = Math.max(seg.y1 + doorWidth / 2, Math.min(seg.y2 - doorWidth / 2, door.y));

        // South piece
        const southLen = doorCenterY - doorWidth / 2 - seg.y1;
        if (southLen > 0.1) {
          createWallBox(x, wallHeight / 2, seg.y1 + southLen / 2, wallThickness, wallHeight, southLen);
        }
        // North piece
        const northLen = seg.y2 - (doorCenterY + doorWidth / 2);
        if (northLen > 0.1) {
          createWallBox(x, wallHeight / 2, doorCenterY + doorWidth / 2 + northLen / 2, wallThickness, wallHeight, northLen);
        }
        // Lintel above door
        const lintelHeight = wallHeight - doorHeight;
        if (lintelHeight > 0) {
          createWallBox(x, doorHeight + lintelHeight / 2, doorCenterY, wallThickness, lintelHeight, doorWidth);
        }

        // 3D Door Frame & Panel
        create3DDoor(x, elevationOffset, doorCenterY, doorWidth, doorHeight, 'vertical', group);
      } else if (win && len > (win.width || 4.0)) {
        const winWidth = win.width || 4.0;
        const winHeight = win.height || 4.0;
        const winSill = win.elevation || 3.0;
        const winCenterY = Math.max(seg.y1 + winWidth / 2, Math.min(seg.y2 - winWidth / 2, win.y));

        // South
        const southLen = winCenterY - winWidth / 2 - seg.y1;
        if (southLen > 0.1) createWallBox(x, wallHeight / 2, seg.y1 + southLen / 2, wallThickness, wallHeight, southLen);
        // North
        const northLen = seg.y2 - (winCenterY + winWidth / 2);
        if (northLen > 0.1) createWallBox(x, wallHeight / 2, winCenterY + winWidth / 2 + northLen / 2, wallThickness, wallHeight, northLen);
        // Bottom Sill
        createWallBox(x, winSill / 2, winCenterY, wallThickness, winSill, winWidth);
        // Top Lintel
        const topH = wallHeight - (winSill + winHeight);
        if (topH > 0) createWallBox(x, winSill + winHeight + topH / 2, winCenterY, wallThickness, topH, winWidth);

        // 3D Window Frame & Glass
        create3DWindow(x, elevationOffset + winSill + winHeight / 2, winCenterY, winWidth, winHeight, 'vertical', group);
      } else {
        // Continuous solid wall
        createWallBox(x, wallHeight / 2, (seg.y1 + seg.y2) / 2, wallThickness, wallHeight, len);
      }
    }
  });

  return {
    group,
    collisionBoxes,
    floorsGroup,
    ceilingsGroup,
  };
}

/**
 * Builds the complete Multi-Floor Stacked Architectural Model
 */
export function buildMultiFloorArchitecturalModel(
  plan: FloorPlanData,
  options: BuildMultiFloorOptions = {}
): WallMeshResult & { floorMeshes: { floorId: string; group: THREE.Group }[] } {
  const masterGroup = new THREE.Group();
  const masterFloorsGroup = new THREE.Group();
  const masterCeilingsGroup = new THREE.Group();
  const masterCollisionBoxes: THREE.Box3[] = [];
  const floorMeshes: { floorId: string; group: THREE.Group }[] = [];

  const floors = plan.floors && plan.floors.length > 0 ? plan.floors : [
    {
      id: 'floor_ground',
      name: 'Ground Floor',
      levelIndex: 0,
      elevation: 0,
      height: plan.wall_height_ft || 10,
      rooms: plan.rooms,
      doors: plan.doors,
      windows: plan.windows,
      staircase: plan.staircase,
      balconies: plan.balconies,
    }
  ];

  const explodedSpacing = options.explodedSpacing || 0;

  floors.forEach((floorLevel, idx) => {
    if (options.activeFloorOnly && options.activeFloorId && floorLevel.id !== options.activeFloorId) {
      return;
    }

    const calculatedElevation = floorLevel.elevation + (idx * explodedSpacing);
    const floorPlanForLevel: FloorPlanData = {
      ...plan,
      wall_height_ft: floorLevel.height,
      rooms: floorLevel.rooms,
      doors: floorLevel.doors,
      windows: floorLevel.windows,
      staircase: floorLevel.staircase,
      balconies: floorLevel.balconies,
    };

    const hasUpperFloor = idx < floors.length - 1;
    const result = buildArchitecturalModel(floorPlanForLevel, {
      wallHeight: floorLevel.height,
      showCeilings: options.showCeilings,
      wallColor: options.wallColor,
      elevationOffset: calculatedElevation,
      skipCeilingAboveStairs: hasUpperFloor,
    });

    const singleFloorContainer = new THREE.Group();
    singleFloorContainer.name = `floor_container_${floorLevel.id}`;
    singleFloorContainer.add(result.group);
    singleFloorContainer.add(result.floorsGroup);
    singleFloorContainer.add(result.ceilingsGroup);

    masterGroup.add(result.group);
    masterFloorsGroup.add(result.floorsGroup);
    masterCeilingsGroup.add(result.ceilingsGroup);
    masterCollisionBoxes.push(...result.collisionBoxes);

    floorMeshes.push({
      floorId: floorLevel.id,
      group: singleFloorContainer,
    });
  });

  return {
    group: masterGroup,
    collisionBoxes: masterCollisionBoxes,
    floorsGroup: masterFloorsGroup,
    ceilingsGroup: masterCeilingsGroup,
    floorMeshes,
  };
}

/**
 * Creates 3D Door Frame and Panel
 */
function create3DDoor(x: number, y: number, z: number, width: number, height: number, orientation: 'horizontal' | 'vertical', parent: THREE.Group) {
  const doorGroup = new THREE.Group();

  // Frame posts & top header
  const frameMat = Materials.woodDark();
  const frameThickness = 0.18;

  if (orientation === 'horizontal') {
    // Frame Left
    const postL = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, height, 0.7), frameMat);
    postL.position.set(-width / 2 + frameThickness / 2, height / 2, 0);
    // Frame Right
    const postR = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, height, 0.7), frameMat);
    postR.position.set(width / 2 - frameThickness / 2, height / 2, 0);
    // Frame Top
    const header = new THREE.Mesh(new THREE.BoxGeometry(width, frameThickness, 0.7), frameMat);
    header.position.set(0, height - frameThickness / 2, 0);

    // Door Panel (open at 35 degrees)
    const panel = new THREE.Mesh(new THREE.BoxGeometry(width - frameThickness * 2, height - frameThickness, 0.12), Materials.woodMedium());
    panel.position.set(-width / 4, (height - frameThickness) / 2, 0.8);
    panel.rotation.y = 0.6; // slightly open door!

    // Handle
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8), Materials.metalChrome());
    handle.rotation.z = Math.PI / 2;
    handle.position.set(width / 5, 3.2, 0.9);

    doorGroup.add(postL, postR, header, panel, handle);
    doorGroup.position.set(x, y, z);
  } else {
    // Vertical Door Frame
    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.7, height, frameThickness), frameMat);
    postL.position.set(0, height / 2, -width / 2 + frameThickness / 2);
    const postR = new THREE.Mesh(new THREE.BoxGeometry(0.7, height, frameThickness), frameMat);
    postR.position.set(0, height / 2, width / 2 - frameThickness / 2);
    const header = new THREE.Mesh(new THREE.BoxGeometry(0.7, frameThickness, width), frameMat);
    header.position.set(0, height - frameThickness / 2, 0);

    // Door Panel (open)
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.12, height - frameThickness, width - frameThickness * 2), Materials.woodMedium());
    panel.position.set(0.8, (height - frameThickness) / 2, -width / 4);
    panel.rotation.y = -0.6;

    doorGroup.add(postL, postR, header, panel);
    doorGroup.position.set(x, y, z);
  }

  parent.add(doorGroup);
}

/**
 * Creates 3D Window Frame and Glass
 */
function create3DWindow(x: number, y: number, z: number, width: number, height: number, orientation: 'horizontal' | 'vertical', parent: THREE.Group) {
  const winGroup = new THREE.Group();
  const frameMat = Materials.metalBlack();

  if (orientation === 'horizontal') {
    // Frame
    const frameMesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.2), frameMat);
    // Glass
    const glassMesh = new THREE.Mesh(new THREE.BoxGeometry(width - 0.3, height - 0.3, 0.05), Materials.glassClear());
    winGroup.add(frameMesh, glassMesh);
    winGroup.position.set(x, y, z);
  } else {
    const frameMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, height, width), frameMat);
    const glassMesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, height - 0.3, width - 0.3), Materials.glassClear());
    winGroup.add(frameMesh, glassMesh);
    winGroup.position.set(x, y, z);
  }

  parent.add(winGroup);
}
