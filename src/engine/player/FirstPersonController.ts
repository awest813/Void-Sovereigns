import {
  Color3,
  KeyboardEventTypes,
  MeshBuilder,
  Ray,
  Scene,
  SpotLight,
  UniversalCamera,
  Vector3,
} from '@babylonjs/core';
import type { Sound } from '@babylonjs/core';
import { gameState } from '../../game/state/GameState';
import { createLocalSound } from '../../game/assets/ProceduralAssets';

export interface FirstPersonControllerOptions {
  position?: Vector3;
  speed?: number;
  sprintMultiplier?: number;
  mouseSensitivity?: number;
  gravity?: Vector3;
  ellipsoid?: Vector3;
  onImpulseChange?: (percent: number, ready: boolean, charges: number, maxCharges: number) => void;
  onImpulseUsed?: (charges: number, maxCharges: number) => void;
}

export class FirstPersonController {
  readonly camera: UniversalCamera;
  private baseSpeed: number;
  private sprintMultiplier: number;
  private verticalVelocity = 0;
  private groundLevel = 1.7;
  private gravity = -0.005;
  private jumpPower = 0.15;
  private footstepSound: Sound;
  private stepAccumulator = 0;
  private pressedKeys = new Set<string>();
  private normalFov = 0.8;
  private sprintFov = 0.9;
  private impulseCooldownMs = 1800;
  private impulseStrength = 1.65;
  private wasImpulseReady = true;
  private maxImpulseCharges = 2;
  private impulseCharges = this.maxImpulseCharges;
  private lastNotifiedImpulseCharges = this.maxImpulseCharges;
  private lastImpulseRechargeTime = Date.now();
  private dodgeWindowUntil = 0;
  private isSprintHeld = false;
  private isCrouchHeld = false;
  private flashlight: SpotLight;
  private flashlightOn = false;

