import {
  AdvancedDynamicTexture,
  TextBlock,
  Ellipse,
  Rectangle,
  Control,
} from '@babylonjs/gui';

export class HUD {
  private texture: AdvancedDynamicTexture;
  private promptText: TextBlock;
  private crosshair: Ellipse;
  private statusMission: TextBlock;
  private statusPanel: Rectangle;
  private messageTimer: any = null;
  
  private healthBar: Rectangle;
  private shieldBar: Rectangle;
  private oxygenBar: Rectangle;
  private xpBar: Rectangle;
  private levelLabel: TextBlock;
  private ammoLabel: TextBlock;

  private bossPanel: Rectangle | null = null;
  private bossBar: Rectangle | null = null;
  private bossLabel: TextBlock | null = null;

  constructor() {
    this.texture = AdvancedDynamicTexture.CreateFullscreenUI('hud');

    // 1. Crosshair (Halo-style minimalist)
    this.crosshair = new Ellipse('crosshair');
    this.crosshair.width = '8px';
    this.crosshair.height = '8px';
    this.crosshair.color = 'rgba(0, 255, 255, 0.6)';
    this.crosshair.thickness = 1.5;
    this.texture.addControl(this.crosshair);

    // 2. Tactical Metrics (Health/Shield) - Top Center
    const metricPanel = new Rectangle('metricPanel');
    metricPanel.width = '300px';
    metricPanel.height = '60px';
    metricPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    metricPanel.top = '20px';
    metricPanel.thickness = 0;
    this.texture.addControl(metricPanel);

    // Shield Bar (Bright Cyan)
    const shieldContainer = new Rectangle('shieldContainer');
    shieldContainer.width = '100%';
    shieldContainer.height = '8px';
    shieldContainer.background = 'rgba(0, 255, 255, 0.1)';
    shieldContainer.thickness = 0;
    shieldContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    metricPanel.addControl(shieldContainer);

    this.shieldBar = new Rectangle('shieldBar');
    this.shieldBar.width = '100%';
    this.shieldBar.height = '100%';
    this.shieldBar.background = '#00ffff';
    this.shieldBar.thickness = 0;
    this.shieldBar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    shieldContainer.addControl(this.shieldBar);

    // Health Bar (Industrial Red) - Below Shield
    const healthContainer = new Rectangle('healthContainer');
    healthContainer.width = '100%';
    healthContainer.height = '4px';
    healthContainer.top = '12px';
    healthContainer.background = 'rgba(255, 68, 68, 0.1)';
    healthContainer.thickness = 0;
    healthContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    metricPanel.addControl(healthContainer);

    this.healthBar = new Rectangle('healthBar');
    this.healthBar.width = '100%';
    this.healthBar.height = '100%';
    this.healthBar.background = '#ff4444';
    this.healthBar.thickness = 0;
    this.healthBar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    healthContainer.addControl(this.healthBar);

    // Oxygen Bar (Warning Yellow/White) - Below Health
    const oxygenContainer = new Rectangle('oxygenContainer');
    oxygenContainer.width = '100%';
    oxygenContainer.height = '2px';
    oxygenContainer.top = '20px';
    oxygenContainer.background = 'rgba(255, 255, 255, 0.05)';
    oxygenContainer.thickness = 0;
    oxygenContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    metricPanel.addControl(oxygenContainer);

    this.oxygenBar = new Rectangle('oxygenBar');
    this.oxygenBar.width = '100%';
    this.oxygenBar.height = '100%';
    this.oxygenBar.background = '#ffffff';
    this.oxygenBar.thickness = 0;
    this.oxygenBar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    oxygenContainer.addControl(this.oxygenBar);

    // 3. Status Panel (Mission Intel) - Top Right
    this.statusPanel = new Rectangle('statusPanel');
    this.statusPanel.width = '350px';
    this.statusPanel.height = '40px';
    this.statusPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this.statusPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.statusPanel.top = '20px';
    this.statusPanel.left = '-20px';
    this.statusPanel.background = 'rgba(0, 0, 0, 0.4)';
    this.statusPanel.color = 'rgba(0, 255, 255, 0.2)';
    this.statusPanel.thickness = 1;
    this.texture.addControl(this.statusPanel);

    this.statusMission = new TextBlock('statusMission');
    this.statusMission.text = 'VOICE LINK ACTIVE';
    this.statusMission.color = '#00ffff';
    this.statusMission.fontSize = 12;
    this.statusMission.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.statusMission.left = '15px';
    this.statusPanel.addControl(this.statusMission);

    // 4. XP Bar - Bottom
    const bottomPanel = new Rectangle('bottomPanel');
    bottomPanel.width = '100%';
    bottomPanel.height = '4px';
    bottomPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    bottomPanel.background = 'rgba(255, 255, 255, 0.1)';
    bottomPanel.thickness = 0;
    this.texture.addControl(bottomPanel);

    this.xpBar = new Rectangle('xpBar');
    this.xpBar.width = '0%';
    this.xpBar.height = '100%';
    this.xpBar.background = '#ffaa00';
    this.xpBar.thickness = 0;
    this.xpBar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    bottomPanel.addControl(this.xpBar);

    this.levelLabel = new TextBlock('levelLabel', 'RANK 1');
    this.levelLabel.color = '#ffaa00';
    this.levelLabel.fontSize = 14;
    this.levelLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.levelLabel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this.levelLabel.top = '-20px';
    this.levelLabel.left = '-20px';
    this.texture.addControl(this.levelLabel);

    // 5. Ammo Display - Bottom Right (above Level)
    this.ammoLabel = new TextBlock('ammoLabel', '0/0');
    this.ammoLabel.color = '#00ffff';
    this.ammoLabel.fontSize = 24;
    this.ammoLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.ammoLabel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this.ammoLabel.top = '-50px';
    this.ammoLabel.left = '-20px';
    this.texture.addControl(this.ammoLabel);

    // 6. Interaction
    this.promptText = new TextBlock('prompt');
    this.promptText.text = '';
    this.promptText.color = '#ffffff';
    this.promptText.fontSize = 20;
    this.promptText.top = '100px';
    this.texture.addControl(this.promptText);
  }

