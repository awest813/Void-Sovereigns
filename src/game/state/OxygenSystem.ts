import { Scene } from '@babylonjs/core';
import { gameState } from './GameState';
import type { HUD } from '../../ui/hud/HUD';

export class OxygenSystem {
  private scene: Scene;
  private hud: HUD;
  private rate = 0.5; // Oxygen units per second
  private isCritical = false;

  constructor(scene: Scene, hud: HUD) {
    this.scene = scene;
    this.hud = hud;
    
    // Reset oxygen at start of mission
    gameState.update({ oxygen: gameState.get().maxOxygen });

    this.scene.onBeforeRenderObservable.add(() => this.update());
  }

  private update(): void {
    const s = gameState.get();
    if (s.currentScene !== 'mission' || s.missionStatus === 'failed') return;

    const delta = this.scene.getEngine().getDeltaTime() * 0.001;
    const newOxygen = Math.max(0, s.oxygen - (this.rate * delta));
    
    gameState.update({ oxygen: newOxygen });

    // HUD Alerts
    if (newOxygen < 25 && !this.isCritical) {
      this.isCritical = true;
      this.hud.showMessage('WARNING: OXYGEN LEVELS CRITICAL', 5000);
    }
    
    if (newOxygen <= 0) {
      this.hud.showMessage('OXYGEN DEPLETED: MISSION FAILED', 5000);
      gameState.update({ missionStatus: 'failed' });
    }
    
    // Update HUD Bar (we'll need to add this to HUD.ts)
    this.hud.updateOxygen(newOxygen, s.maxOxygen);
  }
}
