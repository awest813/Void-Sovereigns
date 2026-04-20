import { gameState } from '../../game/state/GameState';
import { dataManager } from '../../game/state/DataManager';

export class MissionBoardUI {
  private container: HTMLDivElement;
  private isVisible = false;
  private selectedPlanet: string | null = null;
  private actionHandler: (action: string, missionId?: string) => void = () => {};

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'mission-board-ui';
    this.container.className = 'glass-panel';
    this.container.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 1000px;
      height: 650px;
      display: none;
      z-index: 1000;
      overflow: hidden;
    `;
    document.body.appendChild(this.container);
  }

  public show(): void {
    this.isVisible = true;
    this.container.style.display = 'block';
    this.render();
  }

  public hide(): void {
    this.isVisible = false;
    this.container.style.display = 'none';
  }

  public isVisibleState(): boolean {
    return this.isVisible;
  }

  public setActionHandler(handler: (action: string, missionId?: string) => void): void {
    this.actionHandler = handler;
  }

  private render(): void {
    if (this.selectedPlanet) {
      this.renderMissionList();
    } else {
      this.renderStarMap();
    }

    (window as any).selectPlanet = (id: string) => { this.selectedPlanet = id; this.render(); };
    (window as any).backToMap = () => { this.selectedPlanet = null; this.render(); };
    (window as any).acceptMission = (id: string) => { this.actionHandler('accept', id); this.hide(); };
    (window as any).closeBoard = () => this.hide();
  }

  private renderStarMap(): void {
    const planets = [
      { id: 'industrial', name: 'AURELIA-IV', biome: 'Heavy Industrial', color: 'var(--neon-cyan)', difficulty: 'MODERATE', icon: this.getPlanetSVG('cyan') },
      { id: 'arctic', name: 'KRYOS-9', biome: 'Deep Arctic', color: '#fff', difficulty: 'EXTREME', icon: this.getPlanetSVG('white') },
      { id: 'depot', name: 'VOLK-STATION', biome: 'Security Depot', color: 'var(--neon-orange)', difficulty: 'ELITE', icon: this.getPlanetSVG('orange') },
    ];

    this.container.innerHTML = `
      <div style="height: 70px; background: rgba(255, 255, 255, 0.03); display: flex; align-items: center; padding: 0 40px; border-bottom: 1px solid var(--border-cyan); justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 15px;">
           <span style="color: var(--neon-cyan); opacity: 0.5; font-size: 14px;">[ NAV_SYS_LINK ]</span>
           <span style="text-transform: uppercase; letter-spacing: 5px; font-weight: 300;">Sector Navigation</span>
        </div>
        <div class="status-badge">ORBITAL UPLINK ACTIVE</div>
      </div>

      <div style="display: flex; height: 580px;">
        <div style="flex: 1; padding: 40px; position: relative;">
          <!-- Orbital Circle Rings -->
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 350px; height: 350px; border: 1px solid var(--border-cyan); border-radius: 50%; opacity: 0.1;"></div>
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 200px; height: 200px; border: 1px solid var(--border-cyan); border-radius: 50%; opacity: 0.05;"></div>
          
          ${planets.map((p, i) => {
            const angle = (i * (Math.PI * 2) / 3) - Math.PI/2;
            const x = 50 + Math.cos(angle) * 35;
            const y = 50 + Math.sin(angle) * 35;
            return `
              <div class="planet-node" style="position: absolute; left: ${x}%; top: ${y}%; transform: translate(-50%, -50%); cursor: pointer; text-align: center; transition: transform 0.3s;" onclick="selectPlanet('${p.id}')">
                <div style="width: 80px; height: 80px; margin-bottom: 15px; filter: drop-shadow(0 0 10px ${p.color}44);">${p.icon}</div>
                <div style="font-size: 14px; letter-spacing: 2px; font-weight: 600; color: ${p.color};">${p.name}</div>
                <div style="font-size: 10px; color: rgba(255, 255, 255, 0.4); margin-top: 4px;">${p.difficulty}</div>
              </div>
            `;
          }).join('')}
        </div>

