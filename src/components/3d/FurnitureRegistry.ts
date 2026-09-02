import * as THREE from 'three';
import { Room, RoomType } from '../../types';

// Materials cache for high performance
const materialCache: Record<string, THREE.Material> = {};

function getMaterial(key: string, createFn: () => THREE.Material): THREE.Material {
  if (!materialCache[key]) {
    materialCache[key] = createFn();
  }
  return materialCache[key];
}

// Materials definition
export const Materials = {
  woodDark: () =>
    getMaterial('woodDark', () => new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.6, metalness: 0.1 })),
  woodMedium: () =>
    getMaterial('woodMedium', () => new THREE.MeshStandardMaterial({ color: 0x8a5a36, roughness: 0.5, metalness: 0.1 })),
  woodLight: () =>
    getMaterial('woodLight', () => new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.6, metalness: 0.05 })),
  fabricWhite: () =>
    getMaterial('fabricWhite', () => new THREE.MeshStandardMaterial({ color: 0xf5f3ef, roughness: 0.9, metalness: 0.0 })),
  fabricGrey: () =>
    getMaterial('fabricGrey', () => new THREE.MeshStandardMaterial({ color: 0x4a4e5a, roughness: 0.85, metalness: 0.05 })),
  fabricAccent: () =>
    getMaterial('fabricAccent', () => new THREE.MeshStandardMaterial({ color: 0x2b5876, roughness: 0.8, metalness: 0.1 })),
  leatherBrown: () =>
    getMaterial('leatherBrown', () => new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.4, metalness: 0.2 })),
  metalChrome: () =>
    getMaterial('metalChrome', () => new THREE.MeshStandardMaterial({ color: 0xdde1e7, roughness: 0.1, metalness: 0.95 })),
  metalBlack: () =>
    getMaterial('metalBlack', () => new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3, metalness: 0.8 })),
  metalGold: () =>
    getMaterial('metalGold', () => new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.25, metalness: 0.9 })),
  ceramicWhite: () =>
    getMaterial('ceramicWhite', () => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15, metalness: 0.05 })),
  graniteBlack: () =>
    getMaterial('graniteBlack', () => new THREE.MeshStandardMaterial({ color: 0x1e2022, roughness: 0.2, metalness: 0.2 })),
  glassClear: () =>
    getMaterial('glassClear', () => new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.9,
      ior: 1.5,
    })),
  glassFrosted: () =>
    getMaterial('glassFrosted', () => new THREE.MeshPhysicalMaterial({
      color: 0xecf0f1,
      transparent: true,
      opacity: 0.6,
      roughness: 0.4,
      metalness: 0.05,
    })),
  plantGreen: () =>
    getMaterial('plantGreen', () => new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.7, metalness: 0.05 })),
  potClay: () =>
    getMaterial('potClay', () => new THREE.MeshStandardMaterial({ color: 0xb05b3b, roughness: 0.8, metalness: 0.0 })),
  tvScreen: () =>
    getMaterial('tvScreen', () => new THREE.MeshBasicMaterial({ color: 0x050505 })),
  lampGlow: () =>
    getMaterial('lampGlow', () => new THREE.MeshBasicMaterial({ color: 0xfff4cc })),
  poojaBrass: () =>
    getMaterial('poojaBrass', () => new THREE.MeshStandardMaterial({ color: 0xe6b800, roughness: 0.2, metalness: 0.85 })),
  carpetLiving: () =>
    getMaterial('carpetLiving', () => new THREE.MeshStandardMaterial({ color: 0xd6ccc2, roughness: 0.95 })),
};

/**
 * Creates a detailed Bedroom Furniture Group
 */
