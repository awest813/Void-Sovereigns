import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  PointLight,
  Animation,
  ActionManager,
  ExecuteCodeAction,
  Ray,
  ParticleSystem,
  Texture,
  Color4,
} from '@babylonjs/core';
import type { FirstPersonController } from '../../engine/player/FirstPersonController';
import { gameState } from '../state/GameState';
import { GravityGrenade } from './GravityGrenade';

export class WeaponSystem {
  private scene: Scene;
  private player: FirstPersonController;
  private lastFireTime = 0;
  private fireRate = 150; // ms

  constructor(scene: Scene, player: FirstPersonController) {
    this.scene = scene;
    this.player = player;

    this.scene.onPointerDown = (evt) => {
      if (evt.button === 0) { // Left-click
        this.fire();
      }
    };
  }

  public fire(): void {
    const weaponType = gameState.get().equippedWeapon;
    const now = Date.now();

    // Set fire rate based on weapon
    switch(weaponType) {
      case 'smg': 
        this.fireRate = 80; 
        this.shakeCamera(0.02);
        break;
      case 'shotgun': 
        this.fireRate = 600; 
        this.shakeCamera(0.1);
        break;
      default: 
        this.fireRate = 150; 
        this.shakeCamera(0.04);
        break;
    }

    if (now - this.lastFireTime < this.fireRate) return;
    this.lastFireTime = now;

    switch (weaponType) {
      case 'shotgun':
        for (let i = 0; i < 8; i++) {
          this.performRaycast(0.1); // High spread
        }
        break;
      case 'smg':
        this.performRaycast(0.05); // Moderate spread
        break;
      default:
        this.performRaycast(0.01); // Accurate
        break;
    }

    this.createMuzzleFlash();
  }

  private performRaycast(spread: number): void {
    const ray = this.player.getForwardRay(50);
    
    // Apply spread
    ray.direction.x += (Math.random() - 0.5) * spread;
    ray.direction.y += (Math.random() - 0.5) * spread;
    ray.direction.z += (Math.random() - 0.5) * spread;

    const hit = this.scene.pickWithRay(ray);

    if (hit?.hit && hit.pickedMesh) {
      this.createImpactEffect(hit.pickedPoint!);
      
      // Basic damage bridge
      const mesh = hit.pickedMesh;
      if (mesh.metadata?.onHit) {
        mesh.metadata.onHit(gameState.get().equipment.weaponDamage);
      }
    }
  }

  private createMuzzleFlash(): void {
    const flash = new PointLight('muzzle_flash', this.player.camera.position, this.scene);
    flash.diffuse = new Color3(1, 0.8, 0.3);
    flash.intensity = 2;
    flash.range = 5;

    setTimeout(() => {
      flash.dispose();
    }, 50);
  }

  public melee(): void {
    const ray = this.player.getForwardRay(2.5);
    const hit = this.scene.pickWithRay(ray);
    
    this.shakeCamera(0.15); // Hard shake

    if (hit?.hit && hit.pickedMesh) {
      const mesh = hit.pickedMesh;
      // Many bot parts are sub-meshes, check parent or name
      const target = mesh.parent || mesh;
      if (target.name.includes('bot') || target.name.includes('turret')) {
         if (target.metadata?.onHit) {
            target.metadata.onHit(50);
         }
      }
    }
  }

  public throwGrenade(): void {
    const pos = this.player.camera.position.clone();
    const dir = this.player.camera.getForwardRay().direction;
    new GravityGrenade(this.scene, pos, dir);
  }

  private shakeCamera(intensity: number): void {
    const cam = this.player.camera;
    const originalPos = cam.position.clone();
    
    cam.position.addInPlace(new Vector3(
      (Math.random()-0.5)*intensity,
      (Math.random()-0.5)*intensity,
      (Math.random()-0.5)*intensity
    ));

    setTimeout(() => {
       cam.position.copyFrom(originalPos);
    }, 30);
  }

  private createImpactEffect(position: Vector3): void {
    const ps = new ParticleSystem('impact_sparks', 20, this.scene);
    ps.particleTexture = new Texture('https://www.babylonjs-live.com/assets/textures/flare.png', this.scene);
    ps.emitter = position;
    ps.minEmitPower = 1;
    ps.maxEmitPower = 3;
    ps.color1 = new Color4(1, 0.9, 0.5, 1);
    ps.color2 = new Color4(1, 0.5, 0.2, 1);
    ps.minSize = 0.05;
    ps.maxSize = 0.15;
    ps.minLifeTime = 0.1;
    ps.maxLifeTime = 0.3;
    ps.emitRate = 100;
    ps.manualEmitCount = 10;
    ps.blendMode = ParticleSystem.BLENDMODE_ONEONE;
    ps.gravity = new Vector3(0, -9.81, 0);
    ps.start();

    setTimeout(() => ps.dispose(), 500);
  }
}
