import { Scene, StandardMaterial, Color3 } from '@babylonjs/core';

export const PALETTE = {
  FLOOR: new Color3(0.06, 0.07, 0.08),
  WALL: new Color3(0.1, 0.1, 0.12),
  ACCENT: new Color3(0.3, 0.35, 0.4),
  DANGER: new Color3(0.4, 0.1, 0.05),
  OBJECTIVE: new Color3(0.1, 0.6, 0.4),
  EXTRACT: new Color3(0.5, 0.4, 0.1),
  LOOT: new Color3(0.3, 0.25, 0.1),
  WARNING: new Color3(0.6, 0.5, 0.05), // NASA-punk Yellow
  SAFETY: new Color3(0.5, 0.2, 0.05),  // Safety Orange
};

export function getIndustrialMaterial(scene: Scene, name: string, color: Color3, emissive?: Color3): StandardMaterial {
  let mat = scene.getMaterialByName(`mat_${name}`) as StandardMaterial;
  if (!mat) {
    mat = new StandardMaterial(`mat_${name}`, scene);
    mat.diffuseColor = color;
    mat.specularColor = new Color3(0.1, 0.1, 0.1);
    if (emissive) {
      mat.emissiveColor = emissive;
    }
  }
  return mat;
}

export function setupIndustrialPalette(scene: Scene) {
  return {
    floor: getIndustrialMaterial(scene, 'floor', PALETTE.FLOOR),
    wall: getIndustrialMaterial(scene, 'wall', PALETTE.WALL),
    accent: getIndustrialMaterial(scene, 'accent', PALETTE.ACCENT),
    danger: getIndustrialMaterial(scene, 'danger', PALETTE.DANGER),
    objective: getIndustrialMaterial(scene, 'objective', PALETTE.OBJECTIVE, PALETTE.OBJECTIVE.scale(0.5)),
    extract: getIndustrialMaterial(scene, 'extract', PALETTE.EXTRACT, PALETTE.EXTRACT.scale(0.3)),
    loot: getIndustrialMaterial(scene, 'loot', PALETTE.LOOT),
  };
}