export function createBedroomFurniture(room: Room): THREE.Group {
  const group = new THREE.Group();
  const cx = room.x + room.width / 2;
  const cy = room.y + room.length / 2;

  // 1. Bed (King/Queen Size: 6ft x 6.5ft x 1.8ft)
  const bedGroup = new THREE.Group();

  // Bed frame base
  const bedFrameGeo = new THREE.BoxGeometry(6.2, 0.8, 6.7);
  const bedFrameMesh = new THREE.Mesh(bedFrameGeo, Materials.woodDark());
  bedFrameMesh.position.set(0, 0.4, 0);
  bedFrameMesh.castShadow = true;
  bedFrameMesh.receiveShadow = true;
  bedGroup.add(bedFrameMesh);

  // Mattress
  const mattressGeo = new THREE.BoxGeometry(5.8, 0.7, 6.3);
  const mattressMesh = new THREE.Mesh(mattressGeo, Materials.fabricWhite());
  mattressMesh.position.set(0, 1.05, -0.1);
  mattressMesh.castShadow = true;
  bedGroup.add(mattressMesh);

  // Headboard
  const headboardGeo = new THREE.BoxGeometry(6.6, 3.2, 0.4);
  const headboardMesh = new THREE.Mesh(headboardGeo, Materials.woodDark());
  headboardMesh.position.set(0, 1.6, 3.2);
  headboardMesh.castShadow = true;
  bedGroup.add(headboardMesh);

  // Pillows
  const pillowGeo = new THREE.BoxGeometry(2.0, 0.35, 1.4);
  const pillow1 = new THREE.Mesh(pillowGeo, Materials.fabricWhite());
  pillow1.position.set(-1.6, 1.45, 2.2);
  pillow1.rotation.x = 0.15;
  pillow1.castShadow = true;

  const pillow2 = new THREE.Mesh(pillowGeo, Materials.fabricWhite());
  pillow2.position.set(1.6, 1.45, 2.2);
  pillow2.rotation.x = 0.15;
  pillow2.castShadow = true;
  bedGroup.add(pillow1, pillow2);

  // Duvet Blanket / Runner
  const blanketGeo = new THREE.BoxGeometry(5.9, 0.15, 3.8);
  const blanketMesh = new THREE.Mesh(blanketGeo, Materials.fabricAccent());
  blanketMesh.position.set(0, 1.42, -1.2);
  blanketMesh.castShadow = true;
  bedGroup.add(blanketMesh);

  // 2. Side Tables with Bedside Lamps
  [-3.8, 3.8].forEach((sideX) => {
    const tableGeo = new THREE.BoxGeometry(1.6, 1.5, 1.6);
    const tableMesh = new THREE.Mesh(tableGeo, Materials.woodDark());
    tableMesh.position.set(sideX, 0.75, 3.0);
    tableMesh.castShadow = true;
    bedGroup.add(tableMesh);

    // Lamp Base
    const lampBaseGeo = new THREE.CylinderGeometry(0.25, 0.35, 0.1, 16);
    const lampBase = new THREE.Mesh(lampBaseGeo, Materials.metalGold());
    lampBase.position.set(sideX, 1.55, 3.0);

    // Lamp Shade
    const lampShadeGeo = new THREE.CylinderGeometry(0.35, 0.55, 0.7, 16, 1, true);
    const lampShade = new THREE.Mesh(lampShadeGeo, Materials.fabricWhite());
    lampShade.position.set(sideX, 2.0, 3.0);

    // Lamp Bulb Glow
    const bulbGeo = new THREE.SphereGeometry(0.15, 12, 12);
    const bulb = new THREE.Mesh(bulbGeo, Materials.lampGlow());
    bulb.position.set(sideX, 1.9, 3.0);

    bedGroup.add(lampBase, lampShade, bulb);
  });

  // Position the bed nicely inside the room
  const bedPosZ = room.length > 10 ? -room.length / 2 + 4.5 : 0;
  bedGroup.position.set(0, 0, bedPosZ);
  group.add(bedGroup);

  // 3. Wardrobe / Closet against side wall
  const wardrobeWidth = Math.min(6.5, room.width - 2);
  const wardrobeGeo = new THREE.BoxGeometry(wardrobeWidth, 7.5, 2.0);
  const wardrobeMesh = new THREE.Mesh(wardrobeGeo, Materials.woodMedium());
  wardrobeMesh.position.set(0, 3.75, room.length / 2 - 1.2);
  wardrobeMesh.castShadow = true;
  group.add(wardrobeMesh);

  // Wardrobe handle accents
  const handleGeo = new THREE.BoxGeometry(0.08, 1.2, 0.08);
  const handle1 = new THREE.Mesh(handleGeo, Materials.metalGold());
  handle1.position.set(-0.3, 3.75, room.length / 2 - 0.15);
  const handle2 = new THREE.Mesh(handleGeo, Materials.metalGold());
  handle2.position.set(0.3, 3.75, room.length / 2 - 0.15);
  group.add(handle1, handle2);

  group.position.set(cx, 0, cy);
  return group;
}

