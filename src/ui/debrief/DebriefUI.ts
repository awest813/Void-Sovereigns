import type { MissionDefinition } from '../../content/missions/missionData';

export class DebriefUI {
  private root: HTMLDivElement;
  private onContinue: (() => void) | null = null;

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'debrief-root';
    this.root.style.display = 'none';
    document.body.appendChild(this.root);
  }

  setContinueHandler(handler: () => void): void {
    this.onContinue = handler;
  }

  show(mission: MissionDefinition): void {
    this.root.innerHTML = `
      <div class="debrief-card glass-panel">
        <div class="debrief-title">MISSION DEBRIEF</div>
        <div class="debrief-status">STATUS: SUCCESS</div>
        <div class="debrief-line">Mission: ${mission.title}</div>
        <div class="debrief-line">Recovered: ${mission.objectiveName}</div>
        <div class="debrief-line debrief-reward">Reward: ${mission.reward}</div>
        <div class="debrief-note">The data core has been logged and secured.</div>
        <div class="debrief-note">Station records updated. Salvage rights granted.</div>
        <button class="sci-fi-btn debrief-button" type="button">Continue</button>
      </div>
    `;

    const button = this.root.querySelector('.debrief-button') as HTMLButtonElement;
    button.addEventListener('click', () => {
      this.onContinue?.();
    });

    this.root.style.display = 'flex';
  }

  hide(): void {
    this.root.style.display = 'none';
  }

  dispose(): void {
    this.root.remove();
  }
}
