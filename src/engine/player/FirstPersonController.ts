import {
  UniversalCamera,
  Vector3,
  Scene,
  KeyboardEventTypes,
  TransformNode,
  Sound
} from '@babylonjs/core';
import { gameState } from '../../game/state/GameState';

export interface FirstPersonControllerOptions {
  position?: Vector3;
  speed?: number;
  sprintMultiplier?: number;
  mouseSensitivity?: number;
  gravity?: Vector3;
  ellipsoid?: Vector3;
}

export class FirstPersonController {
  readonly camera: UniversalCamera;
  private baseSpeed: number;
  private sprintMultiplier: number;
  private verticalVelocity = 0;
  private groundLevel = 1.7;
  private gravity = -0.005; // Per-frame floaty gravity
  private jumpPower = 0.15;

  private footstepSound: Sound;
  private stepAccumulator = 0;

  constructor(scene: Scene, canvas: HTMLCanvasElement, options: FirstPersonControllerOptions = {}) {
    this.baseSpeed = options.speed ?? 0.5;
    if (gameState.hasPerk('MARATHONER')) this.baseSpeed *= 1.25;
    
    this.sprintMultiplier = options.sprintMultiplier ?? 1.8;

    this.footstepSound = new Sound('footstep', 'https://www.babylonjs-live.com/assets/sounds/step.wav', scene, null, {
        volume: 0.15,
        playbackRate: 1.0,
        autoplay: false
    });

    const position = options.position ?? new Vector3(0, 1.7, 0);
    this.camera = new UniversalCamera('fps-camera', position, scene);
    this.camera.setTarget(new Vector3(position.x, position.y, position.x + 1));

    this.camera.minZ = 0.1;
    this.camera.speed = this.baseSpeed;
    this.camera.angularSensibility = 1 / (options.mouseSensitivity ?? 0.002);
    this.camera.inertia = 0.1;

    // WASD + arrow keys
    this.camera.keysUp = [87, 38];    // W, Up
    this.camera.keysDown = [83, 40];  // S, Down
    this.camera.keysLeft = [65, 37];  // A, Left
    this.camera.keysRight = [68, 39]; // D, Right

    // Collision
    this.camera.checkCollisions = true;
    this.camera.applyGravity = true;
    this.camera.ellipsoid = options.ellipsoid ?? new Vector3(0.4, 0.85, 0.4);
    this.camera.ellipsoidOffset = new Vector3(0, 0.85, 0);

    scene.gravity = options.gravity ?? new Vector3(0, -0.2, 0); // Lo-grav Halo feel

    this.camera.attachControl(canvas, true);

    // Jump & Sprint handling
    scene.onKeyboardObservable.add((info) => {
      if (info.event.code === 'ShiftLeft' || info.event.code === 'ShiftRight') {
        if (info.type === KeyboardEventTypes.KEYDOWN) {
          this.camera.speed = this.baseSpeed * this.sprintMultiplier;
        } else if (info.type === KeyboardEventTypes.KEYUP) {
          this.camera.speed = this.baseSpeed;
        }
      }
      if (info.event.code === 'Space' && info.type === KeyboardEventTypes.KEYDOWN) {
         if (this.camera.position.y <= this.groundLevel + 0.1) {
            this.verticalVelocity = this.jumpPower;
         }
      }
    });

    // Footstep & Custom Physics Logic
    scene.onBeforeRenderObservable.add(() => {
        const engine = scene.getEngine();
        const delta = engine.getDeltaTime();
        
        // Footstep timing
        if (this.camera.position.y <= this.groundLevel + 0.1) {
            const isMoving = this.camera.cameraDirection.length() > 0.001 || this.camera.cameraRotation.length() > 0.001;
            // Movement check uses WASD input indirectly via camera direction
            // We'll check if any movement key is pressed for accuracy
            const keysPressed = this.camera.keysUp.concat(this.camera.keysDown, this.camera.keysLeft, this.camera.keysRight);
            // This is complex, let's just use cameraDirection
            if (this.camera.cameraDirection.length() > 0.0001) {
                this.stepAccumulator += delta;
                const stepThreshold = (this.camera.speed > this.baseSpeed) ? 250 : 400; // Faster steps when sprinting
                if (this.stepAccumulator > stepThreshold) {
                    this.footstepSound.play();
                    this.stepAccumulator = 0;
                }
            }
        }

        if (this.camera.position.y > this.groundLevel || this.verticalVelocity > 0) {
            this.camera.position.y += this.verticalVelocity;
            this.verticalVelocity += this.gravity;
            if (this.camera.position.y < this.groundLevel) {
                this.camera.position.y = this.groundLevel;
                this.verticalVelocity = 0;
            }
        }
    });

    // Pointer lock
    canvas.addEventListener('click', () => {
      canvas.requestPointerLock();
    });
  }

  getPosition(): Vector3 {
    return this.camera.position.clone();
  }

  getForwardRay(length = 3) {
    return this.camera.getForwardRay(length);
  }
}