/**
 * Creates Living & Dining Area Furniture
 */
export function createLivingDiningFurniture(room: Room): THREE.Group {
  const group = new THREE.Group();
  const cx = room.x + room.width / 2;
  const cy = room.y + room.length / 2;

  // 1. Area Carpet
  const rugWidth = Math.min(12, room.width - 2);
  const rugLength = Math.min(10, room.length - 3);
  const rugGeo = new THREE.BoxGeometry(rugWidth, 0.04, rugLength);
  const rugMesh = new THREE.Mesh(rugGeo, Materials.carpetLiving());
  rugMesh.position.set(-room.width * 0.15, 0.02, -room.length * 0.15);
  rugMesh.receiveShadow = true;
  group.add(rugMesh);

  // 2. Modern L-Shaped / Sectional Sofa
  const sofaGroup = new THREE.Group();
  // Main sofa seat
  const mainSeatGeo = new THREE.BoxGeometry(8.0, 1.2, 3.0);
  const mainSeat = new THREE.Mesh(mainSeatGeo, Materials.fabricGrey());
  mainSeat.position.set(0, 0.6, 0);
  mainSeat.castShadow = true;
  sofaGroup.add(mainSeat);

  // Backrest
  const backrestGeo = new THREE.BoxGeometry(8.0, 1.8, 0.8);
  const backrest = new THREE.Mesh(backrestGeo, Materials.fabricGrey());
  backrest.position.set(0, 1.6, 1.2);
  backrest.castShadow = true;
  sofaGroup.add(backrest);

  // L-Extension (chaise lounge)
  const lSeatGeo = new THREE.BoxGeometry(3.0, 1.2, 4.0);
  const lSeat = new THREE.Mesh(lSeatGeo, Materials.fabricGrey());
  lSeat.position.set(-2.5, 0.6, -2.5);
  lSeat.castShadow = true;
  sofaGroup.add(lSeat);

  // Sofa Cushions
  [-2.2, 0.5, 2.8].forEach((posX, i) => {
    const cushionGeo = new THREE.BoxGeometry(1.4, 1.2, 0.35);
    const cushionMat = i === 1 ? Materials.fabricAccent() : Materials.fabricWhite();
    const cushion = new THREE.Mesh(cushionGeo, cushionMat);
    cushion.position.set(posX, 1.4, 0.6);
    cushion.rotation.x = -0.15;
    cushion.castShadow = true;
    sofaGroup.add(cushion);
  });

  sofaGroup.position.set(-room.width * 0.15, 0, -room.length * 0.15 + 2.0);
  group.add(sofaGroup);

  // 3. Coffee Table
  const tableGroup = new THREE.Group();
  const tableTopGeo = new THREE.BoxGeometry(4.2, 0.1, 2.4);
  const tableTop = new THREE.Mesh(tableTopGeo, Materials.woodMedium());
  tableTop.position.set(0, 1.3, 0);
  tableTop.castShadow = true;

  const tableLegsGeo = new THREE.BoxGeometry(0.15, 1.3, 0.15);
  [[-1.9, -1.0], [1.9, -1.0], [-1.9, 1.0], [1.9, 1.0]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(tableLegsGeo, Materials.metalBlack());
    leg.position.set(lx, 0.65, lz);
    tableGroup.add(leg);
  });
  tableGroup.add(tableTop);
  tableGroup.position.set(-room.width * 0.15 + 0.8, 0, -room.length * 0.15 - 1.2);
  group.add(tableGroup);

  // 4. TV Media Console & Wall Mounted TV
  const tvConsoleGeo = new THREE.BoxGeometry(7.0, 1.4, 1.4);
  const tvConsole = new THREE.Mesh(tvConsoleGeo, Materials.woodDark());
  tvConsole.position.set(-room.width * 0.15, 0.7, -room.length * 0.45);
  tvConsole.castShadow = true;
  group.add(tvConsole);

  // TV Screen
  const tvGeo = new THREE.BoxGeometry(5.5, 3.2, 0.2);
  const tvMesh = new THREE.Mesh(tvGeo, Materials.tvScreen());
  tvMesh.position.set(-room.width * 0.15, 4.2, -room.length * 0.48);
  tvMesh.castShadow = true;

  const tvFrameGeo = new THREE.BoxGeometry(5.7, 3.4, 0.18);
  const tvFrame = new THREE.Mesh(tvFrameGeo, Materials.metalBlack());
  tvFrame.position.set(-room.width * 0.15, 4.2, -room.length * 0.49);
  group.add(tvFrame, tvMesh);

  // 5. Dining Table Set (if room is large enough)
  if (room.width >= 12 || room.length >= 14) {
    const diningGroup = new THREE.Group();
    // Dining Table (5ft x 3.2ft x 2.5ft)
    const dTableTopGeo = new THREE.BoxGeometry(5.5, 0.15, 3.4);
    const dTableTop = new THREE.Mesh(dTableTopGeo, Materials.woodMedium());
    dTableTop.position.set(0, 2.5, 0);
    dTableTop.castShadow = true;
    diningGroup.add(dTableTop);

    // Table legs
    const dLegGeo = new THREE.CylinderGeometry(0.12, 0.1, 2.45, 12);
    [[-2.4, -1.4], [2.4, -1.4], [-2.4, 1.4], [2.4, 1.4]].forEach(([dx, dz]) => {
      const dLeg = new THREE.Mesh(dLegGeo, Materials.metalBlack());
      dLeg.position.set(dx, 1.22, dz);
      diningGroup.add(dLeg);
    });

    // 4 to 6 Dining Chairs
    const chairPositions = [
      { x: -1.6, z: -2.3, rot: 0 },
      { x: 1.6, z: -2.3, rot: 0 },
      { x: -1.6, z: 2.3, rot: Math.PI },
      { x: 1.6, z: 2.3, rot: Math.PI },
    ];
    chairPositions.forEach((pos) => {
      const chairGroup = new THREE.Group();
      // Seat
      const cSeat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 1.4), Materials.fabricAccent());
      cSeat.position.set(0, 1.5, 0);
      // Back
      const cBack = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 0.1), Materials.fabricAccent());
      cBack.position.set(0, 2.3, 0.65);
      // Legs
      const cLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 1.45, 8), Materials.metalBlack());
      [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]].forEach(([cx, cz]) => {
        const leg = cLeg.clone();
        leg.position.set(cx, 0.72, cz);
        chairGroup.add(leg);
      });
      chairGroup.add(cSeat, cBack);
      chairGroup.position.set(pos.x, 0, pos.z);
      chairGroup.rotation.y = pos.rot;
      diningGroup.add(chairGroup);
    });

    diningGroup.position.set(room.width * 0.22, 0, room.length * 0.2);
    group.add(diningGroup);
  }

  group.position.set(cx, 0, cy);
  return group;
}

