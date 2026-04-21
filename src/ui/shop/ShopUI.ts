import { gameState } from '../../game/state/GameState';
import { DomOverlay } from '../dom/DomOverlay';

export class ShopUI {
  private overlay: DomOverlay;
  private isVisible = false;

  constructor() {
    this.overlay = new DomOverlay('shop-ui', 'system-panel system-panel-wide');
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

  public isOpen(): boolean {
    return this.isVisible;
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

    if (action === 'buy' && target.dataset.id && target.dataset.cost) {
      this.handlePurchase(target.dataset.id, Number(target.dataset.cost));
    }
  }

  private render(): void {
    const s = gameState.get();

    this.overlay.panel.innerHTML = `
      <div class="overlay-header">
        <span class="overlay-header-title">Requisitions Terminal</span>
        <div class="overlay-header-copy">
          <span class="overlay-header-tag">AVAIL_CAPITAL</span>
          <span class="overlay-value-orange">${s.credits} CR</span>
        </div>
      </div>
      <div class="overlay-scroll system-scroll">
        <h3 class="overlay-section-label">HARDWARE UPGRADES</h3>
        <div class="shop-grid">
          ${this.renderItem('Calibrated Receiver', '+5 Base Weapon Damage', 250, 'dmg')}
          ${this.renderItem('Reinforced Plating', 'Restore Neural Buffs', 150, 'armor')}
          ${this.renderItem('Sovereign Shotgun', 'CQC Heavy Scatter Gear', 800, 'shotgun')}
          ${this.renderItem('Rapid-Fire SMG', 'Lightweight Burst Gear', 1200, 'smg')}
          ${this.renderItem('High-Cap Oxygen', 'Extended EVA Duration', 500, 'oxy')}
        </div>
        <div class="system-footer">
          <button class="sci-fi-btn overlay-muted-button" data-action="close" type="button">Exit Console</button>
        </div>
      </div>
    `;
  }

  private renderItem(name: string, desc: string, cost: number, id: string): string {
    const canAfford = gameState.get().credits >= cost;
    return `
      <article class="shop-card">
        <div class="shop-card-top">
          <span class="shop-card-title">${name}</span>
          <span class="shop-card-cost">${cost} CR</span>
        </div>
        <div class="shop-card-description">${desc}</div>
        <button
          class="sci-fi-btn system-action ${!canAfford ? 'system-action-disabled' : ''}"
          ${canAfford ? `data-action="buy" data-id="${id}" data-cost="${cost}"` : ''}
          type="button"
        >
          Purchase
        </button>
      </article>
    `;
  }

  private handlePurchase(id: string, cost: number): void {
    const s = gameState.get();
    if (s.credits < cost) return;

    if (id === 'dmg') gameState.update({ equipment: { ...s.equipment, weaponDamage: s.equipment.weaponDamage + 5 } });
    if (id === 'shotgun') gameState.update({ equippedWeapon: 'shotgun' });
    if (id === 'smg') gameState.update({ equippedWeapon: 'smg' });
    if (id === 'oxy') gameState.update({ maxOxygen: 200 });

    gameState.update({ credits: s.credits - cost });
    this.render();
  }
}
