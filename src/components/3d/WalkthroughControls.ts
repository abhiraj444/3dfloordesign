import * as THREE from 'three';
import { Room, FloorLevel, StaircaseData } from '../../types';

export interface WalkthroughState {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  currentRoom: Room | null;
  currentFloorLevel: number;
  isLocked: boolean;
}

export class FirstPersonController {
  private camera: THREE.Camera;
  private domElement: HTMLElement;
  private collisionBoxes: THREE.Box3[] = [];
  private rooms: Room[] = [];
  private floors: FloorLevel[] = [];
  private currentFloorElevation = 0;

  // Motion state
  public moveForward = false;
  public moveBackward = false;
  public moveLeft = false;
  public moveRight = false;
  public isRunning = false;

  // Mouse Drag state (when pointer lock is not engaged)
  private isPointerDown = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  // Physics & Navigation parameters
  public eyeHeight = 5.5; // eye-level in feet
  public playerRadius = 0.45; // collision buffer in feet (fits easily through 3ft doors)
  public speed = 8.5; // ft/sec
  public runMultiplier = 1.6;

  // Internal vectors
  private velocity = new THREE.Vector3();
  private direction = new THREE.Vector3();
  private euler = new THREE.Euler(0, 0, 0, 'YXZ');
  public isLocked = false;

  // Callbacks
  public onRoomChange?: (room: Room | null) => void;
  public onFloorChange?: (floorIndex: number, floorName: string) => void;
  public onLockChange?: (locked: boolean) => void;
  public onPositionChange?: (pos: { x: number; y: number; z: number; yaw: number }) => void;
  public onFovChange?: (fov: number) => void;
  public onManualInput?: () => void;

  private activeRoomId: string | null = null;
  private activeFloorIdx = 0;

  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;
  private boundWheel: (e: WheelEvent) => void;
  private boundPointerLockChange: () => void;

  constructor(camera: THREE.Camera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseDown = this.onMouseDown.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
    this.boundWheel = this.onWheel.bind(this);
    this.boundPointerLockChange = this.onPointerLockChange.bind(this);

    this.initEventListeners();
  }

  public setCollisionBoxes(boxes: THREE.Box3[]) {
    this.collisionBoxes = boxes;
  }

  public setRooms(rooms: Room[]) {
    this.rooms = rooms;
  }

  public setFloors(floors: FloorLevel[]) {
    this.floors = floors;
  }

  public setPosition(x: number, y: number, z: number, yaw = 0) {
    this.camera.position.set(x, y, z);
    this.euler.set(0, yaw, 0);
    this.camera.quaternion.setFromEuler(this.euler);
    this.currentFloorElevation = Math.max(0, Math.floor(y / 10) * 10);
  }

  public jumpToFloor(levelIndex: number) {
    if (!this.floors || this.floors.length === 0) return;
    const targetFloor = this.floors[Math.max(0, Math.min(this.floors.length - 1, levelIndex))];
    if (targetFloor) {
      this.currentFloorElevation = targetFloor.elevation;
      this.camera.position.y = targetFloor.elevation + this.eyeHeight;
      this.activeFloorIdx = targetFloor.levelIndex;
      this.onFloorChange?.(targetFloor.levelIndex, targetFloor.name);
    }
  }

  private initEventListeners() {
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    document.addEventListener('mousemove', this.boundMouseMove);
    this.domElement.addEventListener('mousedown', this.boundMouseDown);
    window.addEventListener('mouseup', this.boundMouseUp);
    this.domElement.addEventListener('wheel', this.boundWheel, { passive: false });
    document.addEventListener('pointerlockchange', this.boundPointerLockChange);
  }

  public requestPointerLock() {
    try {
      this.domElement.requestPointerLock();
    } catch {
      // Ignored
    }
  }

  public exitPointerLock() {
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
  }

  private onMouseDown(event: MouseEvent) {
    if (event.button === 0) {
      this.isPointerDown = true;
      this.lastPointerX = event.clientX;
      this.lastPointerY = event.clientY;
    }
  }

  private onMouseUp() {
    this.isPointerDown = false;
  }

  private onWheel(event: WheelEvent) {
    if (!this.isLocked && !this.isPointerDown) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? 3 : -3;
    this.zoomFov(delta);
  }

  public getFov(): number {
    if (this.camera instanceof THREE.PerspectiveCamera) {
      return this.camera.fov;
    }
    return 50;
  }

