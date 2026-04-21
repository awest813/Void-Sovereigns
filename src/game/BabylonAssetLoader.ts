import type { AbstractMesh, AnimationGroup, Scene } from '@babylonjs/core';

type ImportMeshResult = {
  meshes: AbstractMesh[];
  animationGroups: AnimationGroup[];
};

let sceneLoaderPromise: Promise<typeof import('@babylonjs/core/Loading/sceneLoader')> | null = null;
let loadersPromise: Promise<unknown> | null = null;

async function loadSceneLoader() {
  loadersPromise ??= import('@babylonjs/loaders');
  sceneLoaderPromise ??= import('@babylonjs/core/Loading/sceneLoader');
  const [sceneLoaderModule] = await Promise.all([sceneLoaderPromise, loadersPromise]);
  return sceneLoaderModule.SceneLoader;
}

export async function importMeshAsync(path: string, scene: Scene): Promise<ImportMeshResult> {
  const SceneLoader = await loadSceneLoader();
  return SceneLoader.ImportMeshAsync('', '', path, scene) as Promise<ImportMeshResult>;
}
