import {
  Scene,
  Vector3,
  StandardMaterial,
  Color3,
  PointLight,
  ParticleSystem,
  Color4,
  AbstractMesh,
} from '@babylonjs/core';
import type { FirstPersonController } from '../../engine/player/FirstPersonController';
import { gameState } from '../state/GameState';
import { GravityGrenade } from './GravityGrenade';
import { ASSETS } from '../AssetManifest';
import { HUD } from '../../ui/hud/HUD';
import { importMeshAsync } from '../BabylonAssetLoader';
import { getParticleTexture } from '../assets/ProceduralAssets';

export type WeaponRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export interface WeaponStats {
  damage: number;
  fireRate: number;
  recoil: number;
  rarity: WeaponRarity;
  color: Color3;
}

export class WeaponSystem {
  private scene: Scene;
  private player: FirstPersonController;
  private lastFireTime = 0;
  private weaponMesh: AbstractMesh | null = null;
  private currentModelType: string | null = null;
  private muzzleFlash: PointLight | null = null;
  private hud: HUD;

  private stats: WeaponStats = {
    damage: 10,
    fireRate: 200,
    recoil: 0.05,
    rarity: 'COMMON',
    color: new Color3(1, 1, 1)
  };

  private bobTime = 0;
  private recoilOffset = Vector3.Zero();
  
  private currentMag: Record<string, number> = {
    pistol: 12,
    shotgun: 4,
    smg: 30
  };
  private maxMag: Record<string, number> = {
    pistol: 12,
    shotgun: 4,
    smg: 30
  };
  private isReloading = false;

  constructor(scene: Scene, player: FirstPersonController, hud: HUD) {
    this.scene = scene;
    this.player = player;
    this.hud = hud;

    this.scene.onPointerDown = (evt) => {
      if (evt.button === 0) this.fire();
    };

    scene.onBeforeRenderObservable.add(() => this.update());

    this.muzzleFlash = new PointLight('muzzle_flash', Vector3.Zero(), this.scene);
    this.muzzleFlash.intensity = 0;
    this.muzzleFlash.diffuse = new Color3(1, 0.8, 0.4);
    this.muzzleFlash.range = 5;

    this.scene.onKeyboardObservable.add((info) => {
      if (info.type === 1) {
        if (info.event.keyCode === 49) this.switchWeapon('pistol');
        if (info.event.keyCode === 50) this.switchWeapon('shotgun');
        if (info.event.keyCode === 51) this.switchWeapon('smg');
        if (info.event.keyCode === 82) this.reload(); // 'R' to reload
      }
    });

    this.refreshStats();
  }

  private refreshStats() {
    // Determine rarity based on progression or random (Mocked for current session)
    const level = gameState.get().level;
    if (level > 10) this.stats.rarity = 'LEGENDARY';
    else if (level > 5) this.stats.rarity = 'EPIC';
    else if (level > 2) this.stats.rarity = 'RARE';

    // Apply modifiers
    const rarityMod = this.stats.rarity === 'LEGENDARY' ? 2.5 : (this.stats.rarity === 'EPIC' ? 1.8 : 1.2);
    this.stats.damage = (gameState.get().equipment.weaponDamage || 10) * rarityMod;
    
    switch(this.stats.rarity) {
       case 'LEGENDARY': this.stats.color = new Color3(1, 0.8, 0); break;
       case 'EPIC': this.stats.color = new Color3(0.6, 0, 1); break;
       case 'RARE': this.stats.color = new Color3(0, 0.5, 1); break;
       default: this.stats.color = new Color3(1, 1, 1); break;
    }
  }

  private update(): void {
    const weaponType = gameState.get().equippedWeapon;
    if (weaponType !== this.currentModelType) {
      this.loadWeaponModel(weaponType);
    }

    if (this.weaponMesh) {
       this.applySwayAndRecoil();
    }
  }

  private applySwayAndRecoil() {
    const engine = this.scene.getEngine();
    const delta = engine.getDeltaTime() / 1000;
    
    // 1. Procedural Bobbing
    this.bobTime += delta * 8;
    const isMoving = this.player.camera.cameraDirection.length() > 0.001;
    const bobY = isMoving ? Math.sin(this.bobTime) * 0.005 : 0;
    const bobX = isMoving ? Math.cos(this.bobTime * 0.5) * 0.003 : 0;

    // 2. Target Position with Draw and Recoil
    const targetPos = new Vector3(0.25 + bobX, -0.4 + bobY, 0.6).add(this.recoilOffset);
    if (this.weaponMesh) {
       this.weaponMesh.position = Vector3.Lerp(this.weaponMesh.position, targetPos, 0.1);
    }
    
    // 3. Recoil Recovery
    this.recoilOffset = Vector3.Lerp(this.recoilOffset, Vector3.Zero(), 0.15);

    // 4. Muzzle light sync
    if (this.muzzleFlash) {
       this.muzzleFlash.position.copyFrom(this.player.camera.position.add(this.player.camera.getForwardRay(0.8).direction));
       this.muzzleFlash.intensity = Math.max(0, this.muzzleFlash.intensity - 0.5);
    }
  }

