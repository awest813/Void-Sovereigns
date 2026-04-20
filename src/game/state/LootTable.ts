export interface LootEntry {
  id: string;
  name: string;
  baseValue: number;
  weight: number; 
  category: 'scrap' | 'valuable' | 'relic' | 'ammo';
}

export class LootTable {
  private entries: LootEntry[] = [];
  private totalWeight = 0;

  constructor(entries?: LootEntry[]) {
    if (entries) {
      entries.forEach(e => this.add(e));
    }
  }

  public add(entry: LootEntry): void {
    this.entries.push(entry);
    this.totalWeight += entry.weight;
  }

  public roll(): LootEntry | null {
    if (this.totalWeight === 0) return null;

    let random = Math.random() * this.totalWeight;
    for (const entry of this.entries) {
      if (random < entry.weight) {
        return entry;
      }
      random -= entry.weight;
    }
    return null;
  }
}

// Global Definitions
export const TABLES = {
  COMMON: new LootTable([
    { id: 'scrap_metal', name: 'Industrial Scrap', baseValue: 50, weight: 50, category: 'scrap' },
    { id: 'sensor_array', name: 'Damaged Sensor', baseValue: 120, weight: 20, category: 'valuable' },
    { id: 'ammo_pack', name: 'Standard Ammo Crate', baseValue: 25, weight: 30, category: 'ammo' },
  ]),
  RARE: new LootTable([
    { id: 'data_drive', name: 'Encrypted Data Drive', baseValue: 450, weight: 60, category: 'valuable' },
    { id: 'neural_link', name: 'Neural Link Module', baseValue: 800, weight: 20, category: 'relic' },
    { id: 'ammo_supply', name: 'Bulk Ammo Supply', baseValue: 100, weight: 20, category: 'ammo' },
  ]),
  BOSS: new LootTable([
    { id: 'boss_shard', name: 'Centurion Core Shard', baseValue: 5000, weight: 85, category: 'relic' },
    { id: 'relic_weapon', name: 'Void-Touched Relic', baseValue: 15000, weight: 10, category: 'relic' },
    { id: 'apex_nanites', name: 'Apex Nanite Cluster', baseValue: 25000, weight: 5, category: 'relic' },
  ])
};