/**
 * Creates Modular Kitchen Furniture & Appliances
 */
export function createKitchenFurniture(room: Room): THREE.Group {
  const group = new THREE.Group();
  const cx = room.x + room.width / 2;
  const cy = room.y + room.length / 2;

  // 1. Countertop L-shape
  const counterHeight = 2.8;
  const counterDepth = 2.2;
  const counterLength = Math.max(4, room.width - 1.2);

  // Main Counter base
  const baseCabinetGeo = new THREE.BoxGeometry(counterLength, counterHeight, counterDepth);
  const baseCabinet = new THREE.Mesh(baseCabinetGeo, Materials.woodDark());
  baseCabinet.position.set(0, counterHeight / 2, -room.length / 2 + counterDepth / 2 + 0.4);
  baseCabinet.castShadow = true;
  group.add(baseCabinet);

  // Granite Countertop Top
  const graniteTopGeo = new THREE.BoxGeometry(counterLength + 0.2, 0.15, counterDepth + 0.2);
  const graniteTop = new THREE.Mesh(graniteTopGeo, Materials.graniteBlack());
  graniteTop.position.set(0, counterHeight + 0.075, -room.length / 2 + counterDepth / 2 + 0.4);
  graniteTop.castShadow = true;
  group.add(graniteTop);

  // 2. Gas Stove with 3-Burners
  const stoveGeo = new THREE.BoxGeometry(2.4, 0.1, 1.6);
  const stove = new THREE.Mesh(stoveGeo, Materials.metalBlack());
  stove.position.set(-counterLength * 0.2, counterHeight + 0.18, -room.length / 2 + counterDepth / 2 + 0.4);
  group.add(stove);

  // Burner Rings
  [-0.6, 0.6].forEach((bx) => {
    const burnerGeo = new THREE.TorusGeometry(0.28, 0.05, 8, 16);
    const burner = new THREE.Mesh(burnerGeo, Materials.metalGold());
    burner.rotation.x = Math.PI / 2;
    burner.position.set(bx, 0.08, 0);
    stove.add(burner);
  });

  // Range Hood / Chimney
  const chimneyGeo = new THREE.BoxGeometry(2.6, 1.2, 1.8);
  const chimney = new THREE.Mesh(chimneyGeo, Materials.metalChrome());
  chimney.position.set(-counterLength * 0.2, 6.5, -room.length / 2 + counterDepth / 2 + 0.4);
  group.add(chimney);

  // 3. Kitchen Sink with Chrome Tap
  const sinkGeo = new THREE.BoxGeometry(2.0, 0.05, 1.5);
  const sink = new THREE.Mesh(sinkGeo, Materials.metalChrome());
  sink.position.set(counterLength * 0.25, counterHeight + 0.16, -room.length / 2 + counterDepth / 2 + 0.4);
  group.add(sink);

  // Chrome Faucet Tap
  const tapGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8);
  const tap = new THREE.Mesh(tapGeo, Materials.metalChrome());
  tap.position.set(counterLength * 0.25, counterHeight + 0.55, -room.length / 2 + counterDepth / 2 - 0.2);
  group.add(tap);

  // 4. Double-Door Modern Refrigerator
  const fridgeGeo = new THREE.BoxGeometry(2.8, 6.2, 2.6);
  const fridge = new THREE.Mesh(fridgeGeo, Materials.metalChrome());
  fridge.position.set(room.width / 2 - 1.8, 3.1, room.length / 2 - 1.8);
  fridge.castShadow = true;
  group.add(fridge);

  // Fridge handles
  const fHandleGeo = new THREE.BoxGeometry(0.06, 2.2, 0.06);
  const fHandle = new THREE.Mesh(fHandleGeo, Materials.metalBlack());
  fHandle.position.set(room.width / 2 - 3.2, 3.6, room.length / 2 - 1.8);
  group.add(fHandle);

  // 5. Overhead Kitchen Cabinets
  const wallCabinetGeo = new THREE.BoxGeometry(counterLength, 2.2, 1.4);
  const wallCabinet = new THREE.Mesh(wallCabinetGeo, Materials.woodMedium());
  wallCabinet.position.set(0, 6.8, -room.length / 2 + 1.1);
  group.add(wallCabinet);

  group.position.set(cx, 0, cy);
  return group;
}

