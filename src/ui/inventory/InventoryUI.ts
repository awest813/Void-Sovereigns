import { gameState } from '../../game/state/GameState';

export class InventoryUI {
  private container: HTMLDivElement;
  private isOpen = false;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'inventory-ui';
    this.container.className = 'glass-panel';
    this.container.style.cssText = `
      position: absolute;
      top: 20px;
      right: -450px;
      width: 400px;
      height: calc(100% - 40px);
      transition: right 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 1100;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    `;
    document.body.appendChild(this.container);

    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'tab') {
        e.preventDefault();
        this.toggle();
      }
    });

    (window as any).sellItem = (index: number) => this.handleSell(index);
  }

  public toggle(): void {
    this.isOpen = !this.isOpen;
    this.container.style.right = this.isOpen ? '20px' : '-450px';
    
    if (this.isOpen) {
      this.render();
      document.exitPointerLock?.();
    }
  }

  private render(): void {
    const s = gameState.get();
    const items = s.inventory;
    const isHub = s.currentScene === 'hub';

    this.container.innerHTML = `
      <div style="padding: 30px; border-bottom: 1px solid var(--border-cyan); display: flex; align-items: center; justify-content: space-between;">
        <span style="letter-spacing: 5px; font-weight: 300;">Cargo Manifest</span>
        <div class="status-badge" style="${isHub ? 'border-color: var(--neon-cyan); color: var(--neon-cyan); background: rgba(0,255,255,0.05);' : ''}">${isHub ? 'COMM_LINK ACTIVE' : 'FIELD_OP'}</div>
      </div>

      <div style="flex-grow: 1; overflow-y: auto; padding: 20px;">
        ${items.length === 0 ? `
          <div style="text-align: center; padding: 100px 0; opacity: 0.3;">
            <div style="font-size: 48px; margin-bottom: 20px;">∅</div>
            <div style="font-size: 10px; letter-spacing: 2px;">CARGO BAY EMPTY</div>
          </div>
        ` : items.map((item, i) => {
          const marketValue = gameState.getMarketValue(item.id, item.value);
          const saturation = s.marketSaturation[item.id] || 0;
          
          return `
            <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-cyan); padding: 15px; margin-bottom: 10px;">
               <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                  <span style="font-size: 13px; font-weight: 600; letter-spacing: 1px;">${item.name.toUpperCase()}</span>
                  <span style="color: var(--neon-orange); font-size: 12px;">${marketValue} CR</span>
               </div>
               
               <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div style="font-size: 10px; opacity: 0.4;">SATURATION: ${Math.floor(saturation * 100)}%</div>
                  ${isHub ? `<button class="sci-fi-btn" style="padding: 4px 10px; font-size: 10px; border-radius: 2px;" onclick="sellItem(${i})">Liquidate</button>` : ''}
               </div>
            </div>
          `;
        }).join('')}
      </div>

      <div style="padding: 30px; background: rgba(255, 255, 255, 0.03); border-top: 1px solid var(--border-cyan);">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
           <span style="font-size: 10px; opacity: 0.5;">ESTIMATED NET VALUE</span>
           <span style="color: var(--neon-cyan); font-weight: 600;">${items.reduce((acc, it) => acc + gameState.getMarketValue(it.id, it.value), 0)} CR</span>
        </div>
        <div style="font-size: 9px; opacity: 0.3; text-align: center; margin-top: 20px; letter-spacing: 2px;">AETHER-CORP LOGISTICS HUB // TAB TO CLOSE</div>
      </div>
    `;
  }

  private handleSell(index: number) {
    const item = gameState.get().inventory[index];
    if (item) {
       gameState.sellItem(item);
       this.render();
    }
  }

  public dispose(): void {
    this.container.remove();
  }
}
