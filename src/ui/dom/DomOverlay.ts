export class DomOverlay {
  readonly root: HTMLDivElement;
  readonly panel: HTMLDivElement;

  constructor(id: string, panelClass = '') {
    this.root = document.createElement('div');
    this.root.id = `${id}-root`;
    this.root.className = 'overlay-root';
    this.root.style.display = 'none';

    this.panel = document.createElement('div');
    this.panel.id = id;
    this.panel.className = `overlay-panel glass-panel ${panelClass}`.trim();

    this.root.appendChild(this.panel);
    document.body.appendChild(this.root);
  }

  show(): void {
    this.root.style.display = 'flex';
  }

  hide(): void {
    this.root.style.display = 'none';
  }

  dispose(): void {
    this.root.remove();
  }
}
