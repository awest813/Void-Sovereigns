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
  PointLight,
} from '@babylonjs/core';
import type { HealthSystem } from '../state/HealthSystem';
import type { HUD } from '../../ui/hud/HUD';
import { gameState } from '../state/GameState';
import { ASSETS } from '../AssetManifest';
import { importMeshAsync } from '../BabylonAssetLoader';
import { createLocalSound } from '../assets/ProceduralAssets';

export enum AIState {
  PATROL,
  INVESTIGATE,
  PEEK,
  ALERT,
  ATTACK,
  RETREAT,
  STAGGERED,
  DEAD,
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
  private maxHealth = 20;
  private hud: HUD;
  private lastKnownPlayerPosition: Vector3 | null = null;
  private stateEnteredAt = Date.now();
  private staggerDuration = 450;
  private hasAnnouncedAlert = false;
  private suspicion = 0;
  private peekPosition: Vector3 | null = null;
  private muzzleLight: PointLight | null = null;

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
    this.hum = createLocalSound('bot_hum', scene, {
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
        if (this.state === AIState.DEAD) return;
        this.health -= damage;
        this.lastKnownPlayerPosition = this.target.position.clone();
        this.transitionTo(this.health <= 0 ? AIState.DEAD : AIState.STAGGERED);
        if (this.health <= 0) {
          if (gameState.addXP(100)) this.hud.showLevelUp();
          this.dispose();
        }
      }
    };

