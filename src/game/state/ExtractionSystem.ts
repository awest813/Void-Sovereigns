import { Scene, Vector3, Mesh } from '@babylonjs/core';
import { gameState } from './GameState';
import { transitionMission } from './MissionState';
import type { HUD } from '../../ui/hud/HUD';
import { SecurityBot } from '../entities/SecurityBot';
import type { HealthSystem } from './HealthSystem';

export class ExtractionSystem {
  private scene: Scene;
  private hud: HUD;
  private extractPoint: Mesh;
  private health: HealthSystem;
  
  private isExtracting = false;
  private progress = 0;
  private duration = 15; // 15 seconds to hold
  private spawnTime = 5;
  private lastSpawn = 0;

  constructor(scene: Scene, hud: HUD, extractPoint: Mesh, health: HealthSystem) {
    this.scene = scene;
    this.hud = hud;
    this.extractPoint = extractPoint;
    this.health = health;

    this.scene.onBeforeRenderObservable.add(() => this.update());
  }

  private update(): void {
    const s = gameState.get();
    if (
      s.currentScene !== 'mission' ||
      (s.missionStatus !== 'objectiveComplete' && s.missionStatus !== 'extractionAvailable')
    ) {
      return;
    }

    const playerPos = this.scene.activeCamera?.position;
    if (!playerPos) return;

    const dist = Vector3.Distance(playerPos, this.extractPoint.position);
    
    if (dist < 3) {
      if (!this.isExtracting) {
        this.isExtracting = true;
        if (s.missionStatus === 'objectiveComplete') {
          gameState.update({
            missionStatus: transitionMission(s.missionStatus, 'extractionAvailable'),
          });
        }
        this.hud.showMessage('ESTABLISHING UPLINK... HOLD THE ZONE', 3000);
      }
      
      const delta = this.scene.getEngine().getDeltaTime() * 0.001;
      this.progress += delta;
      
      this.hud.showMessage(`EXTRACTION PROGRESS: ${Math.floor((this.progress / this.duration) * 100)}%`, 500);

      // Spawn aggressive drone during extraction
      if (this.progress > this.lastSpawn + this.spawnTime) {
        this.lastSpawn = this.progress;
        this.spawnAmbushBot();
      }

      if (this.progress >= this.duration) {
        this.completeExtraction();
      }
    } else if (this.isExtracting) {
       this.isExtracting = false;
       this.progress = Math.max(0, this.progress - 0.5); // Regress progress if they leave
       this.hud.showMessage('UPLINK LOST: RETURN TO EXTRACTION ZONE', 3000);
    }
  }

  private spawnAmbushBot(): void {
    const spawnPos = this.extractPoint.position.add(new Vector3(
      (Math.random()-0.5)*10,
      1,
      (Math.random()-0.5)*10
    ));
    new SecurityBot(this.scene, spawnPos, this.scene.activeCamera as any, this.health, this.hud);
    this.hud.showMessage('WARNING: SECURITY REINFORCEMENTS DETECTED', 2000);
  }

  private completeExtraction(): void {
    const s = gameState.get();
    gameState.update({
      missionStatus: transitionMission(s.missionStatus, 'success'),
    });
  }
}