  private async loadWeaponModel(type: 'pistol' | 'shotgun' | 'smg') {
    if (this.weaponMesh) this.weaponMesh.dispose();
    this.currentModelType = type;
    this.refreshStats();

    const path = ASSETS.WEAPONS[type.toUpperCase() as keyof typeof ASSETS.WEAPONS];
    const result = await importMeshAsync(path, this.scene);
    this.weaponMesh = result.meshes[0];
    this.weaponMesh.parent = this.player.camera;
    this.weaponMesh.position = new Vector3(0.25, -1.2, 0.6);
    this.weaponMesh.rotation = new Vector3(0, Math.PI, 0); 
    this.weaponMesh.scaling = new Vector3(0.4, 0.4, 0.4);

    // Apply rarity emission
    this.weaponMesh.getChildMeshes().forEach(m => {
        if (m.material instanceof StandardMaterial) {
            m.material.emissiveColor = this.stats.color.scale(0.3);
        }
    });

    this.updateHudAmmo();
  }

  public switchWeapon(type: 'pistol' | 'shotgun' | 'smg') {
     if (type === this.currentModelType) return;
     gameState.update({ equippedWeapon: type });
  }

  public fire(): void {
    const weaponType = gameState.get().equippedWeapon;
    const now = Date.now();

    if (this.isReloading) return;
    if (this.currentMag[weaponType] <= 0) {
      this.reload();
      return;
    }

    const fireRate = weaponType === 'smg' ? 100 : (weaponType === 'shotgun' ? 700 : 250);
    if (now - this.lastFireTime < fireRate) return;
    this.lastFireTime = now;
    this.currentMag[weaponType]--;

    // Apply Kickback (Recoil)
    this.recoilOffset = new Vector3(0, 0, -0.15); // Kick weapon back
    this.shakeCamera(weaponType === 'shotgun' ? 0.08 : 0.03);

    switch (weaponType) {
      case 'shotgun':
        for (let i = 0; i < 10; i++) this.performRaycast(0.15);
        break;
      case 'smg':
        this.performRaycast(0.08);
        break;
      default:
        this.performRaycast(0.01);
        break;
    }

    this.createMuzzleFlash();
    this.updateHudAmmo();
  }

  private performRaycast(spread: number): void {
    const adjustedSpread = spread * this.player.getAccuracyPenalty(this.scene);
    const ray = this.player.getForwardRay(50);
    ray.direction.x += (Math.random() - 0.5) * adjustedSpread;
    ray.direction.y += (Math.random() - 0.5) * adjustedSpread;
    ray.direction.z += (Math.random() - 0.5) * adjustedSpread;

    const hit = this.scene.pickWithRay(ray);
    if (hit?.hit && hit.pickedMesh) {
      this.createImpactEffect(hit.pickedPoint!);
      const mesh = hit.pickedMesh;
      
      // BOSS/ENEMY FLASH ON HIT
      if (mesh.material instanceof StandardMaterial) {
          const original = mesh.material.emissiveColor.clone();
          mesh.material.emissiveColor = new Color3(1, 1, 1);
          setTimeout(() => { if (mesh.material) (mesh.material as any).emissiveColor = original; }, 50);
      }

      if (mesh.metadata?.onHit) {
        mesh.metadata.onHit(this.stats.damage);
      }
    }
  }

  public melee(): void {
    const ray = this.player.getForwardRay(2);
    const hit = this.scene.pickWithRay(ray);
    if (hit?.hit && hit.pickedMesh) {
       const mesh = hit.pickedMesh;
       if (mesh.metadata?.onHit) {
          mesh.metadata.onHit(this.stats.damage * 2);
       }
    }
  }

  public throwGrenade(): void {
     new GravityGrenade(this.scene, this.player.camera.position, this.player.camera.getForwardRay(1).direction.scale(0.5));
  }

  public reload(): void {
     const weaponType = gameState.get().equippedWeapon;
     const availableAmmo = gameState.get().ammo[weaponType];
     const needed = this.maxMag[weaponType] - this.currentMag[weaponType];

     if (this.isReloading || needed <= 0 || availableAmmo <= 0) return;

     this.isReloading = true;
     
     // Procedural reload animation (drop weapon)
     const originalPos = this.weaponMesh?.position.clone() || Vector3.Zero();
     if (this.weaponMesh) this.weaponMesh.position.y -= 0.5;

     setTimeout(() => {
        const toReload = Math.min(needed, availableAmmo);
        const newAmmo = { ...gameState.get().ammo };
        newAmmo[weaponType] -= toReload;
        gameState.update({ ammo: newAmmo });
        
        this.currentMag[weaponType] += toReload;
        this.isReloading = false;
        if (this.weaponMesh) this.weaponMesh.position.copyFrom(originalPos);
        this.updateHudAmmo();
     }, 1500); // 1.5s reload
  }

  private updateHudAmmo(): void {
     const weaponType = gameState.get().equippedWeapon;
     this.hud.updateAmmo(this.currentMag[weaponType], gameState.get().ammo[weaponType]);
  }

  private createMuzzleFlash(): void {
    if (this.muzzleFlash) this.muzzleFlash.intensity = 3.0;
  }

  private shakeCamera(intensity: number): void {
    const cam = this.player.camera;
    const originalPos = cam.position.clone();
    cam.position.addInPlace(new Vector3((Math.random()-0.5)*intensity, (Math.random()-0.5)*intensity, (Math.random()-0.5)*intensity));
    setTimeout(() => cam.position.copyFrom(originalPos), 40);
  }

  private createImpactEffect(position: Vector3): void {
    const ps = new ParticleSystem('impact_sparks', 10, this.scene);
    ps.particleTexture = getParticleTexture(this.scene);
    ps.emitter = position;
    ps.color1 = new Color4(1, 0.4, 0, 1);
    ps.manualEmitCount = 5;
    ps.start();
    setTimeout(() => ps.dispose(), 300);
  }
}
