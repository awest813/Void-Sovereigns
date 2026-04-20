export interface LootDefinition {
  id: string;
  name: string;
  description: string;
  value: number;
}

export const LOOT_POOL: LootDefinition[] = [
  { id: 'scrap_metal', name: 'Industrial Scrap', description: 'Rusted reinforcement bars.', value: 25 },
  { id: 'copper_wire', name: 'Copper Wiring', description: 'Valuable salvaged conductors.', value: 75 },
  { id: 'data_drive', name: 'Encrypted Data Drive', description: 'Contains salvaged station logs.', value: 150 },
  { id: 'fuel_cell', name: 'Stable Fuel Cell', description: 'Still holds a partial charge.', value: 200 },
  { id: 'exotic_tech', name: 'Proto-Tech Fragment', description: 'Unidentified sovereign technology.', value: 500 },
];

export function getRandomLoot(): LootDefinition {
  const rand = Math.random();
  if (rand < 0.1) return LOOT_POOL[4]; // 10% Exotic
  if (rand < 0.3) return LOOT_POOL[3]; // 20% Fuel Cell
  if (rand < 0.5) return LOOT_POOL[2]; // 20% Data Drive
  if (rand < 0.8) return LOOT_POOL[1]; // 30% Copper
  return LOOT_POOL[0]; // 20% Scrap
}
