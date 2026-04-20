import { gameState } from '../../game/state/GameState';

export class ShopUI {
  private container: HTMLDivElement;
  private isVisible = false;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'shop-ui';
    this.container.className = 'glass-panel';
    this.container.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 800px;
      height: 600px;
      display: none;
      z-index: 1000;
      padding: 0;
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

  public isOpen(): boolean {
    return this.isVisible;
  }

  private render(): void {
    const s = gameState.get();
    
    this.container.innerHTML = `
      <div style="height: 70px; background: rgba(255, 255, 255, 0.03); display: flex; align-items: center; padding: 0 30px; border-bottom: 1px solid var(--border-cyan); justify-content: space-between;">
        <span style="text-transform: uppercase; letter-spacing: 5px; font-weight: 300;">Requisitions Terminal</span>
        <div style="display: flex; align-items: center; gap: 15px;">
           <span style="font-size: 10px; opacity: 0.5;">AVAIL_CAPITAL</span>
           <span style="color: var(--neon-orange); font-size: 20px;">${s.credits} CR</span>
        </div>
      </div>

      <div style="padding: 30px; height: 530px; overflow-y: auto;">
        <!-- Categories or Grid -->
        <h3 style="font-size: 10px; letter-spacing: 2px; color: var(--neon-cyan); opacity: 0.5; margin-bottom: 15px;">HARDWARE UPGRADES</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          ${this.renderItem('Calibrated Receiver', '+5 Base Weapon Damage', 250, 'dmg')}
          ${this.renderItem('Reinforced Plating', 'Restore Neural Buffs', 150, 'armor')}
          ${this.renderItem('Sovereign Shotgun', 'CQC Heavy Scatter Gear', 800, 'shotgun')}
          ${this.renderItem('Rapid-Fire SMG', 'Lightweight Burst Gear', 1200, 'smg')}
          ${this.renderItem('High-Cap Oxygen', 'Extended EVA Duration', 500, 'oxy')}
        </div>
        
        <div style="margin-top: 40px; text-align: center;">
            <button class="sci-fi-btn" style="width: 200px; border-color: rgba(255, 255, 255, 0.2); color: rgba(255, 255, 255, 0.5);" onclick="window.closeShop()">Exit Console</button>
        </div>
      </div>
    `;

    (window as any).closeShop = () => this.hide();
    (window as any).buyItem = (id: string, cost: number) => this.handlePurchase(id, cost);
  }

  private renderItem(name: string, desc: string, cost: number, id: string): string {
    const canAfford = gameState.get().credits >= cost;
    return `
      <div style="padding: 20px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-cyan); display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; justify-content: space-between;">
           <span style="font-weight: 600; font-size: 14px;">${name}</span>
           <span style="color: var(--neon-orange); font-size: 12px;">${cost}CR</span>
        </div>
        <div style="font-size: 11px; opacity: 0.5; line-height: 1.4;">${desc}</div>
        <button class="sci-fi-btn" style="font-size: 10px; padding: 8px; ${!canAfford ? 'opacity: 0.3; cursor: not-allowed;' : ''}" onclick="${canAfford ? `buyItem('${id}', ${cost})` : ''}">
           Purchase
        </button>
      </div>
    `;
  }

  private handlePurchase(id: string, cost: number) {
    const s = gameState.get();
    if (s.credits < cost) return;

    if (id === 'dmg') gameState.update({ equipment: { ...s.equipment, weaponDamage: s.equipment.weaponDamage + 5 } });
    if (id === 'shotgun') gameState.update({ equippedWeapon: 'shotgun' });
    if (id === 'smg') gameState.update({ equippedWeapon: 'smg' });
    if (id === 'oxy') gameState.update({ maxOxygen: 200 });
    
    gameState.update({ credits: s.credits - cost });
    this.render();
  }

  public dispose(): void {
    this.container.remove();
  }
}