/**
 * Creates Modern Bathroom / Toilet Fixtures
 */
export function createToiletFurniture(room: Room): THREE.Group {
  const group = new THREE.Group();
  const cx = room.x + room.width / 2;
  const cy = room.y + room.length / 2;

  // 1. Commode / Water Closet (WC)
  const wcGroup = new THREE.Group();
  // Base
  const wcBase = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 2.0), Materials.ceramicWhite());
  wcBase.position.set(0, 0.7, 0);
  wcBase.castShadow = true;
  wcGroup.add(wcBase);

  // Tank / Cistern
  const wcTank = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 0.7), Materials.ceramicWhite());
  wcTank.position.set(0, 1.8, 0.65);
  wcTank.castShadow = true;
  wcGroup.add(wcTank);

  // Seat Ring
  const wcSeat = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.1, 8, 16), Materials.ceramicWhite());
  wcSeat.rotation.x = Math.PI / 2;
  wcSeat.position.set(0, 1.42, -0.3);
  wcGroup.add(wcSeat);

  wcGroup.position.set(-room.width / 2 + 1.2, 0, -room.length / 2 + 1.4);
  group.add(wcGroup);

  // 2. Vanity Cabinet with Wash Basin & Mirror
  const vanityGroup = new THREE.Group();
  const vanityBase = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.5, 1.6), Materials.woodDark());
  vanityBase.position.set(0, 1.25, 0);
  vanityBase.castShadow = true;

  // Basin
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.5, 0.4, 16), Materials.ceramicWhite());
  basin.position.set(0, 2.7, 0);
  basin.castShadow = true;

  // Chrome Faucet
  const basinTap = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8), Materials.metalChrome());
  basinTap.position.set(0, 3.1, 0.45);

  // Mirror
  const mirror = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.8, 0.08), Materials.glassClear());
  mirror.position.set(0, 5.0, 0.75);

  vanityGroup.add(vanityBase, basin, basinTap, mirror);
  vanityGroup.position.set(room.width / 2 - 1.6, 0, -room.length / 2 + 1.2);
  group.add(vanityGroup);

  // 3. Glass Shower Partition
  const glassPartitionGeo = new THREE.BoxGeometry(0.08, 6.5, Math.min(4.0, room.length * 0.6));
  const glassPartition = new THREE.Mesh(glassPartitionGeo, Materials.glassClear());
  glassPartition.position.set(0, 3.25, room.length / 2 - 2.2);
  group.add(glassPartition);

  // Shower Head Fixture
  const showerPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 8), Materials.metalChrome());
  showerPipe.position.set(-room.width / 2 + 1.2, 6.8, room.length / 2 - 1.2);
  const showerHead = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.08, 16), Materials.metalChrome());
  showerHead.position.set(-room.width / 2 + 1.2, 6.5, room.length / 2 - 1.2);
  group.add(showerPipe, showerHead);

  group.position.set(cx, 0, cy);
  return group;
}

