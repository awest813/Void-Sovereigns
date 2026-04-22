import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  Ray,
} from '@babylonjs/core';
import type { HealthSystem } from '../state/HealthSystem';
import type { HUD } from '../../ui/hud/HUD';
import { gameState } from '../state/GameState';

type TurretState = 'idle' | 'locking' | 'firing' | 'staggered' | 'dead';

export class Turret {
  private scene: Scene;
  private base: Mesh;
  private head: Mesh;
  private target: any;
  private playerHealth: HealthSystem;
  
  private range = 15;
  private fireRate = 1000; // ms
  private damage = 10;
  private lastFireTime = 0;
  private hud: HUD;
  private health = 30;
  private state: TurretState = 'idle';
  private stateEnteredAt = Date.now();
  private lockOnMs = 700;
  private staggerMs = 450;
  private hasWarnedLock = false;

  constructor(scene: Scene, position: Vector3, target: any, playerHealth: HealthSystem, hud: HUD) {
    this.scene = scene;
    this.target = target;
    this.playerHealth = playerHealth;
    this.hud = hud;

    // Visuals
    this.base = MeshBuilder.CreateBox('turret_base', { width: 0.8, height: 0.2, depth: 0.8 }, scene);
    this.base.position = position.add(new Vector3(0, 0.1, 0));
    
    const baseMat = new StandardMaterial('turret_base_mat', scene);
    baseMat.diffuseColor = new Color3(0.2, 0.2, 0.2);
    this.base.material = baseMat;

    this.head = MeshBuilder.CreateBox('turret_head', { width: 0.4, height: 0.4, depth: 0.6 }, scene);
    this.head.position = position.add(new Vector3(0, 0.4, 0));
    
    const headMat = new StandardMaterial('turret_head_mat', scene);
    headMat.diffuseColor = new Color3(0.1, 0.1, 0.1);
    headMat.emissiveColor = new Color3(0.3, 0.05, 0.05); // Red eye
    this.head.material = headMat;
    
    this.head.metadata = {
      onHit: (damage: number) => {
        if (this.state === 'dead') return;
        this.health -= damage;
        if (this.health <= 0) {
           this.transitionTo('dead');
           if (gameState.addXP(200)) this.hud.showLevelUp();
           this.dispose();
        } else {
          this.transitionTo('staggered');
        }
      }
    };

    // Tracking loop
    scene.onBeforeRenderObservable.add(() => this.update());
  }

  private update(): void {
    if (this.state === 'dead') return;
    const dist = Vector3.Distance(this.head.position, this.target.position);
    const canSeePlayer = dist < this.range && this.hasLineOfSight();

    if (canSeePlayer) {
      this.head.lookAt(this.target.position);

      if (this.state === 'idle') {
        this.transitionTo('locking');
      }

      if (this.state === 'locking' && Date.now() - this.stateEnteredAt > this.lockOnMs) {
        this.transitionTo('firing');
      }

      if (this.state === 'firing') {
        const now = Date.now();
        if (now - this.lastFireTime > this.fireRate) {
          this.fire();
          this.lastFireTime = now;
        }
      }
    } else if (this.state !== 'staggered') {
      this.transitionTo('idle');
    }

    if (this.state === 'staggered' && Date.now() - this.stateEnteredAt > this.staggerMs) {
      this.transitionTo(canSeePlayer ? 'locking' : 'idle');
    }
  }

  private fire(): void {
    // Raycast to check line of sight
    const direction = this.target.position.subtract(this.head.position).normalize();
    const ray = new Ray(this.head.position, direction, this.range);
    const hit = this.scene.pickWithRay(ray);

    // If we hit the player or something very close to player
    if (hit?.hit && hit.pickedMesh?.metadata?.isPlayer) {
       this.playerHealth.takeDamage(this.damage);
       this.triggerMuzzleEffect();
    }
  }

  private hasLineOfSight(): boolean {
    const direction = this.target.position.subtract(this.head.position).normalize();
    const ray = new Ray(this.head.position, direction, this.range);
    const hit = this.scene.pickWithRay(ray, (mesh) => mesh !== this.head && (mesh.metadata?.isPlayer || mesh.checkCollisions));
    return Boolean(hit?.hit && hit.pickedMesh?.metadata?.isPlayer);
  }

  private transitionTo(next: TurretState): void {
    if (this.state === next || this.state === 'dead') return;
    this.state = next;
    this.stateEnteredAt = Date.now();

    const mat = this.head.material as StandardMaterial;
    switch (next) {
      case 'idle':
        mat.emissiveColor = new Color3(0.3, 0.05, 0.05);
        this.hasWarnedLock = false;
        break;
      case 'locking':
        mat.emissiveColor = new Color3(1, 0.5, 0);
        if (!this.hasWarnedLock) {
          this.hud.showMessage('TURRET LOCK ACQUIRING', 1200);
          this.hasWarnedLock = true;
        }
        break;
      case 'firing':
        mat.emissiveColor = new Color3(1, 0, 0);
        break;
      case 'staggered':
        mat.emissiveColor = new Color3(1, 1, 1);
        break;
      case 'dead':
        break;
    }
  }

  private triggerMuzzleEffect(): void {
    // Quick emissive pulse on the head
    const mat = this.head.material as StandardMaterial;
    const oldEmissive = mat.emissiveColor.clone();
    mat.emissiveColor = new Color3(1, 0, 0);
    
    setTimeout(() => {
      mat.emissiveColor = oldEmissive;
    }, 100);
  }

  public dispose(): void {
    this.transitionTo('dead');
    this.base.dispose();
    this.head.dispose();
  }
}
