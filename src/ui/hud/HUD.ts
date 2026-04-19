import {
  AdvancedDynamicTexture,
  TextBlock,
  Ellipse,
  Rectangle,
  Control,
} from '@babylonjs/gui';
import type { Interactable } from '../../game/interactions/Interactable';

export class HUD {
  private texture: AdvancedDynamicTexture;
  private promptText: TextBlock;
  private crosshair: Ellipse;
  private statusLabel: TextBlock;
  private statusMission: TextBlock;
  private statusPanel: Rectangle;

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

    // Mission status panel — top-right corner
    this.statusPanel = new Rectangle('statusPanel');
    this.statusPanel.width = '240px';
    this.statusPanel.height = '52px';
    this.statusPanel.cornerRadius = 3;
    this.statusPanel.color = '#44ffcc44';
    this.statusPanel.thickness = 1;
    this.statusPanel.background = '#0a0e1488';
    this.statusPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this.statusPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.statusPanel.top = '12px';
    this.statusPanel.paddingRight = '12px';
    this.statusPanel.isVisible = false;
    this.texture.addControl(this.statusPanel);

    this.statusLabel = new TextBlock('statusLabel');
    this.statusLabel.text = 'MISSION';
    this.statusLabel.color = '#44ffcc';
    this.statusLabel.fontSize = 10;
    this.statusLabel.fontFamily = '"Courier New", monospace';
    this.statusLabel.top = '-10px';
    this.statusLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.statusLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.statusPanel.addControl(this.statusLabel);

    this.statusMission = new TextBlock('statusMission');
    this.statusMission.text = '';
    this.statusMission.color = '#aaddcc';
    this.statusMission.fontSize = 13;
    this.statusMission.fontFamily = '"Courier New", monospace';
    this.statusMission.top = '10px';
    this.statusMission.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.statusMission.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.statusMission.textWrapping = true;
    this.statusPanel.addControl(this.statusMission);
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

  setMissionStatus(missionTitle: string | null, statusLine: string | null): void {
    if (missionTitle && statusLine) {
      this.statusMission.text = `${missionTitle}  ·  ${statusLine}`;
      this.statusPanel.isVisible = true;
    } else {
      this.statusPanel.isVisible = false;
    }
  }

  dispose(): void {
    this.texture.dispose();
  }
}
