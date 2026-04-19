import {
  AdvancedDynamicTexture,
  TextBlock,
  Ellipse,
  Control,
} from '@babylonjs/gui';
import type { Interactable } from '../../game/interactions/Interactable';

export class HUD {
  private texture: AdvancedDynamicTexture;
  private promptText: TextBlock;
  private crosshair: Ellipse;

  constructor() {
    this.texture = AdvancedDynamicTexture.CreateFullscreenUI('hud');

    // Crosshair
    this.crosshair = new Ellipse('crosshair');
    this.crosshair.width = '6px';
    this.crosshair.height = '6px';
    this.crosshair.color = '#66ffcc';
    this.crosshair.thickness = 2;
    this.crosshair.background = '';
    this.texture.addControl(this.crosshair);

    // Interaction prompt
    this.promptText = new TextBlock('prompt');
    this.promptText.text = '';
    this.promptText.color = '#cceeee';
    this.promptText.fontSize = 18;
    this.promptText.fontFamily = '"Courier New", monospace';
    this.promptText.top = '40px';
    this.promptText.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.promptText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.promptText.outlineWidth = 2;
    this.promptText.outlineColor = '#000000';
    this.texture.addControl(this.promptText);
  }

  updateInteractionTarget(target: Interactable | null): void {
    if (target) {
      this.promptText.text = `[E] ${target.promptText}`;
      this.crosshair.color = '#ffcc44';
    } else {
      this.promptText.text = '';
      this.crosshair.color = '#66ffcc';
    }
  }

  showMessage(text: string, durationMs = 3000): void {
    this.promptText.text = text;
    setTimeout(() => {
      if (this.promptText.text === text) {
        this.promptText.text = '';
      }
    }, durationMs);
  }

  dispose(): void {
    this.texture.dispose();
  }
}
