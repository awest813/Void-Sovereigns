import {
  Scene,
  Vector3,
  TransformNode,
  Color3,
  Ray,
  AbstractMesh,
  StandardMaterial
} from '@babylonjs/core';
import type { HealthSystem } from '../state/HealthSystem';
import type { HUD } from '../../ui/hud/HUD';
import { gameState } from '../state/GameState';
import { ASSETS } from '../AssetManifest';
import { TABLES } from '../state/LootTable';
import { importMeshAsync } from '../BabylonAssetLoader';

export class BossCenturion {
  private scene: Scene;
  private mesh: AbstractMesh | null = null;
  private target: TransformNode;
  private playerHealth: HealthSystem;
  private hud: HUD;

  private health = 500;
  private maxHealth = 500;
  private isDead = false;

  private velocity = Vector3.Zero();
  private maxSpeed = 0.04; // Slower but relentless
  private maxForce = 0.03;

  private lastFireTime = 0;
  private fireRate = 400; // Fast volley
  private pulseCooldown = 5000; // 5 seconds
  private lastPulseTime = 0;
  private phase: 1 | 2 | 3 = 1;
  private isChargingPulse = false;
  private pulseChargeStartedAt = 0;
  private pulseChargeMs = 900;

  constructor(scene: Scene, position: Vector3, target: TransformNode, playerHealth: HealthSystem, hud: HUD) {
    this.scene = scene;
    this.target = target;
    this.playerHealth = playerHealth;
    this.hud = hud;

    this.loadModel(position);
    scene.onBeforeRenderObservable.add(() => this.update());
  }

  private async loadModel(position: Vector3) {
    const result = await importMeshAsync(ASSETS.ENEMIES.SECURITY_MECH, this.scene);
    this.mesh = result.meshes[0];
    this.mesh.position = position;
    this.mesh.scaling = new Vector3(1.2, 1.2, 1.2); // BOSS SCALE
    
    // Set BOSS visual style
    this.mesh.getChildMeshes().forEach(m => {
        if (m.material instanceof StandardMaterial) {
            m.material.emissiveColor = new Color3(1, 0, 0); // THREAT COLOR
        }
    });

    this.mesh.metadata = {
      onHit: (damage: number) => {
        if (this.isDead) return;
        this.health -= damage;
        this.hud.updateBossHealth(this.health / this.maxHealth);
        this.updatePhase();
        
        if (this.health <= 0) {
           this.die();
        }
      }
    };

    this.hud.showBossHealth('Centurion Mk I', 1.0);

    // Play initial idle
    result.animationGroups.find(a => a.name.includes('Idle'))?.start(true);
  }

  private update() {
    if (!this.mesh || this.isDead) return;

    const dist = Vector3.Distance(this.mesh.position, this.target.position);
    this.mesh.lookAt(this.target.position);

    // 1. Steering Pursuit
    if (dist > 5) {
        this.applySteering(this.target.position);
    }

    // 2. Shield Pulse (Knockback)
    const now = Date.now();
    if (!this.isChargingPulse && dist < 5 && now - this.lastPulseTime > this.pulseCooldown) {
        this.beginShieldPulse();
    }

    if (this.isChargingPulse && now - this.pulseChargeStartedAt > this.pulseChargeMs) {
        this.shieldPulse();
        this.lastPulseTime = now;
        this.isChargingPulse = false;
    }

    // 3. Attack
    if (!this.isChargingPulse && dist < 15 && now - this.lastFireTime > this.fireRate && this.hasLineOfSight()) {
        this.attack();
        this.lastFireTime = now;
    }
  }

  private applySteering(target: Vector3) {
    if (!this.mesh) return;
    const desired = target.subtract(this.mesh.position).normalize().scale(this.maxSpeed);
    const steer = desired.subtract(this.velocity);
    if (steer.length() > this.maxForce) steer.normalize().scaleInPlace(this.maxForce);
    
    this.velocity.addInPlace(steer);
    this.mesh.position.addInPlace(this.velocity);
  }