/**
 * Creates Traditional Indian Pooja Mandir (Prayer Shrine)
 */
export function createPoojaFurniture(room: Room): THREE.Group {
  const group = new THREE.Group();
  const cx = room.x + room.width / 2;
  const cy = room.y + room.length / 2;

  // 1. Ornate Wooden/Marble Mandir Structure
  const mandirGroup = new THREE.Group();
  const mandirWidth = Math.min(3.8, room.width - 0.8);

  // Plinth Platform base
  const plinthGeo = new THREE.BoxGeometry(mandirWidth, 0.8, 2.2);
  const plinth = new THREE.Mesh(plinthGeo, Materials.woodMedium());
  plinth.position.set(0, 0.4, 0);
  plinth.castShadow = true;
  mandirGroup.add(plinth);

  // Shrine Pillars
  const pillarGeo = new THREE.CylinderGeometry(0.12, 0.15, 3.5, 12);
  [[-mandirWidth / 2 + 0.25, -0.85], [mandirWidth / 2 - 0.25, -0.85], [-mandirWidth / 2 + 0.25, 0.85], [mandirWidth / 2 - 0.25, 0.85]].forEach(([px, pz]) => {
    const pillar = new THREE.Mesh(pillarGeo, Materials.woodMedium());
    pillar.position.set(px, 2.55, pz);
    mandirGroup.add(pillar);
  });

  // Mandir Dome / Gopuram Peak
  const domeGeo = new THREE.ConeGeometry(0.8, 1.2, 16);
  const dome = new THREE.Mesh(domeGeo, Materials.poojaBrass());
  dome.position.set(0, 4.9, 0);
  mandirGroup.add(dome);

  // Top Canopy
  const canopyGeo = new THREE.BoxGeometry(mandirWidth + 0.3, 0.4, 2.4);
  const canopy = new THREE.Mesh(canopyGeo, Materials.woodMedium());
  canopy.position.set(0, 4.3, 0);
  mandirGroup.add(canopy);

  // 2. Brass Diya Lamps with Glowing Flame
  [-0.9, 0.9].forEach((dx) => {
    const diyaBase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.4, 12), Materials.poojaBrass());
    diyaBase.position.set(dx, 0.95, 0.4);

    const flameGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const flame = new THREE.Mesh(flameGeo, Materials.lampGlow());
    flame.position.set(dx, 1.22, 0.4);

    mandirGroup.add(diyaBase, flame);
  });

  // 3. Hanging Brass Bell
  const bellGeo = new THREE.CylinderGeometry(0.12, 0.22, 0.35, 12);
  const bell = new THREE.Mesh(bellGeo, Materials.poojaBrass());
  bell.position.set(0, 3.8, 0);
  mandirGroup.add(bell);

  // 4. Prayer Velvet Mat / Asana
  const matGeo = new THREE.BoxGeometry(2.4, 0.05, 1.8);
  const mat = new THREE.Mesh(matGeo, Materials.fabricAccent());
  mat.position.set(0, 0.03, -2.0);
  mandirGroup.add(mat);

  mandirGroup.position.set(0, 0, room.length / 2 - 1.8);
  group.add(mandirGroup);

  group.position.set(cx, 0, cy);
  return group;
}

