import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  TransformNode,
  Ray,
} from '@babylonjs/core';
import type { HealthSystem } from '../state/HealthSystem';
import type { HUD } from '../../ui/hud/HUD';
import { gameState } from '../state/GameState';

export class Turret {
  private scene: Scene;
  private base: Mesh;
  private head: Mesh;
  private target: TransformNode;
  private playerHealth: HealthSystem;
  
  private range = 15;
  private fireRate = 1000; // ms
  private damage = 10;
  private lastFireTime = 0;
  private hud: HUD;
  private health = 30;

  constructor(scene: Scene, position: Vector3, target: TransformNode, playerHealth: HealthSystem, hud: HUD) {
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
        this.health -= damage;
        if (this.health <= 0) {
           if (gameState.addXP(200)) this.hud.showLevelUp();
           this.dispose();
        }
      }
    };

    // Tracking loop
    scene.onBeforeRenderObservable.add(() => this.update());
  }

  private update(): void {
    const dist = Vector3.Distance(this.head.position, this.target.position);
    
    if (dist < this.range) {
      // Look at player
      this.head.lookAt(this.target.position);
      
      // Shooting logic
      const now = Date.now();
      if (now - this.lastFireTime > this.fireRate) {
        this.fire();
        this.lastFireTime = now;
      }
    }
  }

  private fire(): void {
    // Raycast to check line of sight
    const direction = this.target.position.subtract(this.head.position).normalize();
    const ray = new Ray(this.head.position, direction, this.range);
    const hit = this.scene.pickWithRay(ray);

    // If we hit the player or something very close to player
    if (hit?.hit && hit.distance < this.range) {
       // For a prototype, if we're looking at them and they're in range, we hit. 
       // In a real game we'd check if picking result is the player mesh.
       this.playerHealth.takeDamage(this.damage);
       this.triggerMuzzleEffect();
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
    this.base.dispose();
    this.head.dispose();
  }
}
