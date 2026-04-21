import {
  Scene,
  Vector3,
  TransformNode,
  Color3,
  Ray,
  Sound,
  AnimationGroup,
  AbstractMesh,
  StandardMaterial,
} from '@babylonjs/core';
import type { HealthSystem } from '../state/HealthSystem';
import type { HUD } from '../../ui/hud/HUD';
import { gameState } from '../state/GameState';
import { ASSETS } from '../AssetManifest';
import { importMeshAsync } from '../BabylonAssetLoader';

export enum AIState {
  PATROL,
  ALERT,
  ATTACK
}

export class SecurityBot {
  private scene: Scene;
  private target: TransformNode;
  private playerHealth: HealthSystem;
  
  private state: AIState = AIState.PATROL;
  private detectionRange = 10;
  private attackRange = 8;
  private patrolRadius = 5;
  private startPosition: Vector3;
  private patrolTarget: Vector3;
  private lastFireTime = 0;
  private fireRate = 800; // ms
  private damage = 5;
  private health = 20;
  private hud: HUD;

  // Steering AI
  private velocity: Vector3 = Vector3.Zero();
  private maxSpeed = 0.08;
  private maxForce = 0.02;
  private mass = 1.0;

  // 3D Model & Animations
  private mesh: AbstractMesh | null = null;
  private anims: AnimationGroup[] = [];
  private hum: Sound | null = null;

  private waypoints: Vector3[] = [];
  private waypointIndex = 0;

  constructor(scene: Scene, position: Vector3, target: TransformNode, playerHealth: HealthSystem, hud: HUD, waypoints?: Vector3[]) {
    this.scene = scene;
    this.target = target;
    this.playerHealth = playerHealth;
    this.hud = hud;
    this.startPosition = position.clone();
    
    if (waypoints && waypoints.length > 0) {
      this.waypoints = waypoints;
      this.patrolTarget = this.waypoints[0];
    } else {
      this.patrolTarget = this.getRandomPatrolPoint();
    }

    this.loadModel(position);

    // Positional Audio
    this.hum = new Sound('bot_hum', 'https://www.babylonjs-live.com/assets/sounds/fan.wav', scene, null, {
      loop: true,
      autoplay: true,
      spatialSound: true,
      distanceModel: 'exponential',
      maxDistance: 10,
    });

    scene.onBeforeRenderObservable.add(() => this.update());
  }

  private async loadModel(position: Vector3) {
    const result = await importMeshAsync(ASSETS.ENEMIES.SECURITY_MECH, this.scene);
    this.mesh = result.meshes[0];
    this.mesh.position = position;
    this.mesh.scaling = new Vector3(0.5, 0.5, 0.5);
    this.mesh.checkCollisions = true;
    this.mesh.ellipsoid = new Vector3(0.5, 1, 0.5);
    this.anims = result.animationGroups;
    this.hum?.attachToMesh(this.mesh);
    
    // Default to Idle animation
    this.playAnim('Idle', true);

    this.mesh.metadata = {
      onHit: (damage: number) => {
        this.health -= damage;
        if (this.health <= 0) {
           if (gameState.addXP(100)) this.hud.showLevelUp();
           this.dispose();
        }
      }
    };
  }

  private playAnim(name: string, loop: boolean) {
    const anim = this.anims.find(a => a.name.includes(name));
    if (anim && !anim.isPlaying) {
      this.anims.forEach(a => a.stop());
      anim.start(loop);
    }
  }

  private update(): void {
    if (!this.mesh) return;
    const distToPlayer = Vector3.Distance(this.mesh.position, this.target.position);

    switch (this.state) {
      case AIState.PATROL:
        this.patrol();
        this.playAnim('Walk', true);
        if (distToPlayer < this.detectionRange) {
          this.state = AIState.ALERT;
        }
        break;

      case AIState.ALERT:
        if (this.mesh) this.mesh.lookAt(this.target.position);
        this.playAnim('Idle', true);
        this.applySteering(this.target.position); // Slow drift toward player
        if (distToPlayer < this.attackRange) {
          this.state = AIState.ATTACK;
        } else if (distToPlayer > this.detectionRange) {
          this.state = AIState.PATROL;
        }
        break;

      case AIState.ATTACK:
        if (this.mesh) this.mesh.lookAt(this.target.position);
        this.playAnim('Shoot', true);
        this.applySteering(this.target.position, true); // Maintain distance / arrive
        this.attack();
        if (distToPlayer > this.attackRange) {
          this.state = AIState.ALERT;
          this.setEyeColor(new Color3(1, 0.5, 0));
        }
        break;
    }
  }

  private patrol(): void {
    if (!this.mesh) return;
    this.applySteering(this.patrolTarget, true);
    
    if (Vector3.Distance(this.mesh.position, this.patrolTarget) < 1.5) {
      if (this.waypoints.length > 0) {
        this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
        this.patrolTarget = this.waypoints[this.waypointIndex];
      } else {
        this.patrolTarget = this.getRandomPatrolPoint();
      }
    }
  }

  private applySteering(target: Vector3, arrival = false): void {
    if (!this.mesh) return;
    const desired = target.subtract(this.mesh.position);
    let speed = this.maxSpeed;

    if (arrival) {
      const dist = desired.length();
      if (dist < 3) speed = this.maxSpeed * (dist / 3);
    }

    desired.normalize().scaleInPlace(speed);

    const steer = desired.subtract(this.velocity);
    if (steer.length() > this.maxForce) {
      steer.normalize().scaleInPlace(this.maxForce);
    }

    this.velocity.addInPlace(steer.scale(1/this.mass));
    
    // Apply Y-gravity to keep bot grounded
    this.velocity.y = -0.05;
    
    this.mesh.moveWithCollisions(this.velocity);

    if (this.velocity.length() > 0.01) {
       this.mesh.lookAt(this.mesh.position.add(this.velocity));
    }
  }

  private attack(): void {
    if (!this.mesh) return;
    const now = Date.now();
    if (now - this.lastFireTime > this.fireRate) {
      // Raycast check
      const direction = this.target.position.subtract(this.mesh.position).normalize();
      const ray = new Ray(this.mesh.position, direction, this.attackRange);
      const hit = this.scene.pickWithRay(ray);

      if (hit?.hit && hit.pickedMesh?.metadata?.isPlayer) {
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
    if (!this.mesh) return;
    const mat = (this.mesh.getChildMeshes()[0].material as StandardMaterial);
    mat.emissiveColor = color;
  }

  private triggerMuzzleEffect(): void {
    if (!this.mesh) return;
    const mat = (this.mesh.getChildMeshes()[0].material as StandardMaterial);
    const oldColor = mat.emissiveColor.clone();
    mat.emissiveColor = new Color3(1, 1, 1);
    setTimeout(() => {
      mat.emissiveColor = oldColor;
    }, 50);
  }

  public dispose(): void {
    this.mesh?.dispose();
    this.hum?.dispose();
  }
}
