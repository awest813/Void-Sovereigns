import { gameState } from '../../game/state/GameState';
import { DomOverlay } from '../dom/DomOverlay';

type InventoryTab = 'cargo' | 'loadout';
type WeaponType = 'pistol' | 'shotgun' | 'smg';

export class InventoryUI {
  private overlay: DomOverlay;
  private isOpen = false;
  private activeTab: InventoryTab = 'cargo';
  private keyHandler = (event: KeyboardEvent) => {
    if (event.key.toLowerCase() === 'tab') {
      event.preventDefault();
      this.toggle();
    }
  };

  constructor() {
    this.overlay = new DomOverlay('inventory-ui', 'inventory-panel');
    this.overlay.root.classList.add('inventory-root');
    this.overlay.panel.addEventListener('click', (event) => this.handleClick(event));
    window.addEventListener('keydown', this.keyHandler);
  }

  public toggle(): void {
    this.isOpen = !this.isOpen;

    if (this.isOpen) {
      this.overlay.show();
      this.render();
      document.exitPointerLock?.();
    } else {
      this.overlay.hide();
    }
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.keyHandler);
    this.overlay.dispose();
  }

  private handleClick(event: Event): void {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    if (action === 'close') {
      this.toggle();
      return;
    }

    if (action === 'tab' && target.dataset.tab) {
      this.activeTab = target.dataset.tab as InventoryTab;
      this.render();
      return;
    }

    if (action === 'sell' && target.dataset.index) {
      this.handleSell(Number(target.dataset.index));
      return;
    }

    if (action === 'equip' && target.dataset.weapon) {
      this.handleEquip(target.dataset.weapon as WeaponType);
    }
  }

  private render(): void {
    const state = gameState.get();
    const isHub = state.currentScene === 'hub';

    this.overlay.panel.innerHTML = `
      <div class="overlay-header inventory-header">
        <span class="overlay-header-title">Cargo Manifest</span>
        <div class="overlay-header-copy">
          <span class="status-badge ${isHub ? 'inventory-link-active' : ''}">${isHub ? 'COMM_LINK ACTIVE' : 'FIELD_OP'}</span>
          <button class="overlay-link-button" data-action="close" type="button">Close</button>
        </div>
      </div>
      <div class="inventory-tabs">
        <button class="inventory-tab ${this.activeTab === 'cargo' ? 'inventory-tab-active' : ''}" data-action="tab" data-tab="cargo" type="button">Cargo</button>
        <button class="inventory-tab ${this.activeTab === 'loadout' ? 'inventory-tab-active' : ''}" data-action="tab" data-tab="loadout" type="button">Loadout</button>
      </div>
      ${this.activeTab === 'cargo' ? this.renderCargo(isHub) : this.renderLoadout()}
    `;
  }

  private renderCargo(isHub: boolean): string {
    const state = gameState.get();
    const items = state.inventory;
    const estimatedValue = items.reduce((acc, item) => acc + gameState.getMarketValue(item.id, item.value), 0);

    return `
      <div class="overlay-scroll inventory-scroll">
        ${
          items.length === 0
            ? `
              <div class="inventory-empty">
                <div class="inventory-empty-symbol">EMPTY</div>
                <div class="inventory-empty-copy">CARGO BAY EMPTY</div>
              </div>
            `
            : items
                .map((item, index) => {
                  const marketValue = gameState.getMarketValue(item.id, item.value);
                  const saturation = state.marketSaturation[item.id] || 0;
                  return `
                    <article class="inventory-item-card">
                      <div class="inventory-item-top">
                        <span class="inventory-item-name">${item.name.toUpperCase()}</span>
                        <span class="inventory-item-value">${marketValue} CR</span>
                      </div>
                      <div class="inventory-item-bottom">
                        <span class="inventory-saturation">SATURATION: ${Math.floor(saturation * 100)}%</span>
                        ${
                          isHub
                            ? `<button class="sci-fi-btn inventory-mini-action" data-action="sell" data-index="${index}" type="button">Liquidate</button>`
                            : '<span class="inventory-field-note">SELL AT HUB</span>'
                        }
                      </div>
                    </article>
                  `;
                })
                .join('')
        }
      </div>
      <div class="inventory-footer">
        <div class="inventory-footer-row">
          <span>ESTIMATED NET VALUE</span>
          <strong>${estimatedValue} CR</strong>
        </div>
        <div class="inventory-footer-hint">AETHER-CORP LOGISTICS // TAB TO CLOSE</div>
      </div>
    `;
  }

  private renderLoadout(): string {
    const state = gameState.get();
    const weapons: WeaponType[] = ['pistol', 'shotgun', 'smg'];

    return `
      <div class="overlay-scroll inventory-scroll">
        <section class="inventory-section">
          <h3 class="overlay-section-label">ACTIVE WEAPON</h3>
          <div class="inventory-weapon-grid">
            ${weapons
              .map((weapon) => {
                const isEquipped = state.equippedWeapon === weapon;
                return `
                  <button
                    class="inventory-weapon-card ${isEquipped ? 'inventory-weapon-card-active' : ''}"
                    data-action="equip"
                    data-weapon="${weapon}"
                    type="button"
                  >
                    <span class="inventory-weapon-name">${weapon.toUpperCase()}</span>
                    <span class="inventory-weapon-ammo">${state.ammo[weapon]} RESERVE</span>
                    <span class="inventory-weapon-state">${isEquipped ? 'EQUIPPED' : 'READY'}</span>
                  </button>
                `;
              })
              .join('')}
          </div>
        </section>
        <section class="inventory-section">
          <h3 class="overlay-section-label">SUIT STATUS</h3>
          <div class="inventory-stat-grid">
            <div class="overlay-stat-card">
              <div class="overlay-stat-label">WEAPON DAMAGE</div>
              <div class="overlay-stat-value">${state.equipment.weaponDamage}</div>
            </div>
            <div class="overlay-stat-card">
              <div class="overlay-stat-label">ARMOR INTEGRITY</div>
              <div class="overlay-stat-value">${state.equipment.armorDurability}</div>
            </div>
            <div class="overlay-stat-card">
              <div class="overlay-stat-label">OXYGEN CAPACITY</div>
              <div class="overlay-stat-value">${state.maxOxygen}</div>
            </div>
            <div class="overlay-stat-card">
              <div class="overlay-stat-label">CREDITS</div>
              <div class="overlay-stat-value">${state.credits}</div>
            </div>
          </div>
        </section>
      </div>
      <div class="inventory-footer">
        <div class="inventory-footer-hint">LOADOUT CHANGES APPLY IMMEDIATELY</div>
      </div>
    `;
  }

  private handleSell(index: number): void {
    const item = gameState.get().inventory[index];
    if (!item) return;
    gameState.sellItem(item);
    this.render();
  }

  private handleEquip(weapon: WeaponType): void {
    gameState.update({ equippedWeapon: weapon });
    this.render();
  }
}