/**
 * Creates 3D Staircase with steps, stringers, and balustrade
 */
export function createStaircaseFurniture(data: {
  x: number;
  y: number;
  width: number;
  length: number;
  direction?: 'up' | 'down';
  stepCount?: number;
}): THREE.Group {
  const group = new THREE.Group();
  const steps = data.stepCount || 14;
  const totalHeight = 10.0; // standard floor-to-floor height in ft
  const stepHeight = totalHeight / steps;
  const stepLength = data.length / steps;

  for (let i = 0; i < steps; i++) {
    const stepY = i * stepHeight + stepHeight / 2;
    const stepZ = i * stepLength + stepLength / 2;

    // Tread
    const treadGeo = new THREE.BoxGeometry(data.width, stepHeight * 0.9, stepLength * 1.05);
    const treadMesh = new THREE.Mesh(treadGeo, Materials.woodMedium());
    treadMesh.position.set(0, stepY, stepZ);
    treadMesh.castShadow = true;
    treadMesh.receiveShadow = true;
    group.add(treadMesh);

    // Handrail Baluster posts on one side
    if (i % 2 === 0) {
      const balusterGeo = new THREE.CylinderGeometry(0.04, 0.04, 3.0, 8);
      const baluster = new THREE.Mesh(balusterGeo, Materials.metalChrome());
      baluster.position.set(data.width / 2 - 0.15, stepY + 1.5, stepZ);
      group.add(baluster);
    }
  }

  // Slanted Handrail top
  const railGeo = new THREE.BoxGeometry(0.12, 0.15, data.length * 1.1);
  const rail = new THREE.Mesh(railGeo, Materials.woodDark());
  rail.position.set(data.width / 2 - 0.15, totalHeight / 2 + 3.0, data.length / 2);
  rail.rotation.x = Math.atan2(totalHeight, data.length);
  group.add(rail);

  group.position.set(data.x + data.width / 2, 0, data.y);
  return group;
}

