import {
  UniversalCamera,
  Vector3,
  Scene,
  KeyboardEventTypes,
} from '@babylonjs/core';

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
  private isSprinting = false;
  private baseSpeed: number;
  private sprintMultiplier: number;

  constructor(scene: Scene, canvas: HTMLCanvasElement, options: FirstPersonControllerOptions = {}) {
    this.baseSpeed = options.speed ?? 0.5;
    this.sprintMultiplier = options.sprintMultiplier ?? 1.8;

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

    scene.gravity = options.gravity ?? new Vector3(0, -0.4, 0);

    this.camera.attachControl(canvas, true);

    // Sprint handling
    scene.onKeyboardObservable.add((info) => {
      if (info.event.code === 'ShiftLeft' || info.event.code === 'ShiftRight') {
        if (info.type === KeyboardEventTypes.KEYDOWN) {
          this.isSprinting = true;
          this.camera.speed = this.baseSpeed * this.sprintMultiplier;
        } else if (info.type === KeyboardEventTypes.KEYUP) {
          this.isSprinting = false;
          this.camera.speed = this.baseSpeed;
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

  getSprinting(): boolean {
    return this.isSprinting;
  }
}
