import { AdvancedDynamicTexture, Control, Rectangle, TextBlock, ScrollViewer, StackPanel } from '@babylonjs/gui';
import { gameState } from '../../game/state/GameState';

/**
 * Implementation of the Phase 2.1 Backpack System.
 * Provides a dedicated UI overlay to view and manage collected loot.
 */
export class InventoryUI {
  private texture: AdvancedDynamicTexture;
  private container: Rectangle;
  private listRoot: StackPanel;
  private isOpen = false;

  constructor() {
    this.texture = AdvancedDynamicTexture.CreateFullscreenUI('inventory_ui');
    
    // Main Container (Glassmorphic)
    this.container = new Rectangle('inv_container');
    this.container.width = '400px';
    this.container.height = '500px';
    this.container.background = '#1a1e24ee';
    this.container.color = '#44ccff';
    this.container.thickness = 2;
    this.container.cornerRadius = 8;
    this.container.isVisible = false;
    this.texture.addControl(this.container);

    const title = new TextBlock('inv_title', 'CARGO MANIFEST / BACKPACK');
    title.color = '#ffffff';
    title.fontSize = 18;
    title.fontFamily = '"Outfit", sans-serif';
    title.height = '40px';
    title.paddingTop = '10px';
    title.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.container.addControl(title);

    const scroll = new ScrollViewer('inv_scroll');
    scroll.width = '360px';
    scroll.height = '380px';
    scroll.top = '20px';
    scroll.thickness = 0;
    this.container.addControl(scroll);

    this.listRoot = new StackPanel('inv_list');
    this.listRoot.width = '100%';
    scroll.addControl(this.listRoot);

    const footer = new TextBlock('inv_footer', 'PRESS [TAB] TO CLOSE');
    footer.color = '#ffffff44';
    footer.fontSize = 12;
    footer.height = '30px';
    footer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.container.addControl(footer);

    // Keyboard listener
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'tab') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  public toggle(): void {
    this.isOpen = !this.isOpen;
    this.container.isVisible = this.isOpen;
    
    if (this.isOpen) {
      this.refresh();
      // Unlock pointer when inventory is open
      document.exitPointerLock?.();
    } else {
      // Return focus to game if needed
    }
  }

  public refresh(): void {
    this.listRoot.clearControls();
    const items = gameState.get().inventory;

    if (items.length === 0) {
      const empty = new TextBlock('inv_empty', 'NO CARGO DETECTED');
      empty.color = '#666';
      empty.height = '40px';
      this.listRoot.addControl(empty);
      return;
    }

    items.forEach((item, i) => {
      const row = new Rectangle(`inv_row_${i}`);
      row.height = '50px';
      row.width = '100%';
      row.background = '#ffffff05';
      row.thickness = 1;
      row.color = '#ffffff11';
      row.paddingBottom = '5px';
      this.listRoot.addControl(row);

      const name = new TextBlock(`inv_item_name_${i}`, item.name.toUpperCase());
      name.color = '#ffffff';
      name.fontSize = 14;
      name.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      name.left = '10px';
      row.addControl(name);

      const val = new TextBlock(`inv_item_val_${i}`, `${item.value}c`);
      val.color = '#44ccff';
      val.fontSize = 14;
      val.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
      val.right = '10px';
      row.addControl(val);
    });
    
    const total = items.reduce((acc, item) => acc + item.value, 0);
    const totalRow = new TextBlock('inv_total', `ESTIMATED VALUE: ${total}c`);
    totalRow.height = '40px';
    totalRow.color = '#ffcc44';
    totalRow.fontSize = 16;
    this.listRoot.addControl(totalRow);
  }
}
