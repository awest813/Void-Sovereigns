import type { Scene } from '@babylonjs/core';
import { getGameAssetManager, type ImportMeshResult } from './assets/GameAssetManager';

export async function importMeshAsync(path: string, scene: Scene): Promise<ImportMeshResult> {
  return getGameAssetManager(scene).instantiate(path);
}
