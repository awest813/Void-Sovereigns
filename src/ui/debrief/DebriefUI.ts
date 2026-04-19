import {
  AdvancedDynamicTexture,
  TextBlock,
  Button,
  StackPanel,
  Rectangle,
  Control,
} from '@babylonjs/gui';
import type { MissionDefinition } from '../../content/missions/missionData';

export class DebriefUI {
  private texture: AdvancedDynamicTexture;
  private container: Rectangle;
  private onContinue: (() => void) | null = null;

  constructor() {
    this.texture = AdvancedDynamicTexture.CreateFullscreenUI('debrief');
    this.container = new Rectangle('debriefContainer');
    this.container.width = '500px';
    this.container.height = '400px';
    this.container.cornerRadius = 4;
    this.container.color = '#44ffcc';
    this.container.thickness = 2;
    this.container.background = '#0a0e14ee';
    this.container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.container.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.container.isVisible = false;
    this.texture.addControl(this.container);
  }

  setContinueHandler(handler: () => void): void {
    this.onContinue = handler;
  }

  show(mission: MissionDefinition): void {
    this.container.clearControls();

    const panel = new StackPanel('debriefPanel');
    panel.width = '85%';
    panel.paddingTop = '24px';
    this.container.addControl(panel);

    panel.addControl(this.makeText('— MISSION DEBRIEF —', 22, '#44ffcc'));
    const spacer1 = this.makeText('', 8, '#000');
    spacer1.height = '16px';
    panel.addControl(spacer1);

    panel.addControl(this.makeText('STATUS: SUCCESS', 20, '#44ff88'));
    const spacer2 = this.makeText('', 8, '#000');
    spacer2.height = '12px';
    panel.addControl(spacer2);

    panel.addControl(this.makeText(`Mission: ${mission.title}`, 15, '#cccccc'));
    panel.addControl(this.makeText(`Recovered: ${mission.objectiveName}`, 15, '#cccccc'));
    panel.addControl(this.makeText(`Reward: ${mission.reward}`, 15, '#ccaa44'));

    const spacer3 = this.makeText('', 8, '#000');
    spacer3.height = '12px';
    panel.addControl(spacer3);

    panel.addControl(
      this.makeText('The data core has been logged and secured.', 13, '#88aaaa')
    );
    panel.addControl(
      this.makeText('Station records updated. Salvage rights granted.', 13, '#88aaaa')
    );

    const spacer4 = this.makeText('', 8, '#000');
    spacer4.height = '20px';
    panel.addControl(spacer4);

    const continueBtn = Button.CreateSimpleButton('debrief_continue', 'CONTINUE');
    continueBtn.width = '160px';
    continueBtn.height = '40px';
    continueBtn.color = '#44ffcc';
    continueBtn.cornerRadius = 2;
    continueBtn.thickness = 1;
    continueBtn.background = '#1a1e24';
    continueBtn.fontFamily = '"Courier New", monospace';
    continueBtn.fontSize = 14;
    continueBtn.onPointerUpObservable.add(() => {
      this.onContinue?.();
    });
    panel.addControl(continueBtn);

    this.container.isVisible = true;
  }

  hide(): void {
    this.container.isVisible = false;
  }

  dispose(): void {
    this.texture.dispose();
  }

  private makeText(text: string, size: number, color: string): TextBlock {
    const tb = new TextBlock();
    tb.text = text;
    tb.color = color;
    tb.fontSize = size;
    tb.fontFamily = '"Courier New", monospace';
    tb.height = `${size + 12}px`;
    tb.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    return tb;
  }
}
