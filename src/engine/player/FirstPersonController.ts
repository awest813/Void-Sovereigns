  Sound,
  Ray,
  MeshBuilder
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
    this.camera.applyGravity = false; // Using custom gravity for "floaty" feel
    this.camera.ellipsoid = options.ellipsoid ?? new Vector3(0.4, 0.85, 0.4);
    this.camera.ellipsoidOffset = new Vector3(0, 0.85, 0);

    scene.gravity = new Vector3(0, 0, 0); 

    this.camera.attachControl(canvas, true);

    // AI Hitbox Target
    const hitbox = MeshBuilder.CreateCapsule('player_hitbox', { height: 1.8, radius: 0.5 }, scene);
    hitbox.parent = this.camera;
    hitbox.position = new Vector3(0, -0.9, 0); // Center on camera
    hitbox.isVisible = false;
    hitbox.isPickable = true;
    hitbox.checkCollisions = false;
    hitbox.metadata = { isPlayer: true };

    // Jump & Sprint handling
    scene.onKeyboardObservable.add((info) => {
      if (info.event.code === 'ShiftLeft' || info.event.code === 'ShiftRight') {
        if (info.type === KeyboardEventTypes.KEYDOWN) {
          const mult = gameState.hasPerk('OVERDRIVE') ? this.sprintMultiplier * 1.5 : this.sprintMultiplier;
          this.camera.speed = this.baseSpeed * mult;
        } else if (info.type === KeyboardEventTypes.KEYUP) {
          this.camera.speed = this.baseSpeed;
        }
      }
      if (info.event.code === 'Space' && info.type === KeyboardEventTypes.KEYDOWN) {
         if (this.isGrounded(scene)) {
            this.verticalVelocity = this.jumpPower;
         }
      }
    });

        // Footstep & Custom Physics Logic
        scene.onBeforeRenderObservable.add(() => {
            const engine = scene.getEngine();
            const delta = engine.getDeltaTime();
            
            // Reactive Speed Perk
            this.baseSpeed = options.speed ?? 0.5;
            if (gameState.hasPerk('MARATHONER')) this.baseSpeed *= 1.25;
            // If not sprinting, update current speed
            const isSprinting = this.camera.speed > this.baseSpeed * 1.1;
            if (!isSprinting) this.camera.speed = this.baseSpeed;

            const grounded = this.isGrounded(scene);

            // Footstep timing
            if (grounded) {
                if (this.camera.cameraDirection.length() > 0.0001) {
                    this.stepAccumulator += delta;
                    const stepThreshold = (this.camera.speed > this.baseSpeed) ? 250 : 400; 
                    if (this.stepAccumulator > stepThreshold) {
                        this.footstepSound.play();
                        this.stepAccumulator = 0;
                    }
                }
            }

            if (!grounded || this.verticalVelocity > 0) {
                this.camera.position.y += this.verticalVelocity;
                this.verticalVelocity += this.gravity;
                
                // Safety floor (fallback if raycast missed or scene is empty)
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

  private isGrounded(scene: Scene): boolean {
    const ray = new Ray(this.camera.position, Vector3.Down(), 1.8);
    const hit = scene.pickWithRay(ray, (mesh) => mesh.checkCollisions);
    
    if (hit?.hit && hit.distance <= 1.8) {
       return true;
    }
    return this.camera.position.y <= this.groundLevel + 0.05;
  }
}
