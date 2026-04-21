export class MainMenuUI {
  private container: HTMLDivElement;
  private onStart: () => void = () => {};

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'main-menu-ui';
    this.container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle at center, rgba(10, 30, 50, 0.4) 0%, var(--bg-dark) 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-family: 'Outfit', sans-serif;
      z-index: 2000;
      overflow: hidden;
    `;
    this.container.classList.add('scanline-container');
    document.body.appendChild(this.container);
  }

  public show(onStart: () => void): void {
    this.onStart = onStart;
    this.container.style.display = 'flex';
    this.render();
  }

  public hide(): void {
    this.container.style.display = 'none';
  }

  private render(): void {
    const hasSave = localStorage.getItem('void-sovereigns-save') !== null;

    this.container.innerHTML = `
      <div style="text-align: center; margin-bottom: 80px; position: relative;">
        <!-- Animated Geometric Accent -->
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 300px; height: 300px; border: 1px solid var(--border-cyan); border-radius: 50%; opacity: 0.1; animation: rotate 20s linear infinite;"></div>
        
        <h1 style="font-size: 84px; margin: 0; letter-spacing: 24px; font-weight: 100; text-shadow: 0 0 40px rgba(0, 255, 255, 0.3);">VOID</h1>
        <h2 style="font-size: 18px; margin: -10px 0 0 0; letter-spacing: 12px; color: var(--neon-orange); font-weight: 600; opacity: 0.9;">SOVEREIGNS</h2>
        <div style="width: 40px; height: 2px; background: var(--neon-cyan); margin: 30px auto; box-shadow: 0 0 10px var(--neon-cyan);"></div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 24px; width: 340px; z-index: 10;">
        <button id="btn-start" class="sci-fi-btn" style="width: 100%;">
          ${hasSave ? 'Resume Operation' : 'Initialize Command'}
        </button>
        
        <div style="display: flex; gap: 10px;">
           <button class="sci-fi-btn" style="flex: 1; font-size: 10px; opacity: 0.5; padding: 10px; cursor: not-allowed;">Archives</button>
           <button class="sci-fi-btn" style="flex: 1; font-size: 10px; padding: 10px;" onclick="window.closeApp()">Terminal Off</button>
        </div>
      </div>

      <div style="position: absolute; bottom: 60px; font-size: 11px; color: rgba(255, 255, 255, 0.2); letter-spacing: 3px; display: flex; align-items: center; gap: 15px;">
        <span style="color: var(--neon-cyan); opacity: 0.5;">[ SECURITY CLEARANCE: LEVEL 4 ]</span>
        <div style="width: 1px; height: 10px; background: rgba(255, 255, 255, 0.2);"></div>
        <span>AETHER-CORP // BUILD 0.4.5</span>
      </div>

      <style>
        @keyframes rotate { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
      </style>
    `;

    document.getElementById('btn-start')?.addEventListener('click', () => {
      this.hide();
      this.onStart();
    });

    (window as any).closeApp = () => {
        window.close(); // Only works if opened by script, but good for UX feel
    };
  }
}
