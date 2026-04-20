import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  TransformNode,
  Ray,
  Sound,
} from '@babylonjs/core';
import type { HealthSystem } from '../state/HealthSystem';

export enum AIState {
  PATROL,
  ALERT,
  ATTACK
}

export class SecurityBot {
  private scene: Scene;
  private mesh: Mesh;
  private target: TransformNode;
  private playerHealth: HealthSystem;
  
  private state: AIState = AIState.PATROL;
  private speed = 0.05;
  private detectionRange = 10;
  private attackRange = 8;
  private patrolRadius = 5;
  private startPosition: Vector3;
  private patrolTarget: Vector3;
  
  private lastFireTime = 0;
  private fireRate = 800; // ms
  private damage = 5;

  constructor(scene: Scene, position: Vector3, target: TransformNode, playerHealth: HealthSystem) {
    this.scene = scene;
    this.target = target;
    this.playerHealth = playerHealth;
    this.startPosition = position.clone();
    this.patrolTarget = this.getRandomPatrolPoint();

    // Visuals: A hovering drone-like sphere with an "eye"
    this.mesh = MeshBuilder.CreateSphere('security_bot', { diameter: 0.6 }, scene);
    this.mesh.position = position;
    
    const mat = new StandardMaterial('bot_mat', scene);
    mat.diffuseColor = new Color3(0.2, 0.2, 0.25);
    mat.emissiveColor = new Color3(0.1, 0.2, 0.4); // Blue idle eye
    this.mesh.material = mat;

    const eye = MeshBuilder.CreateBox('bot_eye', { width: 0.2, height: 0.1, depth: 0.15 }, scene);
    eye.position = new Vector3(0, 0, 0.3);
    eye.parent = this.mesh;
    
    const eyeMat = new StandardMaterial('bot_eye_mat', scene);
    eyeMat.emissiveColor = new Color3(0.1, 0.8, 1.0);
    eye.material = eyeMat;

    // Positional Audio
    const hum = new Sound('bot_hum', 'https://www.babylonjs-live.com/assets/sounds/fan.wav', scene, null, {
      loop: true,
      autoplay: true,
      spatialSound: true,
      distanceModel: 'exponential',
      maxDistance: 10,
    });
    hum.attachToMesh(this.mesh);

    scene.onBeforeRenderObservable.add(() => this.update());
  }

  private update(): void {
    const distToPlayer = Vector3.Distance(this.mesh.position, this.target.position);

    switch (this.state) {
      case AIState.PATROL:
        this.patrol();
        if (distToPlayer < this.detectionRange) {
          this.state = AIState.ALERT;
          this.setEyeColor(new Color3(1, 0.5, 0)); // Orange alert
        }
        break;

      case AIState.ALERT:
        this.mesh.lookAt(this.target.position);
        if (distToPlayer < this.attackRange) {
          this.state = AIState.ATTACK;
          this.setEyeColor(new Color3(1, 0, 0)); // Red attack
        } else if (distToPlayer > this.detectionRange) {
          this.state = AIState.PATROL;
          this.setEyeColor(new Color3(0.1, 0.8, 1.0)); // Back to blue
        }
        break;

      case AIState.ATTACK:
        this.mesh.lookAt(this.target.position);
        this.attack();
        if (distToPlayer > this.attackRange) {
          this.state = AIState.ALERT;
          this.setEyeColor(new Color3(1, 0.5, 0));
        }
        break;
    }
  }

  private patrol(): void {
    const direction = this.patrolTarget.subtract(this.mesh.position).normalize();
    this.mesh.position.addInPlace(direction.scale(this.speed * 0.5));
    this.mesh.lookAt(this.patrolTarget);

    if (Vector3.Distance(this.mesh.position, this.patrolTarget) < 0.5) {
      this.patrolTarget = this.getRandomPatrolPoint();
    }
  }

  private attack(): void {
    const now = Date.now();
    if (now - this.lastFireTime > this.fireRate) {
      // Raycast check
      const direction = this.target.position.subtract(this.mesh.position).normalize();
      const ray = new Ray(this.mesh.position, direction, this.attackRange);
      const hit = this.scene.pickWithRay(ray);

      if (hit?.hit) {
        this.playerHealth.takeDamage(this.damage);
        this.triggerMuzzleEffect();
      }
      this.lastFireTime = now;
    }
  }

  private getRandomPatrolPoint(): Vector3 {
    return this.startPosition.add(new Vector3(
      (Math.random() - 0.5) * this.patrolRadius * 2,
      0,
      (Math.random() - 0.5) * this.patrolRadius * 2
    ));
  }

  private setEyeColor(color: Color3): void {
    const mat = (this.mesh.getChildMeshes()[0].material as StandardMaterial);
    mat.emissiveColor = color;
  }

  private triggerMuzzleEffect(): void {
    const mat = (this.mesh.getChildMeshes()[0].material as StandardMaterial);
    const oldColor = mat.emissiveColor.clone();
    mat.emissiveColor = new Color3(1, 1, 1);
    setTimeout(() => {
      mat.emissiveColor = oldColor;
    }, 50);
  }

  public dispose(): void {
    this.mesh.dispose();
  }
}
