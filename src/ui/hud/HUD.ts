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
  private messageTimer: any = null;
  
  private healthBar: Rectangle;
  private oxygenBar: Rectangle;
  private shieldBar: Rectangle;

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
    this.promptText.color = '#ffffff';
    this.promptText.fontSize = 18;
    this.promptText.fontFamily = '"Outfit", "Segoe UI", sans-serif';
    this.promptText.top = '60px';
    this.promptText.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.promptText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.promptText.outlineWidth = 2;
    this.promptText.outlineColor = '#000000';
    this.texture.addControl(this.promptText);

    // Mission status panel — top-right corner
    this.statusPanel = new Rectangle('statusPanel');
    this.statusPanel.width = '280px';
    this.statusPanel.height = '60px';
    this.statusPanel.cornerRadius = 8;
    this.statusPanel.color = '#44ffcc88';
    this.statusPanel.thickness = 1;
    this.statusPanel.background = '#0a0e14aa'; // Glassmorphism base
    this.statusPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this.statusPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.statusPanel.top = '20px';
    this.statusPanel.left = '-20px';
    this.statusPanel.isVisible = false;
    this.texture.addControl(this.statusPanel);

    this.statusLabel = new TextBlock('statusLabel');
    this.statusLabel.text = 'MISSION PROTOCOL';
    this.statusLabel.color = '#44ffcc';
    this.statusLabel.fontSize = 11;
    this.statusLabel.fontFamily = '"Outfit", sans-serif';
    this.statusLabel.fontWeight = 'bold';
    this.statusLabel.top = '-14px';
    this.statusLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.statusLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.statusPanel.addControl(this.statusLabel);

    this.statusMission = new TextBlock('statusMission');
    this.statusMission.text = '';
    this.statusMission.color = '#ffffff';
    this.statusMission.fontSize = 14;
    this.statusMission.fontFamily = '"Outfit", sans-serif';
    this.statusMission.top = '10px';
    this.statusMission.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.statusMission.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.statusMission.textWrapping = true;
    this.statusPanel.addControl(this.statusMission);

    // Health Panel — bottom-left corner
    this.healthPanel = new Rectangle('healthPanel');
    this.healthPanel.width = '240px';
    this.healthPanel.height = '50px';
    this.healthPanel.thickness = 0;
    this.healthPanel.background = '#00000000';
    this.healthPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.healthPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.healthPanel.left = '32px';
    this.healthPanel.top = '-32px';
    this.texture.addControl(this.healthPanel);

    this.healthBar = this.createBar('health', '#ff4444', 30);
    this.oxygenBar = this.createBar('oxygen', '#44ccff', 50);
    this.shieldBar = this.createBar('shield', '#00aaff', 10);
  }

  private createBar(label: string, color: string, top: number): Rectangle {
    const bar = new Rectangle(label + '_bar');
    bar.width = '200px';
    bar.height = '12px';
    bar.background = '#ffffff11';
    bar.color = color;
    bar.thickness = 1;
    bar.top = top + 'px';
    bar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.healthPanel.addControl(bar);

    const fill = new Rectangle(label + '_fill');
    fill.width = '100%';
    fill.height = '100%';
    fill.background = color;
    fill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    bar.addControl(fill);

    return fill;
  }

  public updateOxygen(percent: number): void {
    if (this.oxygenBar) {
      this.oxygenBar.width = `${Math.max(0, percent * 100)}%`;
    }
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
    if (this.messageTimer) clearTimeout(this.messageTimer);
    
    this.promptText.text = text;
    this.promptText.alpha = 0;
    
    // Simple fade in - for a real "wow" we'd use animations, but this is a start
    let alpha = 0;
    const interval = setInterval(() => {
      alpha += 0.1;
      this.promptText.alpha = alpha;
      if (alpha >= 1) clearInterval(interval);
    }, 20);

    this.messageTimer = setTimeout(() => {
      this.promptText.text = '';
      this.messageTimer = null;
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

  updateShield(percent: number): void {
    this.shieldBar.width = `${Math.max(0, Math.min(100, percent * 100))}%`;
  }

  updateHealth(percent: number): void {
    this.healthBar.width = `${Math.max(0, Math.min(100, percent * 100))}%`;
    if (percent < 0.3) {
      this.healthBar.background = '#ff2222';
    } else {
      this.healthBar.background = '#ff4444';
    }
  }

  private damageOverlay: Rectangle | null = null;
  public showDamageFlash(): void {
    if (!this.damageOverlay) {
       this.damageOverlay = new Rectangle('damageFlash');
       this.damageOverlay.width = '100%';
       this.damageOverlay.height = '100%';
       this.damageOverlay.background = '#ff2200';
       this.damageOverlay.alpha = 0;
       this.damageOverlay.thickness = 0;
       this.texture.addControl(this.damageOverlay);
    }
    
    this.damageOverlay.alpha = 0.4;
    const interval = setInterval(() => {
       if (this.damageOverlay) {
         this.damageOverlay.alpha -= 0.05;
         if (this.damageOverlay.alpha <= 0) clearInterval(interval);
       }
    }, 20);
  }

  dispose(): void {
    this.texture.dispose();
  }
}
