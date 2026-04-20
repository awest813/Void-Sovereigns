import { gameState } from '../../game/state/GameState';

export class PerkMenuUI {
  private container: HTMLDivElement;
  private isVisible = false;

  private perks = [
    { id: 'TITAN SHIELDS', desc: 'Double maximum shield capacity (200 Units)', icon: '🛡️' },
    { id: 'MARATHONER', desc: '+25% Base Movement Speed', icon: '🏃' },
    { id: 'OXY-EFFICIENCY', desc: '-40% Oxygen Consumption Rate', icon: '🫁' },
    { id: 'DEVASTATOR MELEE', desc: 'Double Melee Bash Damage (100 Damage)', icon: '👊' },
  ];

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'perk-menu-ui';
    this.container.className = 'glass-panel';
    this.container.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 700px;
      height: 600px;
      display: none;
      z-index: 1000;
      padding: 0;
      overflow: hidden;
    `;
    document.body.appendChild(this.container);

    (window as any).unlockPerk = (id: string) => this.handleUnlock(id);
    (window as any).closePerks = () => this.hide();
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

  public toggle(): void {
    if (this.isVisible) this.hide();
    else this.show();
  }

  private render(): void {
    const s = gameState.get();
    
    this.container.innerHTML = `
      <div style="height: 70px; background: rgba(255, 255, 255, 0.03); display: flex; align-items: center; padding: 0 30px; border-bottom: 1px solid var(--border-cyan); justify-content: space-between;">
        <span style="letter-spacing: 5px; font-weight: 300;">Neural Augmentation Interface</span>
        <div style="display: flex; align-items: center; gap: 15px;">
           <span style="font-size: 10px; opacity: 0.5;">AVAIL_NEURAL_CAPACITY</span>
           <span style="color: var(--neon-cyan); font-size: 20px;">${s.perkPoints} PN</span>
        </div>
      </div>

      <div style="padding: 40px; height: 530px; overflow-y: auto;">
        <div style="display: grid; grid-template-columns: 1fr; gap: 15px;">
          ${this.perks.map(p => {
             const has = gameState.hasPerk(p.id);
             const canAfford = s.perkPoints > 0;
             return `
               <div style="padding: 20px; background: ${has ? 'rgba(0, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)'}; border: 1px solid ${has ? 'var(--neon-cyan)' : 'var(--border-cyan)'}; display: flex; align-items: center; gap: 20px;">
                  <div style="font-size: 24px; opacity: ${has ? '1' : '0.3'};">${p.icon}</div>
                  <div style="flex-grow: 1;">
                     <div style="font-size: 14px; font-weight: 600; color: ${has ? 'var(--neon-cyan)' : '#fff'};">${p.id}</div>
                     <div style="font-size: 11px; opacity: 0.5; margin-top: 4px;">${p.desc}</div>
                  </div>
                  <button class="sci-fi-btn" style="font-size: 10px; padding: 6px 12px; ${has || !canAfford ? 'opacity: 0.3; cursor: not-allowed;' : ''}" onclick="${!has && canAfford ? `unlockPerk('${p.id}')` : ''}">
                     ${has ? 'LINK_ACTIVE' : 'INITIALIZE'}
                  </button>
               </div>
             `;
          }).join('')}
        </div>

        <div style="margin-top: 40px; text-align: center;">
            <button class="sci-fi-btn" style="width: 200px; border-color: rgba(255, 255, 255, 0.2); color: rgba(255, 255, 255, 0.5);" onclick="window.closePerks()">Disconnect</button>
        </div>
      </div>
    `;
  }

  private handleUnlock(id: string) {
    if (gameState.unlockPerk(id)) {
       this.render();
    }
  }

  public dispose(): void {
    this.container.remove();
  }
}