        <div style="width: 320px; background: rgba(0, 0, 0, 0.2); border-left: 1px solid var(--border-cyan); padding: 40px; display: flex; flex-direction: column;">
          <h3 style="margin: 0; font-size: 12px; color: var(--neon-cyan); letter-spacing: 3px; opacity: 0.6;">SENSOR LOG</h3>
          <p style="font-size: 14px; line-height: 1.8; color: rgba(255, 255, 255, 0.6); margin: 20px 0 40px 0;">Multiple encryption spikes detected in Sector 7. Select a planetary node to view current extraction contracts and risk profiles.</p>
          
          <div style="flex-grow: 1;">
              <div style="background: rgba(0, 255, 255, 0.03); padding: 20px; border: 1px solid var(--border-cyan);">
                <div style="font-size: 10px; opacity: 0.5;">CURRENT RANK</div>
                <div style="font-size: 32px; color: var(--neon-orange); font-weight: 300;">${gameState.get().level}</div>
              </div>
          </div>
          
          <button class="sci-fi-btn" style="width: 100%; border-color: rgba(255, 255, 255, 0.2); color: rgba(255, 255, 255, 0.5);" onclick="closeBoard()">Disconnect</button>
        </div>
      </div>

      <style>
        .planet-node:hover { transform: translate(-50%, -50%) scale(1.1); }
      </style>
    `;
  }

  private renderMissionList(): void {
    const missions = dataManager.getMissions().filter(m => m.biome === this.selectedPlanet);
    this.container.innerHTML = `
      <div style="height: 70px; background: rgba(255, 255, 255, 0.03); display: flex; align-items: center; padding: 0 40px; border-bottom: 1px solid var(--border-cyan); justify-content: space-between;">
        <span style="text-transform: uppercase; letter-spacing: 5px; color: var(--neon-orange); font-weight: 600;">Sector Contracts: ${this.selectedPlanet?.toUpperCase()}</span>
        <button style="background: transparent; border: none; color: var(--neon-cyan); cursor: pointer; letter-spacing: 2px;" onclick="backToMap()">< BACK TO MAP</button>
      </div>

      <div style="padding: 40px; overflow-y: auto; height: 580px;">
        ${missions.map(m => `
          <div style="padding: 30px; background: rgba(0, 255, 255, 0.02); border: 1px solid var(--border-cyan); margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
            <div style="flex: 1;">
              <div style="font-size: 20px; font-weight: 600; letter-spacing: 2px; margin-bottom: 8px;">${m.title}</div>
              <div style="font-size: 13px; color: rgba(255, 255, 255, 0.5); line-height: 1.6; max-width: 500px;">${m.description}</div>
            </div>
            <div style="text-align: right; width: 200px;">
              <div style="font-size: 24px; color: var(--neon-orange); font-weight: 300; margin-bottom: 15px;">${m.creditReward} CR</div>
              <button class="sci-fi-btn" style="width: 100%; border-color: var(--neon-cyan);" onclick="acceptMission('${m.id}')">Accept</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  private getPlanetSVG(colorType: string): string {
    const color = colorType === 'cyan' ? '#00ffff' : (colorType === 'orange' ? '#ffaa00' : '#ffffff');
    return `
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" stroke="${color}" stroke-width="1" stroke-dasharray="4 4" />
        <circle cx="50" cy="50" r="35" fill="${color}" fill-opacity="0.1" />
        <path d="M50 15 A35 35 0 0 1 85 50" stroke="${color}" stroke-width="2" />
        <circle cx="50" cy="35" r="2" fill="${color}" />
        <circle cx="65" cy="50" r="1.5" fill="${color}" opacity="0.5" />
      </svg>
    `;
  }
}
