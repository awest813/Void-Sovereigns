import { gameState } from '../../game/state/GameState';
import { dataManager } from '../../game/state/DataManager';
import { DomOverlay } from '../dom/DomOverlay';

export class PerkMenuUI {
  private overlay: DomOverlay;
  private isVisible = false;
  private perks = dataManager.getPerks();

  constructor() {
    this.overlay = new DomOverlay('perk-menu-ui', 'system-panel system-panel-medium');
    this.overlay.panel.addEventListener('click', (event) => this.handleClick(event));
  }

  public show(): void {
    this.isVisible = true;
    this.overlay.show();
    this.render();
  }

  public hide(): void {
    this.isVisible = false;
    this.overlay.hide();
  }

  public toggle(): void {
    if (this.isVisible) this.hide();
    else this.show();
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

    if (action === 'unlock' && target.dataset.id) {
      this.handleUnlock(target.dataset.id);
    }
  }

  private render(): void {
    const s = gameState.get();

    this.overlay.panel.innerHTML = `
      <div class="overlay-header">
        <span class="overlay-header-title">Neural Augmentation Interface</span>
        <div class="overlay-header-copy">
          <span class="overlay-header-tag">AVAIL_NEURAL_CAPACITY</span>
          <span class="overlay-value-cyan">${s.perkPoints} PN</span>
        </div>
      </div>
      <div class="overlay-scroll system-scroll">
        <div class="system-list">
          ${this.perks
            .map((perk) => {
              const has = gameState.hasPerk(perk.id);
              const canAfford = s.perkPoints > 0;
              return `
                <article class="system-row ${has ? 'system-row-active' : ''}">
                  <div class="system-icon ${has ? 'system-icon-active' : ''}">${perk.icon}</div>
                  <div class="system-copy">
                    <div class="system-title ${has ? 'system-title-active' : ''}">${perk.id}</div>
                    <div class="system-description">${perk.description}</div>
                  </div>
                  <button
                    class="sci-fi-btn system-action ${has || !canAfford ? 'system-action-disabled' : ''}"
                    ${!has && canAfford ? `data-action="unlock" data-id="${perk.id}"` : ''}
                    type="button"
                  >
                    ${has ? 'LINK_ACTIVE' : 'INITIALIZE'}
                  </button>
                </article>
              `;
            })
            .join('')}
        </div>
        <div class="system-footer">
          <button class="sci-fi-btn overlay-muted-button" data-action="close" type="button">Disconnect</button>
        </div>
      </div>
    `;
  }

  private handleUnlock(id: string): void {
    if (gameState.unlockPerk(id)) {
      this.render();
    }
  }
}