  constructor(scene: Scene, canvas: HTMLCanvasElement, options: FirstPersonControllerOptions = {}) {
    this.baseSpeed = options.speed ?? 0.5;
    if (gameState.hasPerk('MARATHONER')) this.baseSpeed *= 1.25;

    this.sprintMultiplier = options.sprintMultiplier ?? 1.8;
    this.footstepSound = createLocalSound(
      'footstep',
      scene,
      {
        volume: 0.15,
        playbackRate: 1.0,
        autoplay: false,
      }
    );

    const position = options.position ?? new Vector3(0, 1.7, 0);
    this.camera = new UniversalCamera('fps-camera', position, scene);
    this.camera.setTarget(new Vector3(position.x, position.y, position.z + 1));

    this.camera.minZ = 0.1;
    this.camera.speed = this.baseSpeed;
    this.normalFov = this.camera.fov;
    this.sprintFov = this.normalFov * 1.1;
    this.camera.angularSensibility = 1 / (options.mouseSensitivity ?? 0.002);
    this.camera.inertia = 0.1;
    this.camera.keysUp = [87, 38];
    this.camera.keysDown = [83, 40];
    this.camera.keysLeft = [65, 37];
    this.camera.keysRight = [68, 39];
    this.camera.checkCollisions = true;
    this.camera.applyGravity = false;
    this.camera.ellipsoid = options.ellipsoid ?? new Vector3(0.4, 0.85, 0.4);
    this.camera.ellipsoidOffset = new Vector3(0, 0.85, 0);
    this.camera.metadata = {
      ...(this.camera.metadata ?? {}),
      isPlayerSensor: true,
      getExposureScore: () => this.getExposureScore(),
      isFlashlightOn: () => this.flashlightOn,
      isCrouching: () => this.isCrouching(),
    };

    this.flashlight = new SpotLight(
      'suit_flashlight',
      new Vector3(0, 0, 0),
      Vector3.Forward(),
      Math.PI / 4,
      8,
      scene
    );
    this.flashlight.parent = this.camera;
    this.flashlight.position = new Vector3(0.12, -0.08, 0.2);
    this.flashlight.diffuse = new Color3(0.75, 0.9, 1);
    this.flashlight.specular = new Color3(0.35, 0.55, 1);
    this.flashlight.range = 16;
    this.flashlight.intensity = 0;

    scene.gravity = new Vector3(0, 0, 0);
    this.camera.attachControl(canvas, true);

    const hitbox = MeshBuilder.CreateCapsule('player_hitbox', { height: 1.8, radius: 0.5 }, scene);
    hitbox.parent = this.camera;
    hitbox.position = new Vector3(0, -0.9, 0);
    hitbox.isVisible = false;
    hitbox.isPickable = true;
    hitbox.checkCollisions = false;
    hitbox.metadata = { isPlayer: true };

    scene.onKeyboardObservable.add((info) => {
      if (info.type === KeyboardEventTypes.KEYDOWN) {
        this.pressedKeys.add(info.event.code);
      } else if (info.type === KeyboardEventTypes.KEYUP) {
        this.pressedKeys.delete(info.event.code);
      }

      if (info.event.code === 'ShiftLeft' || info.event.code === 'ShiftRight') {
        this.isSprintHeld = info.type === KeyboardEventTypes.KEYDOWN;
      }

      if (info.event.code === 'ControlLeft' || info.event.code === 'ControlRight') {
        this.isCrouchHeld = info.type === KeyboardEventTypes.KEYDOWN;
      }

      if (info.event.code === 'Space' && info.type === KeyboardEventTypes.KEYDOWN && this.isGrounded(scene)) {
        this.verticalVelocity = this.jumpPower;
      }

      if (info.event.code === 'KeyQ' && info.type === KeyboardEventTypes.KEYDOWN) {
        this.tryImpulseDash(options);
      }

      if (info.event.code === 'KeyL' && info.type === KeyboardEventTypes.KEYDOWN) {
        this.flashlightOn = !this.flashlightOn;
        this.flashlight.intensity = this.flashlightOn ? 2.2 : 0;
      }
    });

    scene.onBeforeRenderObservable.add(() => {
      const delta = scene.getEngine().getDeltaTime();

      this.baseSpeed = options.speed ?? 0.5;
      if (gameState.hasPerk('MARATHONER')) this.baseSpeed *= 1.25;

      this.camera.speed = this.getMoveSpeed();
      this.camera.ellipsoid.y = this.isCrouchHeld ? 0.55 : (options.ellipsoid?.y ?? 0.85);
      this.camera.ellipsoidOffset.y = this.isCrouchHeld ? 0.55 : 0.85;

      const isSprinting = this.isSprinting();
      this.updateSprintFov(delta, isSprinting && this.isMoving());
      this.updateImpulseReadiness(options);

      const grounded = this.isGrounded(scene);

      if (grounded) {
        if (this.camera.cameraDirection.length() > 0.0001) {
          this.stepAccumulator += delta;
          const stepThreshold = this.isCrouchHeld ? 650 : (this.isSprinting() ? 250 : 400);
          if (this.stepAccumulator > stepThreshold) {
            this.footstepSound.play();
            this.stepAccumulator = 0;
          }
        } else {
          this.stepAccumulator = 0;
        }
      }

      if (!grounded || this.verticalVelocity > 0) {
        this.camera.position.y += this.verticalVelocity;
        this.verticalVelocity += this.gravity;

        if (this.camera.position.y < this.groundLevel) {
          this.camera.position.y = this.groundLevel;
          this.verticalVelocity = 0;
        }
      }
    });

    canvas.addEventListener('click', () => {
      canvas.requestPointerLock();
    });

    options.onImpulseChange?.(1, true, this.impulseCharges, this.maxImpulseCharges);
  }

  getPosition(): Vector3 {
    return this.camera.position.clone();
  }

  getForwardRay(length = 3): Ray {
    return this.camera.getForwardRay(length);
  }

  isMoving(): boolean {
    return this.camera.cameraDirection.length() > 0.0001 || this.hasMovementKeyPressed();
  }

  isAirborne(scene = this.camera.getScene()): boolean {
    return !this.isGrounded(scene);
  }

  getAccuracyPenalty(scene = this.camera.getScene()): number {
    let penalty = 1;
    if (this.isMoving()) penalty += this.isSprinting() ? 0.85 : 0.35;
    if (this.isAirborne(scene)) penalty += 0.65;
    return penalty;
  }

  getExposureScore(): number {
    let exposure = this.isMoving() ? 1 : 0.45;
    if (this.isCrouchHeld) exposure *= 0.2;
    if (this.isSprinting()) exposure *= 1.35;
    if (this.flashlightOn) exposure += 1.25;
    if (this.isDodging()) exposure += 0.45;
    return Math.max(0.05, Math.min(2.5, exposure));
  }

  isCrouching(): boolean {
    return this.isCrouchHeld;
  }

  isFlashlightEnabled(): boolean {
    return this.flashlightOn;
  }

  private isGrounded(scene: Scene): boolean {
    const ray = new Ray(this.camera.position, Vector3.Down(), 1.8);
    const hit = scene.pickWithRay(ray, (mesh) => mesh.checkCollisions);
    return Boolean(hit?.hit && hit.distance <= 1.8) || this.camera.position.y <= this.groundLevel + 0.05;
  }

