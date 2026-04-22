import { Scene } from '@babylonjs/core';
import type { HUD } from '../../ui/hud/HUD';
import { createLocalSound } from '../assets/ProceduralAssets';

const CHATTER_LINES = [
  'Mission Control: Check your oxygen levels.',
  'Ops: Multiple bio-signatures detected in your sector.',
  'Tech: Interference detected on the primary uplink.',
  'Control: Be advised, Sovereign patrols are increasing.',
  'Ops: Extraction airlock is on standby.',
  'Static: ...receiving signal... [unintelligible] ...',
];

export class RadioChatter {
  private scene: Scene;
  private hud: HUD;
  private nextChatterTime = 0;

  constructor(scene: Scene, hud: HUD) {
    this.scene = scene;
    this.hud = hud;
    this.nextChatterTime = Date.now() + 10000 + Math.random() * 20000;

    this.scene.onBeforeRenderObservable.add(() => this.update());
  }

  private update(): void {
    const now = Date.now();
    if (now > this.nextChatterTime) {
      this.playChatter();
      this.nextChatterTime = now + 15000 + Math.random() * 30000;
    }
  }

  private playChatter(): void {
    const line = CHATTER_LINES[Math.floor(Math.random() * CHATTER_LINES.length)];
    this.hud.showMessage(`RADIO: ${line}`, 4000);
    
    // Play a short static burst sound
    const staticBurst = createLocalSound('static', this.scene, {
      volume: 0.1,
      autoplay: true,
    });
    setTimeout(() => staticBurst.dispose(), 1000);
  }
}