  private shieldPulse() {
    if (!this.mesh) return;
    this.hud.showMessage("KINETIC PULSE RELEASED", 1600);

    // Physics Pushback logic
    const pushDir = this.target.position.subtract(this.mesh.position).normalize();
    // We apply it directly to the player position for simplicity in this prototype
    this.target.position.addInPlace(pushDir.scale(5)); 
    this.playerHealth.takeDamage(this.phase >= 3 ? 25 : 15);
  }

  private attack() {
    if (!this.mesh) return;
    // Shooting sound & logic
    const origin = this.mesh.position.add(new Vector3(0, 1, 0));
    const ray = new Ray(origin, this.target.position.subtract(origin).normalize(), 20);
    const hit = this.scene.pickWithRay(ray, (mesh) => mesh !== this.mesh && (mesh.metadata?.isPlayer || mesh.checkCollisions));
    if (hit?.hit && hit.pickedMesh?.metadata?.isPlayer) {
      this.playerHealth.takeDamage(this.phase >= 2 ? 8 : 5);
    }
  }

  private beginShieldPulse(): void {
    this.isChargingPulse = true;
    this.pulseChargeStartedAt = Date.now();
    this.velocity.scaleInPlace(0.25);
    this.hud.showMessage("WARNING: KINETIC PULSE CHARGING", this.pulseChargeMs);
    this.setEmissive(new Color3(1, 0.8, 0));
  }

  private updatePhase(): void {
    const healthPercent = this.health / this.maxHealth;
    const nextPhase: 1 | 2 | 3 = healthPercent < 0.33 ? 3 : healthPercent < 0.66 ? 2 : 1;
    if (nextPhase === this.phase) return;

    this.phase = nextPhase;
    this.maxSpeed = this.phase === 3 ? 0.07 : this.phase === 2 ? 0.055 : 0.04;
    this.fireRate = this.phase === 3 ? 260 : this.phase === 2 ? 330 : 400;
    this.pulseCooldown = this.phase === 3 ? 3600 : this.phase === 2 ? 4400 : 5000;
    this.hud.showMessage(`CENTURION PHASE ${this.phase}: THREAT ESCALATING`, 2500);
    this.setEmissive(this.phase === 3 ? new Color3(1, 0.1, 0.9) : new Color3(1, 0.25, 0));
  }

  private hasLineOfSight(): boolean {
    if (!this.mesh) return false;
    const origin = this.mesh.position.add(new Vector3(0, 1, 0));
    const direction = this.target.position.subtract(origin).normalize();
    const ray = new Ray(origin, direction, 20);
    const hit = this.scene.pickWithRay(ray, (mesh) => mesh !== this.mesh && (mesh.metadata?.isPlayer || mesh.checkCollisions));
    return Boolean(hit?.hit && hit.pickedMesh?.metadata?.isPlayer);
  }

  private setEmissive(color: Color3): void {
    this.mesh?.getChildMeshes().forEach(m => {
      if (m.material instanceof StandardMaterial) {
        m.material.emissiveColor = color;
      }
    });
  }

  private die() {
    this.isDead = true;
    this.hud.showMessage("PRIMAL ENTITY NEUTRALIZED. APEX LOOT SECURED.", 5000);
    
    // Boss Loot
    const item = TABLES.BOSS.roll();
    if (item) {
        const inv = gameState.get().inventory;
        gameState.update({ 
            inventory: [...inv, { id: item.id, name: item.name, value: item.baseValue }] 
        });
        this.hud.showMessage(`RELIC ACQUIRED: ${item.name}`);
    }

    if (gameState.addXP(2500)) this.hud.showLevelUp();
    this.mesh?.dispose();
  }

  public dispose() {
    this.mesh?.dispose();
  }
}
