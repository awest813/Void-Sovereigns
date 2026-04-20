export class LoadingUI {
  private container: HTMLDivElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'loading-ui';
    this.container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #050a10;
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #00ffff;
      font-family: 'Outfit', sans-serif;
      z-index: 3000;
      transition: opacity 0.5s ease-out;
    `;
    document.body.appendChild(this.container);
  }

  public async show(duration = 500): Promise<void> {
    this.container.style.display = 'flex';
    this.container.style.opacity = '1';
    this.render();
    return new Promise(resolve => setTimeout(resolve, duration));
  }

  public async hide(): Promise<void> {
    this.container.style.opacity = '0';
    return new Promise(resolve => {
        setTimeout(() => {
            this.container.style.display = 'none';
            resolve();
        }, 500);
    });
  }

  private render(): void {
    this.container.innerHTML = `
      <div style="text-align: center;">
        <div style="font-size: 14px; letter-spacing: 4px; color: rgba(0, 255, 255, 0.5); margin-bottom: 20px; text-transform: uppercase;">Neural Link Synchronization</div>
        <div style="width: 250px; height: 2px; background: rgba(0, 255, 255, 0.1); position: relative; overflow: hidden;">
          <div style="position: absolute; height: 100%; background: #00ffff; width: 50%; left: -50%; animation: scan 1.5s infinite linear;"></div>
        </div>
        <div style="margin-top: 15px; font-size: 10px; opacity: 0.3;">ESTABLISHING UPLINK TO SECTOR...</div>
      </div>
      
      <style>
        @keyframes scan {
          from { left: -50%; }
          to { left: 100%; }
        }
      </style>
    `;
  }
}
