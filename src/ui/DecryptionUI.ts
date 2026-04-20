import { gameState } from '../game/state/GameState';
import { TABLES } from '../game/state/LootTable';

export class DecryptionUI {
  private container: HTMLDivElement;
  private isVisible = false;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'decryption-ui';
    this.container.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 500px;
      padding: 40px;
      background: rgba(10, 15, 20, 0.95);
      border: 1px solid rgba(0, 255, 255, 0.3);
      border-radius: 4px;
      color: #00ffff;
      font-family: 'Outfit', sans-serif;
      display: none;
      z-index: 1000;
      backdrop-filter: blur(20px);
      box-shadow: 0 0 50px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(0, 255, 255, 0.1);
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

  private render(): void {
    const s = gameState.get();
    const encryptedItems = s.inventory.filter(i => i.id.includes('drive') || i.id.includes('shard'));

    this.container.innerHTML = `
      <h2 style="margin-top: 0; text-transform: uppercase; letter-spacing: 2px; border-bottom: 2px solid #00ffff; padding-bottom: 10px;">Neural Decryption</h2>
      <p style="color: rgba(0, 255, 255, 0.6); font-size: 14px;">Select encrypted hardware for forensic analysis and value extraction.</p>
      
      <div id="decrypt-list" style="max-height: 300px; overflow-y: auto; margin: 20px 0;">
        ${encryptedItems.length > 0 ? encryptedItems.map(item => `
          <div class="decrypt-item" style="padding: 15px; background: rgba(0, 255, 255, 0.05); border: 1px solid rgba(0, 255, 255, 0.1); margin-bottom: 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;" onclick="window.startDecryption('${item.id}')">
            <span>${item.name}</span>
            <span style="color: #ffaa00; font-size: 12px; border: 1px solid currentColor; padding: 2px 6px;">[ENCRYPTED]</span>
          </div>
        `).join('') : '<p style="text-align: center; padding: 40px; color: rgba(0, 255, 255, 0.3);">NO ENCRYPTED DRIVES DETECTED IN INVENTORY</p>'}
      </div>

      <button style="width: 100%; padding: 12px; background: transparent; border: 1px solid #00ffff; color: #00ffff; cursor: pointer; font-family: inherit; font-weight: bold; text-transform: uppercase;" onclick="window.closeDecryption()">Exit Terminal</button>
    `;

    // Global listeners for button clicks (Babylon setup workaround)
    (window as any).startDecryption = (itemId: string) => this.runSequence(itemId);
    (window as any).closeDecryption = () => this.hide();
  }

  private runSequence(itemId: string): void {
    const item = gameState.get().inventory.find(i => i.id === itemId);
    if (!item) return;

    this.container.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <div style="font-size: 24px; margin-bottom: 20px; animation: pulse 1s infinite;">DECRYPTING ${item.name}...</div>
        <div style="width: 100%; height: 8px; background: rgba(0, 255, 255, 0.1); border-radius: 4px; overflow: hidden;">
          <div id="decrypt-bar" style="width: 0%; height: 100%; background: #00ffff; transition: width 3s linear;"></div>
        </div>
      </div>
    `;

    setTimeout(() => {
      const bar = document.getElementById('decrypt-bar');
      if (bar) bar.style.width = '100%';
    }, 100);

    setTimeout(() => {
      this.finishDecryption(item);
    }, 3200);
  }

  private finishDecryption(oldItem: any): void {
    // Roll for actual reward (Inspired by Lootie/LootTable)
    const reward = TABLES.RARE.roll() || { id: 'credits', name: 'Raw Credits', baseValue: 500 };
    
    // Update State
    const s = gameState.get();
    const newInv = s.inventory.filter(i => i !== oldItem);
    gameState.update({ 
        inventory: [...newInv, { id: reward.id, name: reward.name, value: reward.baseValue }] 
    });

    this.container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #ffaa00;">
        <div style="font-size: 14px; color: rgba(255, 255, 255, 0.5); margin-bottom: 50px;">ANALYSIS COMPLETE</div>
        <div style="font-size: 32px; font-weight: bold; margin-bottom: 20px; text-shadow: 0 0 20px rgba(255, 170, 0, 0.5);">${reward.name}</div>
        <div style="color: #00ffff; margin-bottom: 30px;">VALUATION: ${reward.baseValue} CR</div>
        <button style="padding: 10px 30px; background: #00ffff; border: none; color: #000; font-weight: bold; cursor: pointer;" onclick="window.closeDecryption()">CLAIM</button>
      </div>
    `;
  }
}