  public setFov(fov: number) {
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.fov = THREE.MathUtils.clamp(fov, 25, 85);
      this.camera.updateProjectionMatrix();
      if (this.onFovChange) {
        this.onFovChange(this.camera.fov);
      }
    }
  }

  public zoomFov(deltaFov: number): number {
    if (this.camera instanceof THREE.PerspectiveCamera) {
      const nextFov = THREE.MathUtils.clamp(this.camera.fov + deltaFov, 25, 85);
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
      if (this.onFovChange) {
        this.onFovChange(nextFov);
      }
      return nextFov;
    }
    return 50;
  }

  public resetFov() {
    this.setFov(50);
  }

  private onPointerLockChange() {
    this.isLocked = document.pointerLockElement === this.domElement;
    if (this.onLockChange) {
      this.onLockChange(this.isLocked);
    }
  }

  private onMouseMove(event: MouseEvent) {
    if (this.isLocked) {
      const movementX = event.movementX || 0;
      const movementY = event.movementY || 0;

      if (Math.abs(movementX) > 0.5 || Math.abs(movementY) > 0.5) {
        this.onManualInput?.();
      }

      this.euler.setFromQuaternion(this.camera.quaternion);
      this.euler.y -= movementX * 0.0024;
      this.euler.x -= movementY * 0.0024;

      const maxPitch = Math.PI / 2 - 0.05;
      this.euler.x = Math.max(-maxPitch, Math.min(maxPitch, this.euler.x));
      this.camera.quaternion.setFromEuler(this.euler);
    } else if (this.isPointerDown) {
      // Drag to look around on desktop without locking pointer
      const dx = event.clientX - this.lastPointerX;
      const dy = event.clientY - this.lastPointerY;
      this.lastPointerX = event.clientX;
      this.lastPointerY = event.clientY;

      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        this.onManualInput?.();
      }

      this.euler.setFromQuaternion(this.camera.quaternion);
      this.euler.y -= dx * 0.0035;
      this.euler.x -= dy * 0.0035;

      const maxPitch = Math.PI / 2 - 0.05;
      this.euler.x = Math.max(-maxPitch, Math.min(maxPitch, this.euler.x));
      this.camera.quaternion.setFromEuler(this.euler);
    }
  }

  // Virtual look rotation (for touch or mobile joystick controls)
  public rotateLook(deltaYaw: number, deltaPitch: number) {
    this.onManualInput?.();
    this.euler.setFromQuaternion(this.camera.quaternion);
    this.euler.y -= deltaYaw;
    this.euler.x -= deltaPitch;
    const maxPitch = Math.PI / 2 - 0.05;
    this.euler.x = Math.max(-maxPitch, Math.min(maxPitch, this.euler.x));
    this.camera.quaternion.setFromEuler(this.euler);
  }

  private onKeyDown(event: KeyboardEvent) {
    // Only process navigation keys if not typing in an input/textarea
    const targetTag = (event.target as HTMLElement)?.tagName?.toLowerCase();
    if (targetTag === 'input' || targetTag === 'textarea') return;

    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.moveForward = true;
        this.onManualInput?.();
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.moveBackward = true;
        this.onManualInput?.();
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.moveLeft = true;
        this.onManualInput?.();
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.moveRight = true;
        this.onManualInput?.();
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.isRunning = true;
        break;
    }
  }

  private onKeyUp(event: KeyboardEvent) {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.moveForward = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.moveBackward = false;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.moveLeft = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.moveRight = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.isRunning = false;
        break;
    }
  }

  /**
   * Collision checking against wall bounding boxes at the current vertical height
   */
  private checkCollision(newPos: THREE.Vector3): boolean {
    const playerBox = new THREE.Box3();
    const feetY = newPos.y - this.eyeHeight;
    const min = new THREE.Vector3(newPos.x - this.playerRadius, feetY + 0.5, newPos.z - this.playerRadius);
    const max = new THREE.Vector3(newPos.x + this.playerRadius, feetY + 6.5, newPos.z + this.playerRadius);
    playerBox.set(min, max);

    for (const wallBox of this.collisionBoxes) {
      if (playerBox.intersectsBox(wallBox)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if player is traversing staircase and calculate height ramp
   */
  private calculateStairElevation(pos: THREE.Vector3): number {
    let currentFloor = this.floors.find((f) => f.levelIndex === this.activeFloorIdx) || this.floors[0];
    if (!currentFloor) {
      return this.eyeHeight;
    }

    // Check staircase on current floor or adjacent floor
    const allStairs: { stair: StaircaseData; floorElevation: number; floorIdx: number }[] = [];
    this.floors.forEach((fl) => {
      if (fl.staircase) {
        allStairs.push({ stair: fl.staircase, floorElevation: fl.elevation, floorIdx: fl.levelIndex });
      }
    });

    for (const item of allStairs) {
      const s = item.stair;
      const margin = 0.6;
      if (
        pos.x >= s.x - margin &&
        pos.x <= s.x + s.width + margin &&
        pos.z >= s.y - margin &&
        pos.z <= s.y + s.length + margin
      ) {
        // Player is on staircase
        const progress = THREE.MathUtils.clamp((pos.z - s.y) / s.length, 0, 1);
        const stairHeight = 10.0;
        const targetElevation = item.floorElevation + (progress * stairHeight);

        // Update active floor when crossing boundary
        if (progress > 0.85) {
          const nextFloor = this.floors.find((f) => f.levelIndex === item.floorIdx + 1);
          if (nextFloor && nextFloor.levelIndex !== this.activeFloorIdx) {
            this.activeFloorIdx = nextFloor.levelIndex;
            this.onFloorChange?.(nextFloor.levelIndex, nextFloor.name);
          }
        } else if (progress < 0.15) {
          if (item.floorIdx !== this.activeFloorIdx) {
            this.activeFloorIdx = item.floorIdx;
            const fl = this.floors.find((f) => f.levelIndex === item.floorIdx);
            if (fl) this.onFloorChange?.(fl.levelIndex, fl.name);
          }
        }

        this.currentFloorElevation = targetElevation;
        return targetElevation + this.eyeHeight;
      }
    }

    // Determine floor based on height
    const currentBaseElevation = Math.max(0, Math.floor((pos.y - this.eyeHeight + 2.0) / 10) * 10);
    this.currentFloorElevation = currentBaseElevation;
    return currentBaseElevation + this.eyeHeight;
  }

  /**
   * Check which room the player is currently inside
   */
  private updateCurrentRoom(pos: THREE.Vector3) {
    let insideRoom: Room | null = null;
    const currentFloor = this.floors.find((f) => f.levelIndex === this.activeFloorIdx) || this.floors[0];
    const roomList = currentFloor ? currentFloor.rooms : this.rooms;

    for (const r of roomList) {
      if (pos.x >= r.x && pos.x <= r.x + r.width && pos.z >= r.y && pos.z <= r.y + r.length) {
        insideRoom = r;
        break;
      }
    }

    const currentId = insideRoom ? insideRoom.id : null;
    if (currentId !== this.activeRoomId) {
      this.activeRoomId = currentId;
      if (this.onRoomChange) {
        this.onRoomChange(insideRoom);
      }
    }
  }

  /**
   * Update motion on every animation frame
   */
  public update(delta: number) {
    const dt = Math.min(delta, 0.1); // clamp to avoid physics tunnels on lag spikes

    // Deceleration damping
    this.velocity.x -= this.velocity.x * 10.0 * dt;
    this.velocity.z -= this.velocity.z * 10.0 * dt;

    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    this.direction.normalize();

    const currentSpeed = this.speed * (this.isRunning ? this.runMultiplier : 1.0);

    if (this.moveForward || this.moveBackward) {
      this.velocity.z -= this.direction.z * currentSpeed * 10.0 * dt;
    }
    if (this.moveLeft || this.moveRight) {
      this.velocity.x += this.direction.x * currentSpeed * 10.0 * dt;
    }

    // Move forward/strafe along camera yaw plane
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, this.euler.y, 0));
    const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, this.euler.y, 0));

    const moveStep = new THREE.Vector3();
    moveStep.addScaledVector(forward, -this.velocity.z * dt);
    moveStep.addScaledVector(right, this.velocity.x * dt);

    // Apply X motion if no collision
    const testPosX = this.camera.position.clone();
    testPosX.x += moveStep.x;
    if (!this.checkCollision(testPosX)) {
      this.camera.position.x = testPosX.x;
    }

    // Apply Z motion if no collision
    const testPosZ = this.camera.position.clone();
    testPosZ.z += moveStep.z;
    if (!this.checkCollision(testPosZ)) {
      this.camera.position.z = testPosZ.z;
    }

    // Update Y elevation (smooth stairs ramp or floor height)
    const targetY = this.calculateStairElevation(this.camera.position);
    this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetY, 0.25);

    // Detect active room
    this.updateCurrentRoom(this.camera.position);

    if (this.onPositionChange) {
      this.onPositionChange({
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z,
        yaw: this.euler.y,
      });
    }
  }

  public dispose() {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    document.removeEventListener('mousemove', this.boundMouseMove);
    this.domElement.removeEventListener('mousedown', this.boundMouseDown);
    window.removeEventListener('mouseup', this.boundMouseUp);
    this.domElement.removeEventListener('wheel', this.boundWheel);
    document.removeEventListener('pointerlockchange', this.boundPointerLockChange);
  }
}