/**
 * Creates Balcony with glass & steel railing and potted plants
 */
export function createBalconyFurniture(data: { x: number; y: number; width: number; length: number }): THREE.Group {
  const group = new THREE.Group();
  const cx = data.x + data.width / 2;
  const cy = data.y + data.length / 2;

  // Railing height
  const railHeight = 3.5;

  // Glass Balustrade front
  const frontGlassGeo = new THREE.BoxGeometry(data.width, railHeight, 0.08);
  const frontGlass = new THREE.Mesh(frontGlassGeo, Materials.glassClear());
  frontGlass.position.set(0, railHeight / 2, -data.length / 2 + 0.1);
  group.add(frontGlass);

  // Top Handrail pipe
  const handrailGeo = new THREE.BoxGeometry(data.width, 0.15, 0.15);
  const handrail = new THREE.Mesh(handrailGeo, Materials.metalChrome());
  handrail.position.set(0, railHeight + 0.075, -data.length / 2 + 0.1);
  group.add(handrail);

  // Potted indoor/outdoor plants
  [-data.width / 2 + 1.5, data.width / 2 - 1.5].forEach((px) => {
    const potGeo = new THREE.CylinderGeometry(0.6, 0.45, 1.2, 16);
    const pot = new THREE.Mesh(potGeo, Materials.potClay());
    pot.position.set(px, 0.6, 0);

    const plantGeo = new THREE.SphereGeometry(0.9, 12, 12);
    const plant = new THREE.Mesh(plantGeo, Materials.plantGreen());
    plant.position.set(px, 1.6, 0);

    group.add(pot, plant);
  });

  group.position.set(cx, 0, cy);
  return group;
}

/**
 * Main Asset Registry Dispatcher for a single Room
 */
export function generateFurnitureForRoom(room: Room): THREE.Group {
  switch (room.type) {
    case 'bedroom':
      return createBedroomFurniture(room);
    case 'living_dining':
      return createLivingDiningFurniture(room);
    case 'kitchen':
      return createKitchenFurniture(room);
    case 'toilet':
      return createToiletFurniture(room);
    case 'pooja':
      return createPoojaFurniture(room);
    case 'corridor':
    case 'other':
    default: {
      const group = new THREE.Group();
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.35, 1.0, 12), Materials.potClay());
      pot.position.set(room.x + 1.2, 0.5, room.y + 1.2);
      const plant = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 10), Materials.plantGreen());
      plant.position.set(room.x + 1.2, 1.3, room.y + 1.2);
      group.add(pot, plant);
      return group;
    }
  }
}

/**
 * Generates all 3D furniture for a specific floor level
 */
export function generateFurnitureForFloor(
  rooms: Room[],
  staircase?: { x: number; y: number; width: number; length: number; direction?: 'up' | 'down'; stepCount?: number },
  balconies?: { x: number; y: number; width: number; length: number }[],
  elevation = 0
): THREE.Group {
  const floorGroup = new THREE.Group();

  // Rooms furniture
  rooms.forEach((room) => {
    const roomFurn = generateFurnitureForRoom(room);
    floorGroup.add(roomFurn);
  });

  // Staircase
  if (staircase) {
    const stairMesh = createStaircaseFurniture(staircase);
    floorGroup.add(stairMesh);
  }

  // Balconies
  if (balconies) {
    balconies.forEach((balcony) => {
      const balconyMesh = createBalconyFurniture(balcony);
      floorGroup.add(balconyMesh);
    });
  }

  floorGroup.position.y = elevation;
  return floorGroup;
}