  updateHealth(percent: number): void {
    this.healthBar.width = `${percent * 100}%`;
  }

  updateShield(percent: number): void {
    this.shieldBar.width = `${percent * 100}%`;
    this.shieldBar.background = percent < 0.2 ? '#ff3300' : '#00ffff';
  }

  updateOxygen(current: number, max: number): void {
    const percent = Math.max(0, Math.min(1, current / max));
    this.oxygenBar.width = `${percent * 100}%`;
    
    // Change color when low
    if (percent < 0.25) {
      this.oxygenBar.background = '#ffaa00';
    } else {
      this.oxygenBar.background = '#ffffff';
    }
  }

  public showDamageFlash(): void {
    const flash = new Rectangle('flash');
    flash.width = '100%';
    flash.height = '100%';
    flash.background = 'rgba(255, 0, 0, 0.2)';
    flash.thickness = 0;
    this.texture.addControl(flash);
    setTimeout(() => {
      flash.dispose();
    }, 100);
  }

  updateXP(percent: number, level: number): void {
    this.xpBar.width = `${percent * 100}%`;
    this.levelLabel.text = `NEURAL RANK ${level}`;
  }

  public showMessage(text: string, durationMs = 2000): void {
    if (this.messageTimer) clearTimeout(this.messageTimer);
    this.promptText.text = text.toUpperCase();
    this.messageTimer = setTimeout(() => {
      this.promptText.text = '';
    }, durationMs);
  }

  public showBossHealth(name: string, percent: number): void {
    if (!this.bossPanel) {
      this.bossPanel = new Rectangle('bossPanel');
      this.bossPanel.width = '500px';
      this.bossPanel.height = '40px';
      this.bossPanel.top = '100px'; 
      this.bossPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      this.bossPanel.background = 'rgba(0, 0, 0, 0.6)';
      this.bossPanel.thickness = 0;
      this.texture.addControl(this.bossPanel);

      this.bossLabel = new TextBlock('bossLabel', name.toUpperCase());
      this.bossLabel.color = '#ff3300';
      this.bossLabel.fontSize = 12;
      this.bossLabel.top = '-15px';
      this.bossPanel.addControl(this.bossLabel);

      this.bossBar = new Rectangle('bossBar');
      this.bossBar.width = '100%';
      this.bossBar.height = '4px';
      this.bossBar.top = '5px';
      this.bossBar.background = '#ff3300';
      this.bossBar.thickness = 0;
      this.bossBar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      this.bossPanel.addControl(this.bossBar);
    }
    this.updateBossHealth(percent);
  }

  public updateBossHealth(percent: number): void {
    if (this.bossBar) {
      this.bossBar.width = `${percent * 100}%`;
      if (percent <= 0) {
        this.bossPanel?.dispose();
        this.bossPanel = null;
        this.bossBar = null;
        this.bossLabel = null;
      }
    }
  }

  public updateInteractionTarget(interactable: any | null): void {
    if (interactable) {
      this.promptText.text = `[E] ${interactable.promptText.toUpperCase()}`;
    } else {
      this.promptText.text = '';
    }
  }

  public setMissionStatus(title: string | null, status: string | null): void {
    if (title && status) {
      this.statusMission.text = `${title.toUpperCase()} // ${status.toUpperCase()}`;
      this.statusPanel.isVisible = true;
    } else {
      this.statusPanel.isVisible = false;
    }
  }

  public showLevelUp(): void {
    this.showMessage("NEURAL LINK UPGRADED: RANK UP", 5000);
  }

  public updateAmmo(current: number, reserve: number): void {
    this.ammoLabel.text = `${current} / ${reserve}`;
    this.ammoLabel.color = current === 0 ? '#ff4444' : (current < 5 ? '#ffaa00' : '#00ffff');
  }

  public dispose(): void {
    this.texture.dispose();
  }
}
