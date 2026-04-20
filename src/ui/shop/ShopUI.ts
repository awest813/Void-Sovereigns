import {
  AdvancedDynamicTexture,
  TextBlock,
  Button,
  StackPanel,
  Rectangle,
  Control,
} from '@babylonjs/gui';
import { gameState } from '../../game/state/GameState';

export class ShopUI {
  private texture: AdvancedDynamicTexture;
  private container: Rectangle;
  private creditLabel: TextBlock | null = null;
  private isVisible = false;

  constructor() {
    this.texture = AdvancedDynamicTexture.CreateFullscreenUI('shopUI');
    this.container = new Rectangle('shopContainer');
    this.container.width = '700px';
    this.container.height = '500px';
    this.container.cornerRadius = 2;
    this.container.color = '#ffcc44';
    this.container.thickness = 1;
    this.container.background = '#0a0e14cc';
    this.container.isVisible = false;
    this.texture.addControl(this.container);

    this.buildUI();
  }

  private buildUI(): void {
    const panel = new StackPanel('shopPanel');
    panel.width = '90%';
    this.container.addControl(panel);

    const header = new TextBlock('shopHeader', '— SOVEREIGN REQUISITIONS —');
    header.height = '40px';
    header.color = '#ffcc44';
    header.fontSize = 20;
    header.fontFamily = '"Outfit", sans-serif';
    panel.addControl(header);

    this.creditLabel = new TextBlock('creditLabel', `CREDITS: ${gameState.get().credits}`);
    this.creditLabel.height = '30px';
    this.creditLabel.color = '#ffffff';
    this.creditLabel.fontSize = 14;
    this.creditLabel.fontFamily = '"Outfit", sans-serif';
    panel.addControl(this.creditLabel);

    const spacer = new Rectangle('spacer');
    spacer.height = '20px';
    spacer.thickness = 0;
    panel.addControl(spacer);

    // Items
    this.addItem(panel, 'Calibrated Reciever', 'Increase weapon damage by 5', 250, () => {
       const s = gameState.get();
       if (s.credits >= 250) {
         gameState.update({ 
           credits: s.credits - 250,
           equipment: { ...s.equipment, weaponDamage: s.equipment.weaponDamage + 5 }
         });
         this.refresh();
       }
    });

    this.addItem(panel, 'Reinforced Plating', 'Restore armor to 100%', 150, () => {
       const s = gameState.get();
       if (s.credits >= 150) {
         gameState.update({ 
           credits: s.credits - 150,
           equipment: { ...s.equipment, armorDurability: 100 }
         });
         this.refresh();
       }
    });

    this.addItem(panel, 'Sovereign Shotgun', 'High damage scatter shot', 800, () => {
       const s = gameState.get();
       if (s.credits >= 800) {
         gameState.update({ 
           credits: s.credits - 800,
           equippedWeapon: 'shotgun'
         });
         this.refresh();
       }
    });

    this.addItem(panel, 'Rapid-Fire SMG', 'Lightweight high fire-rate', 1200, () => {
       const s = gameState.get();
       if (s.credits >= 1200) {
         gameState.update({ 
           credits: s.credits - 1200,
           equippedWeapon: 'smg'
         });
         this.refresh();
       }
    });

    this.addItem(panel, 'High-Cap Oxygen', 'Increase max oxygen to 200', 500, () => {
       const s = gameState.get();
       if (s.credits >= 500) {
         gameState.update({ 
           credits: s.credits - 500,
           maxOxygen: 200
         });
         this.refresh();
       }
    });

    const closeBtn = Button.CreateSimpleButton('closeShop', 'CLOSE TERMINAL');
    closeBtn.width = '200px';
    closeBtn.height = '40px';
    closeBtn.color = '#ffffff';
    closeBtn.background = '#331111';
    closeBtn.top = '20px';
    closeBtn.onPointerUpObservable.add(() => this.hide());
    panel.addControl(closeBtn);
  }

  private addItem(parent: StackPanel, name: string, desc: string, cost: number, onBuy: () => void): void {
    const itemRect = new Rectangle(`item_${name}`);
    itemRect.height = '80px';
    itemRect.thickness = 1;
    itemRect.color = '#ffffff22';
    itemRect.background = '#ffffff05';
    itemRect.paddingBottom = '10px';
    parent.addControl(itemRect);

    const nameLabel = new TextBlock('n', name);
    nameLabel.color = '#ffffff';
    nameLabel.fontSize = 16;
    nameLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    nameLabel.left = '10px';
    nameLabel.top = '-15px';
    itemRect.addControl(nameLabel);

    const descLabel = new TextBlock('d', desc);
    descLabel.color = '#888888';
    descLabel.fontSize = 12;
    descLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    descLabel.left = '10px';
    descLabel.top = '10px';
    itemRect.addControl(descLabel);

    const buyBtn = Button.CreateSimpleButton('b', `${cost}c`);
    buyBtn.width = '80px';
    buyBtn.height = '30px';
    buyBtn.color = '#000000';
    buyBtn.background = '#ffcc44';
    buyBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    buyBtn.left = '-10px';
    buyBtn.onPointerUpObservable.add(onBuy);
    itemRect.addControl(buyBtn);
  }

  private refresh(): void {
    if (this.creditLabel) {
      this.creditLabel.text = `CREDITS: ${gameState.get().credits}`;
    }
  }

  show(): void {
    this.refresh();
    this.container.isVisible = true;
    this.isVisible = true;
  }

  hide(): void {
    this.container.isVisible = false;
    this.isVisible = false;
  }

  isOpen(): boolean {
    return this.isVisible;
  }

  dispose(): void {
    this.texture.dispose();
  }
}
