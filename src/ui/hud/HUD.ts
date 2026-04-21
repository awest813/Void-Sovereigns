export class HUD {
  private root: HTMLDivElement;
  private promptText: HTMLDivElement;
  private messageText: HTMLDivElement;
  private statusPanel: HTMLDivElement;
  private statusMission: HTMLDivElement;
  private healthBar: HTMLDivElement;
  private shieldBar: HTMLDivElement;
  private oxygenBar: HTMLDivElement;
  private xpBar: HTMLDivElement;
  private levelLabel: HTMLDivElement;
  private ammoLabel: HTMLDivElement;
  private damageFlash: HTMLDivElement;
  private bossPanel: HTMLDivElement | null = null;
  private bossBar: HTMLDivElement | null = null;
  private bossLabel: HTMLDivElement | null = null;
  private messageTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'hud-root';

    this.root.innerHTML = `
      <div class="hud-crosshair"></div>
      <div class="hud-metrics">
        <div class="hud-bar-shell hud-shield-shell"><div class="hud-bar-fill hud-shield-fill"></div></div>
        <div class="hud-bar-shell hud-health-shell"><div class="hud-bar-fill hud-health-fill"></div></div>
        <div class="hud-bar-shell hud-oxygen-shell"><div class="hud-bar-fill hud-oxygen-fill"></div></div>
      </div>
      <div class="hud-status-panel">
        <div class="hud-status-text">VOICE LINK ACTIVE</div>
      </div>
      <div class="hud-message"></div>
      <div class="hud-prompt"></div>
      <div class="hud-ammo">0 / 0</div>
      <div class="hud-level">NEURAL RANK 1</div>
      <div class="hud-xp-shell"><div class="hud-xp-fill"></div></div>
      <div class="hud-damage-flash"></div>
    `;

    document.body.appendChild(this.root);

    this.promptText = this.root.querySelector('.hud-prompt') as HTMLDivElement;
    this.messageText = this.root.querySelector('.hud-message') as HTMLDivElement;
    this.statusPanel = this.root.querySelector('.hud-status-panel') as HTMLDivElement;
    this.statusMission = this.root.querySelector('.hud-status-text') as HTMLDivElement;
    this.healthBar = this.root.querySelector('.hud-health-fill') as HTMLDivElement;
    this.shieldBar = this.root.querySelector('.hud-shield-fill') as HTMLDivElement;
    this.oxygenBar = this.root.querySelector('.hud-oxygen-fill') as HTMLDivElement;
    this.xpBar = this.root.querySelector('.hud-xp-fill') as HTMLDivElement;
    this.levelLabel = this.root.querySelector('.hud-level') as HTMLDivElement;
    this.ammoLabel = this.root.querySelector('.hud-ammo') as HTMLDivElement;
    this.damageFlash = this.root.querySelector('.hud-damage-flash') as HTMLDivElement;
  }

  updateHealth(percent: number): void {
    this.healthBar.style.width = `${Math.max(0, Math.min(1, percent)) * 100}%`;
  }

  updateShield(percent: number): void {
    const clamped = Math.max(0, Math.min(1, percent));
    this.shieldBar.style.width = `${clamped * 100}%`;
    this.shieldBar.style.background = clamped < 0.2 ? '#ff3300' : '#00ffff';
  }

  updateOxygen(current: number, max: number): void {
    const percent = Math.max(0, Math.min(1, current / max));
    this.oxygenBar.style.width = `${percent * 100}%`;
    this.oxygenBar.style.background = percent < 0.25 ? '#ffaa00' : '#ffffff';
  }

  public showDamageFlash(): void {
    this.damageFlash.classList.add('visible');
    setTimeout(() => {
      this.damageFlash.classList.remove('visible');
    }, 100);
  }

  updateXP(percent: number, level: number): void {
    this.xpBar.style.width = `${Math.max(0, Math.min(1, percent)) * 100}%`;
    this.levelLabel.textContent = `NEURAL RANK ${level}`;
  }

  public showMessage(text: string, durationMs = 2000): void {
    if (this.messageTimer) clearTimeout(this.messageTimer);
    this.messageText.textContent = text.toUpperCase();
    this.messageTimer = setTimeout(() => {
      this.messageText.textContent = '';
    }, durationMs);
  }

  public showBossHealth(name: string, percent: number): void {
    if (!this.bossPanel) {
      this.bossPanel = document.createElement('div');
      this.bossPanel.className = 'hud-boss-panel';
      this.bossPanel.innerHTML = `
        <div class="hud-boss-label"></div>
        <div class="hud-boss-shell"><div class="hud-boss-fill"></div></div>
      `;
      this.root.appendChild(this.bossPanel);
      this.bossLabel = this.bossPanel.querySelector('.hud-boss-label') as HTMLDivElement;
      this.bossBar = this.bossPanel.querySelector('.hud-boss-fill') as HTMLDivElement;
    }

    if (this.bossLabel) {
      this.bossLabel.textContent = name.toUpperCase();
    }
    this.updateBossHealth(percent);
  }

  public updateBossHealth(percent: number): void {
    if (!this.bossBar) return;
    const clamped = Math.max(0, Math.min(1, percent));
    this.bossBar.style.width = `${clamped * 100}%`;
    if (clamped <= 0) {
      this.bossPanel?.remove();
      this.bossPanel = null;
      this.bossBar = null;
      this.bossLabel = null;
    }
  }

  public updateInteractionTarget(interactable: { promptText: string } | null): void {
    this.promptText.textContent = interactable ? `[E] ${interactable.promptText.toUpperCase()}` : '';
  }

  public setMissionStatus(title: string | null, status: string | null): void {
    if (title && status) {
      this.statusMission.textContent = `${title.toUpperCase()} // ${status.toUpperCase()}`;
      this.statusPanel.style.display = 'flex';
    } else {
      this.statusPanel.style.display = 'none';
    }
  }

  public showLevelUp(): void {
    this.showMessage('NEURAL LINK UPGRADED: RANK UP', 5000);
  }

  public updateAmmo(current: number, reserve: number): void {
    this.ammoLabel.textContent = `${current} / ${reserve}`;
    this.ammoLabel.style.color = current === 0 ? '#ff4444' : current < 5 ? '#ffaa00' : '#00ffff';
  }

  public dispose(): void {
    if (this.messageTimer) clearTimeout(this.messageTimer);
    this.root.remove();
  }
}
