import { Scene, StandardMaterial, Color3 } from '@babylonjs/core';

export const PALETTE = {
  INDUSTRIAL: {
    WALL: new Color3(0.1, 0.1, 0.12),
    FLOOR: new Color3(0.06, 0.07, 0.08),
    ACCENT: new Color3(0.3, 0.35, 0.4),
  },
  ARCTIC: {
    WALL: new Color3(0.8, 0.82, 0.9),
    FLOOR: new Color3(0.6, 0.65, 0.75),
    ACCENT: new Color3(0.4, 0.6, 1.0),
  },
  DEPOT: {
    WALL: new Color3(0.05, 0.05, 0.06),
    FLOOR: new Color3(0.03, 0.03, 0.04),
    ACCENT: new Color3(0.8, 0.3, 0.1),
  },
  DANGER: new Color3(0.4, 0.1, 0.05),
  OBJECTIVE: new Color3(0.1, 0.6, 0.4),
  EXTRACT: new Color3(0.5, 0.4, 0.1),
  LOOT: new Color3(0.3, 0.25, 0.1),
};

export function getIndustrialMaterial(scene: Scene, name: string, color: Color3, emissive?: Color3): StandardMaterial {
  let mat = scene.getMaterialByName(`mat_${name}`) as StandardMaterial;
  if (!mat) {
    mat = new StandardMaterial(`mat_${name}`, scene);
    mat.diffuseColor = color;
    mat.specularColor = new Color3(0.1, 0.1, 0.1);
    if (emissive) mat.emissiveColor = emissive;
  }
  return mat;
}

export function setupIndustrialPalette(scene: Scene, biome: 'industrial' | 'arctic' | 'depot' = 'industrial') {
  const p = biome === 'arctic' ? PALETTE.ARCTIC : (biome === 'depot' ? PALETTE.DEPOT : PALETTE.INDUSTRIAL);
  
  return {
    wall: getIndustrialMaterial(scene, `wall_${biome}`, p.WALL),
    floor: getIndustrialMaterial(scene, `floor_${biome}`, p.FLOOR),
    accent: getIndustrialMaterial(scene, `accent_${biome}`, p.ACCENT),
    danger: getIndustrialMaterial(scene, `danger_${biome}`, PALETTE.DANGER),
    objective: getIndustrialMaterial(scene, `objective_${biome}`, PALETTE.OBJECTIVE, PALETTE.OBJECTIVE.scale(0.5)),
    extract: getIndustrialMaterial(scene, `extract_${biome}`, PALETTE.EXTRACT, PALETTE.EXTRACT.scale(0.3)),
    loot: getIndustrialMaterial(scene, `loot_${biome}`, PALETTE.LOOT),
  };
}