    this.muzzleLight = new PointLight('bot_muzzle_flash', this.mesh.position.clone(), this.scene);
    this.muzzleLight.diffuse = new Color3(1, 0.65, 0.35);
    this.muzzleLight.range = 7;
    this.muzzleLight.intensity = 0;
  }

  private playAnim(name: string, loop: boolean) {
    const anim = this.anims.find(a => a.name.includes(name));
    if (anim && !anim.isPlaying) {
      this.anims.forEach(a => a.stop());
      anim.start(loop);
    }
  }

  private update(): void {
    if (!this.mesh || this.state === AIState.DEAD) return;
    const delta = this.scene.getEngine().getDeltaTime() * 0.001;
    const distToPlayer = Vector3.Distance(this.mesh.position, this.target.position);
    const hasSightline = distToPlayer < this.detectionRange && this.hasLineOfSight();
    const canSeePlayer = this.updateSuspicion(delta, distToPlayer, hasSightline);

    switch (this.state) {
      case AIState.PATROL:
        this.patrol();
        this.playAnim('Walk', true);
        if (canSeePlayer) {
          this.lastKnownPlayerPosition = this.target.position.clone();
          this.transitionTo(this.suspicion >= 1 ? AIState.ALERT : AIState.PEEK);
        }
        break;

      case AIState.INVESTIGATE:
        this.playAnim('Walk', true);
        if (this.lastKnownPlayerPosition) {
          this.applySteering(this.lastKnownPlayerPosition, true);
          if (Vector3.Distance(this.mesh.position, this.lastKnownPlayerPosition) < 1.5) {
            this.transitionTo(AIState.PATROL);
          }
        } else {
          this.transitionTo(AIState.PATROL);
        }
        if (canSeePlayer) {
          this.lastKnownPlayerPosition = this.target.position.clone();
          this.transitionTo(this.suspicion >= 1 ? AIState.ALERT : AIState.PEEK);
        }
        break;

      case AIState.PEEK:
        this.playAnim('Idle', true);
        this.lastKnownPlayerPosition = hasSightline ? this.target.position.clone() : this.lastKnownPlayerPosition;
        if (!this.peekPosition) this.peekPosition = this.findPeekPosition();
        this.applySteering(this.peekPosition, true);
        this.mesh.lookAt(this.target.position);
        if (this.suspicion >= 1) {
          this.transitionTo(AIState.ALERT);
        } else if (!hasSightline && Date.now() - this.stateEnteredAt > 1800) {
          this.transitionTo(AIState.INVESTIGATE);
        }
        break;

      case AIState.ALERT:
        this.mesh.lookAt(this.target.position);
        this.playAnim('Idle', true);
        this.lastKnownPlayerPosition = canSeePlayer ? this.target.position.clone() : this.lastKnownPlayerPosition;
        this.applySteering(this.target.position);
        if (distToPlayer < this.attackRange && canSeePlayer) {
          this.transitionTo(AIState.ATTACK);
        } else if (!canSeePlayer && Date.now() - this.stateEnteredAt > 1800) {
          this.transitionTo(AIState.INVESTIGATE);
        }
        break;

      case AIState.ATTACK:
        this.mesh.lookAt(this.target.position);
        this.playAnim('Shoot', true);
        this.lastKnownPlayerPosition = canSeePlayer ? this.target.position.clone() : this.lastKnownPlayerPosition;
        if (this.health / this.maxHealth < 0.35 && distToPlayer < 5) {
          this.transitionTo(AIState.RETREAT);
          break;
        }
        this.applySteering(this.target.position, true);
        this.attack();
        if (!canSeePlayer) {
          this.transitionTo(AIState.INVESTIGATE);
        } else if (distToPlayer > this.attackRange) {
          this.transitionTo(AIState.ALERT);
        }
        break;

      case AIState.RETREAT:
        this.playAnim('Walk', true);
        this.retreatFromPlayer();
        if (distToPlayer > this.attackRange) {
          this.transitionTo(canSeePlayer ? AIState.ALERT : AIState.INVESTIGATE);
        }
        break;

      case AIState.STAGGERED:
        this.velocity.scaleInPlace(0.5);
        this.playAnim('Idle', true);
        if (Date.now() - this.stateEnteredAt > this.staggerDuration) {
          this.transitionTo(canSeePlayer ? AIState.ATTACK : AIState.INVESTIGATE);
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
    let speed = this.maxSpeed * this.getExtractionPressureMultiplier();

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
        this.playerHealth.takeDamage(this.damage * this.getExtractionPressureMultiplier());
        this.triggerMuzzleEffect();
      }
      this.lastFireTime = now;
    }
  }

  private hasLineOfSight(): boolean {
    if (!this.mesh) return false;
    const origin = this.mesh.position.add(new Vector3(0, 0.8, 0));
    const direction = this.target.position.subtract(origin).normalize();
    const ray = new Ray(origin, direction, this.detectionRange);
    const hit = this.scene.pickWithRay(ray, (mesh) => mesh !== this.mesh && (mesh.metadata?.isPlayer || mesh.checkCollisions));
    return Boolean(hit?.hit && hit.pickedMesh?.metadata?.isPlayer);
  }

  private updateSuspicion(delta: number, distToPlayer: number, hasSightline: boolean): boolean {
    const exposureGetter = this.target.metadata?.getExposureScore as (() => number) | undefined;
    const exposure = exposureGetter ? exposureGetter() : 1;
    const rangeFactor = Math.max(0.15, 1 - distToPlayer / this.detectionRange);
    const extractionPressure = this.getExtractionPressureMultiplier();

    if (hasSightline) {
      this.suspicion += delta * exposure * (0.55 + rangeFactor) * extractionPressure;
    } else if (this.state !== AIState.INVESTIGATE) {
      this.suspicion -= delta * 0.28;
    }

    this.suspicion = Math.max(0, Math.min(1.35, this.suspicion));
    return this.suspicion > 0.28;
  }

  private getExtractionPressureMultiplier(): number {
    const missionStatus = gameState.get().missionStatus;
    return missionStatus === 'objectiveComplete' || missionStatus === 'extractionAvailable' ? 1.35 : 1;
  }

  private findPeekPosition(): Vector3 {
    if (!this.mesh) return this.startPosition.clone();
    const toPlayer = this.target.position.subtract(this.mesh.position);
    const side = Vector3.Cross(toPlayer.normalize(), Vector3.Up()).normalize();
    return this.mesh.position.add(side.scale(Math.random() > 0.5 ? 1.6 : -1.6));
  }

  private retreatFromPlayer(): void {
    if (!this.mesh) return;
    const away = this.mesh.position.subtract(this.target.position);
    away.y = 0;
    if (away.lengthSquared() < 0.001) {
      away.copyFrom(this.getRandomPatrolPoint().subtract(this.mesh.position));
    }
    const retreatTarget = this.mesh.position.add(away.normalize().scale(4));
    this.applySteering(retreatTarget);
  }

  private transitionTo(next: AIState): void {
    if (this.state === next || this.state === AIState.DEAD) return;
    this.state = next;
    this.stateEnteredAt = Date.now();
    if (next !== AIState.PEEK) this.peekPosition = null;

    switch (next) {
      case AIState.PATROL:
        this.setEyeColor(new Color3(0.1, 0.4, 0.8));
        this.hasAnnouncedAlert = false;
        break;
      case AIState.INVESTIGATE:
        this.setEyeColor(new Color3(1, 0.5, 0));
        break;
      case AIState.PEEK:
        this.setEyeColor(new Color3(0.95, 0.22, 0.05));
        this.hud.showMessage('SENSOR SHADOW MOVEMENT', 1200);
        break;
      case AIState.ALERT:
        this.setEyeColor(new Color3(1, 0.5, 0));
        if (!this.hasAnnouncedAlert) {
          this.hud.showMessage('HOSTILE SENSOR CONTACT', 1800);
          this.hasAnnouncedAlert = true;
        }
        break;
      case AIState.ATTACK:
        this.setEyeColor(new Color3(1, 0, 0));
        break;
      case AIState.RETREAT:
        this.setEyeColor(new Color3(0.8, 0.2, 1));
        this.hud.showMessage('HOSTILE REPOSITIONING', 1500);
        break;
      case AIState.STAGGERED:
        this.setEyeColor(new Color3(1, 1, 1));
        break;
      case AIState.DEAD:
        break;
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
    if (this.muzzleLight) {
      this.muzzleLight.position.copyFrom(this.mesh.position.add(new Vector3(0, 0.9, 0)));
      this.muzzleLight.intensity = 4;
    }
    setTimeout(() => {
      mat.emissiveColor = oldColor;
      if (this.muzzleLight) this.muzzleLight.intensity = 0;
    }, 50);
  }

  public forceAlert(position = this.target.position): void {
    if (this.state === AIState.DEAD) return;
    this.lastKnownPlayerPosition = position.clone();
    this.suspicion = 1.1;
    this.transitionTo(AIState.ALERT);
  }

  public dispose(): void {
    this.transitionTo(AIState.DEAD);
    this.mesh?.dispose();
    this.hum?.dispose();
    this.muzzleLight?.dispose();
  }
}
