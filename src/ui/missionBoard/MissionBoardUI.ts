import { gameState } from '../../game/state/GameState';
import { dataManager } from '../../game/state/DataManager';
import { DomOverlay } from '../dom/DomOverlay';
import type { MissionDefinition } from '../../content/missions/missionData';

export class MissionBoardUI {
  private overlay: DomOverlay;
  public isVisible = false;
  private selectedPlanet: string | null = null;
  private actionHandler: (action: string, missionId?: string) => void = () => {};

  constructor() {
    this.overlay = new DomOverlay('mission-board-ui', 'mission-board-panel');
    this.overlay.panel.addEventListener('click', (event) => this.handleClick(event));
  }

  public show(mission?: MissionDefinition, _canAccept?: boolean, _canDeploy?: boolean): void {
    this.isVisible = true;
    this.overlay.show();

    if (mission?.biome) {
      this.selectedPlanet = mission.biome;
    }

    this.render();
  }

  public hide(): void {
    this.isVisible = false;
    this.overlay.hide();
  }

  public isVisibleState(): boolean {
    return this.isVisible;
  }

  public setActionHandler(handler: (action: string, missionId?: string) => void): void {
    this.actionHandler = handler;
  }

  public dispose(): void {
    this.overlay.dispose();
  }

  private handleClick(event: Event): void {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    if (action === 'close') {
      this.hide();
      return;
    }

    if (action === 'back') {
      this.selectedPlanet = null;
      this.render();
      return;
    }

    if (action === 'planet' && target.dataset.id) {
      this.selectedPlanet = target.dataset.id;
      this.render();
      return;
    }

    if (action === 'accept' && target.dataset.id) {
      this.actionHandler('accept', target.dataset.id);
      this.hide();
    }
  }

  private render(): void {
    this.overlay.panel.innerHTML = this.selectedPlanet ? this.renderMissionList() : this.renderStarMap();
  }

  private renderStarMap(): string {
    const planets = [
      { id: 'industrial', name: 'AURELIA-IV', difficulty: 'MODERATE', tone: 'cyan', icon: this.getPlanetSVG('cyan') },
      { id: 'arctic', name: 'KRYOS-9', difficulty: 'EXTREME', tone: 'white', icon: this.getPlanetSVG('white') },
      { id: 'depot', name: 'VOLK-STATION', difficulty: 'ELITE', tone: 'orange', icon: this.getPlanetSVG('orange') },
    ];

    return `
      <div class="overlay-header">
        <div class="overlay-header-copy">
          <span class="overlay-header-tag">[ NAV_SYS_LINK ]</span>
          <span class="overlay-header-title">Sector Navigation</span>
        </div>
        <div class="status-badge">ORBITAL UPLINK ACTIVE</div>
      </div>
      <div class="mission-board-layout">
        <div class="mission-board-map">
          <div class="mission-board-ring mission-board-ring-large"></div>
          <div class="mission-board-ring mission-board-ring-small"></div>
          ${planets
            .map((planet, index) => {
              const angle = (index * (Math.PI * 2)) / 3 - Math.PI / 2;
              const x = 50 + Math.cos(angle) * 35;
              const y = 50 + Math.sin(angle) * 35;
              return `
                <button
                  class="mission-planet mission-planet-${planet.tone}"
                  style="left:${x}%; top:${y}%;"
                  data-action="planet"
                  data-id="${planet.id}"
                  type="button"
                >
                  <span class="mission-planet-icon">${planet.icon}</span>
                  <span class="mission-planet-name">${planet.name}</span>
                  <span class="mission-planet-difficulty">${planet.difficulty}</span>
                </button>
              `;
            })
            .join('')}
        </div>
        <aside class="mission-board-sidebar">
          <h3 class="overlay-section-label">SENSOR LOG</h3>
          <p class="overlay-body-copy">
            Multiple encryption spikes detected in Sector 7. Select a planetary node to view current extraction contracts and risk profiles.
          </p>
          <div class="overlay-stat-card">
            <div class="overlay-stat-label">CURRENT RANK</div>
            <div class="overlay-stat-value">${gameState.get().level}</div>
          </div>
          <button class="sci-fi-btn overlay-muted-button" data-action="close" type="button">Disconnect</button>
        </aside>
      </div>
    `;
  }

  private renderMissionList(): string {
    const missions = dataManager.getMissions().filter((mission) => mission.biome === this.selectedPlanet);

    return `
      <div class="overlay-header">
        <span class="overlay-header-title overlay-header-accent">Sector Contracts: ${this.selectedPlanet?.toUpperCase()}</span>
        <button class="overlay-link-button" data-action="back" type="button">&lt; Back To Map</button>
      </div>
      <div class="overlay-scroll mission-board-contracts">
        ${missions
          .map(
            (mission) => `
              <article class="overlay-list-card mission-contract-card">
                <div class="mission-contract-copy">
                  <div class="mission-contract-title">${mission.title}</div>
                  <div class="mission-contract-briefing">${mission.briefing}</div>
                </div>
                <div class="mission-contract-actions">
                  <div class="mission-contract-reward">${mission.reward}</div>
                  <button class="sci-fi-btn" data-action="accept" data-id="${mission.id}" type="button">Accept</button>
                </div>
              </article>
            `
          )
          .join('')}
      </div>
    `;
  }

  private getPlanetSVG(colorType: string): string {
    const color = colorType === 'cyan' ? '#00ffff' : colorType === 'orange' ? '#ffaa00' : '#ffffff';
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
