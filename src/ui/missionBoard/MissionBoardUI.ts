import {
  AdvancedDynamicTexture,
  TextBlock,
  Button,
  StackPanel,
  Rectangle,
  Control,
} from '@babylonjs/gui';
import type { MissionDefinition } from '../../content/missions/missionData';

export type MissionBoardAction = 'accept' | 'deploy' | 'close';

export class MissionBoardUI {
  private texture: AdvancedDynamicTexture;
  private container: Rectangle;
  private onAction: ((action: MissionBoardAction) => void) | null = null;
  private visible = false;

  constructor() {
    this.texture = AdvancedDynamicTexture.CreateFullscreenUI('missionBoard');
    this.container = new Rectangle('mbContainer');
    this.container.width = '600px';
    this.container.height = '500px';
    this.container.cornerRadius = 2;
    this.container.color = '#44ffcc';
    this.container.thickness = 1;
    this.container.background = '#0a0e14cc'; // Frosted glass
    this.container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.container.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.container.isVisible = false;
    this.texture.addControl(this.container);

    // Will be populated when show() is called
  }

  setActionHandler(handler: (action: MissionBoardAction) => void): void {
    this.onAction = handler;
  }

  show(mission: MissionDefinition, canAccept: boolean, canDeploy: boolean): void {
    // Clear previous content
    this.container.clearControls();

    const panel = new StackPanel('mbPanel');
    panel.width = '90%';
    panel.paddingTop = '20px';
    panel.paddingBottom = '20px';
    this.container.addControl(panel);

    // Header
    const header = this.makeText('— MISSION BOARD —', 22, '#44ffcc');
    header.paddingBottom = '16px';
    panel.addControl(header);

    // Title
    const title = this.makeText(mission.title, 20, '#ffffff');
    title.paddingBottom = '12px';
    panel.addControl(title);

    // Briefing
    const briefing = this.makeText(mission.briefing, 14, '#ffffff');
    briefing.textWrapping = true;
    briefing.paddingBottom = '20px';
    briefing.height = '100px';
    panel.addControl(briefing);

    // Details
    panel.addControl(this.makeText(`LOCATION: ${mission.location}`, 13, '#88aaaa'));
    panel.addControl(this.makeText(`THREAT: ${mission.threat}`, 13, '#88aaaa'));
    panel.addControl(this.makeText(`OBJECTIVE: ${mission.objectiveName}`, 13, '#88aaaa'));
    panel.addControl(this.makeText(`REWARD: ${mission.reward}`, 13, '#ccaa44'));

    // Spacer
    const spacer = this.makeText('', 10, '#000000');
    spacer.height = '20px';
    panel.addControl(spacer);

    // Buttons
    const btnPanel = new StackPanel('mbButtons');
    btnPanel.isVertical = false;
    btnPanel.height = '50px';
    btnPanel.width = '100%';
    panel.addControl(btnPanel);

    if (canAccept) {
      const acceptBtn = this.makeButton('ACCEPT MISSION', '#44ffcc', () => {
        this.onAction?.('accept');
      });
      btnPanel.addControl(acceptBtn);
    }

    if (canDeploy) {
      const deployBtn = this.makeButton('DEPLOY', '#ffcc44', () => {
        this.onAction?.('deploy');
      });
      btnPanel.addControl(deployBtn);
    }

    const closeBtn = this.makeButton('CLOSE', '#886666', () => {
      this.onAction?.('close');
    });
    btnPanel.addControl(closeBtn);

    this.container.isVisible = true;
    this.visible = true;
  }

  hide(): void {
    this.container.isVisible = false;
    this.visible = false;
  }

  isVisible(): boolean {
    return this.visible;
  }

  dispose(): void {
    this.texture.dispose();
  }

  private makeText(text: string, size: number, color: string): TextBlock {
    const tb = new TextBlock();
    tb.text = text;
    tb.color = color;
    tb.fontSize = size;
    tb.fontFamily = '"Outfit", sans-serif';
    tb.height = `${size + 16}px`;
    tb.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    return tb;
  }

  private makeButton(label: string, color: string, onClick: () => void): Button {
    const btn = Button.CreateSimpleButton(`btn_${label}`, label);
    btn.width = '160px';
    btn.height = '40px';
    btn.color = color;
    btn.cornerRadius = 2;
    btn.thickness = 1;
    btn.background = '#1a1e24';
    btn.fontFamily = '"Outfit", sans-serif';
    btn.fontSize = 14;
    btn.paddingLeft = '8px';
    btn.paddingRight = '8px';
    btn.onPointerUpObservable.add(onClick);
    return btn;
  }
}