  private hasMovementKeyPressed(): boolean {
    return (
      this.pressedKeys.has('KeyW') ||
      this.pressedKeys.has('KeyA') ||
      this.pressedKeys.has('KeyS') ||
      this.pressedKeys.has('KeyD') ||
      this.pressedKeys.has('ArrowUp') ||
      this.pressedKeys.has('ArrowLeft') ||
      this.pressedKeys.has('ArrowDown') ||
      this.pressedKeys.has('ArrowRight')
    );
  }

  private isSprinting(): boolean {
    return this.isSprintHeld && !this.isCrouchHeld && this.hasMovementKeyPressed();
  }

  private getMoveSpeed(): number {
    if (this.isCrouchHeld) return this.baseSpeed * 0.38;
    if (!this.isSprintHeld) return this.baseSpeed;
    const mult = gameState.hasPerk('OVERDRIVE') ? this.sprintMultiplier * 1.5 : this.sprintMultiplier;
    return this.baseSpeed * mult;
  }

  private getImpulseDirection(): Vector3 {
    const forward = this.camera.getDirection(Vector3.Forward());
    const right = this.camera.getDirection(Vector3.Right());
    forward.y = 0;
    right.y = 0;
    forward.normalize();
    right.normalize();

    const direction = Vector3.Zero();
    if (this.pressedKeys.has('KeyW') || this.pressedKeys.has('ArrowUp')) direction.addInPlace(forward);
    if (this.pressedKeys.has('KeyS') || this.pressedKeys.has('ArrowDown')) direction.subtractInPlace(forward);
    if (this.pressedKeys.has('KeyD') || this.pressedKeys.has('ArrowRight')) direction.addInPlace(right);
    if (this.pressedKeys.has('KeyA') || this.pressedKeys.has('ArrowLeft')) direction.subtractInPlace(right);

    if (direction.lengthSquared() < 0.001) {
      direction.copyFrom(forward);
    }

    return direction.normalize();
  }

  private tryImpulseDash(options: FirstPersonControllerOptions): void {
    const now = Date.now();
    if (this.impulseCharges <= 0) return;

    this.impulseCharges--;
    this.lastImpulseRechargeTime = now;
    this.dodgeWindowUntil = now + 420;
    const direction = this.getImpulseDirection();
    this.camera.cameraDirection.addInPlace(direction.scale(this.impulseStrength));
    this.recoilFov();
    options.onImpulseUsed?.(this.impulseCharges, this.maxImpulseCharges);
    this.notifyImpulseChange(options);
  }

  private updateSprintFov(deltaMs: number, isSprinting: boolean): void {
    const targetFov = isSprinting ? this.sprintFov : this.normalFov;
    const lerpAmount = Math.min(1, (deltaMs / 1000) * 8);
    this.camera.fov += (targetFov - this.camera.fov) * lerpAmount;
  }

  private recoilFov(): void {
    this.camera.fov = Math.min(this.sprintFov * 1.05, this.camera.fov + 0.035);
  }

  private updateImpulseReadiness(options: FirstPersonControllerOptions): void {
    const now = Date.now();
    if (this.impulseCharges < this.maxImpulseCharges) {
      const elapsed = now - this.lastImpulseRechargeTime;
      const recoveredCharges = Math.floor(elapsed / this.impulseCooldownMs);
      if (recoveredCharges > 0) {
        this.impulseCharges = Math.min(this.maxImpulseCharges, this.impulseCharges + recoveredCharges);
        this.lastImpulseRechargeTime = now;
      }
    }

    this.notifyImpulseChange(options);
  }

  private notifyImpulseChange(options: FirstPersonControllerOptions): void {
    const elapsed = Date.now() - this.lastImpulseRechargeTime;
    const percent = this.impulseCharges >= this.maxImpulseCharges
      ? 1
      : Math.max(0, Math.min(1, elapsed / this.impulseCooldownMs));
    const ready = this.impulseCharges > 0;

    if (
      ready !== this.wasImpulseReady ||
      this.impulseCharges !== this.lastNotifiedImpulseCharges ||
      !ready ||
      this.impulseCharges < this.maxImpulseCharges
    ) {
      options.onImpulseChange?.(percent, ready, this.impulseCharges, this.maxImpulseCharges);
      this.wasImpulseReady = ready;
      this.lastNotifiedImpulseCharges = this.impulseCharges;
    }
  }

  isDodging(): boolean {
    return Date.now() < this.dodgeWindowUntil;
  }
}
