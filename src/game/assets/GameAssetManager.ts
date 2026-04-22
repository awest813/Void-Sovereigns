import {
  AssetsManager,
  Mesh,
  MeshBuilder,
  Scene,
  type AbstractMesh,
  type AnimationGroup,
  type AssetContainer,
} from '@babylonjs/core';
import { createFallbackAssetMesh } from './ProceduralAssets';

export type AssetPhase = 'boot' | 'core' | 'environment' | 'containers';

export type AssetProgress = {
  phase: AssetPhase;
  remaining: number;
  total: number;
  label: string;
};

export type ImportMeshResult = {
  meshes: AbstractMesh[];
  animationGroups: AnimationGroup[];
};

const AVAILABLE_ASSET_PATHS = new Set([
  '/assets/glb/pixel_room.glb',
  '/assets/env/Modular_Crate.glb',
  '/assets/pickups/Ammo.glb',
  '/assets/pickups/Health.glb',
  '/assets/robots/Animated_Mech.glb',
  '/assets/ships/Modular_Dropship.glb',
]);

const managers = new WeakMap<Scene, GameAssetManager>();
let loadersPromise: Promise<unknown> | null = null;

export function getGameAssetManager(scene: Scene): GameAssetManager {
  let manager = managers.get(scene);
  if (!manager) {
    manager = new GameAssetManager(scene);
    managers.set(scene, manager);
  }
  return manager;
}

export class GameAssetManager {
  private containers = new Map<string, AssetContainer>();
  private fallbackTemplates = new Map<string, AbstractMesh>();

  constructor(private readonly scene: Scene) {}

  async preloadAssets(
    phase: AssetPhase,
    paths: string[],
    onProgress?: (progress: AssetProgress) => void
  ): Promise<void> {
    const loadablePaths = paths.filter((path) => AVAILABLE_ASSET_PATHS.has(path) && !this.containers.has(path));
    const fallbackPaths = paths.filter((path) => !AVAILABLE_ASSET_PATHS.has(path));

    fallbackPaths.forEach((path) => this.ensureFallbackTemplate(path));
    if (loadablePaths.length === 0) {
      onProgress?.({ phase, remaining: 0, total: paths.length, label: 'procedural-fallbacks' });
      return;
    }

    loadersPromise ??= import('@babylonjs/loaders');
    await loadersPromise;

    const assetsManager = new AssetsManager(this.scene);
    assetsManager.useDefaultLoadingScreen = false;

    loadablePaths.forEach((path) => {
      const { rootUrl, filename } = splitAssetPath(path);
      const task = assetsManager.addContainerTask(path, '', rootUrl, filename);
      task.onSuccess = ({ loadedContainer }) => {
        loadedContainer.animationGroups.forEach((animation) => animation.stop());
        this.containers.set(path, loadedContainer);
      };
      task.onError = () => {
        this.ensureFallbackTemplate(path);
      };
    });

    assetsManager.onProgress = (remaining, total, task) => {
      onProgress?.({ phase, remaining, total, label: task.name });
    };

    try {
      await assetsManager.loadAsync();
    } catch {
      loadablePaths.forEach((path) => {
        if (!this.containers.has(path)) this.ensureFallbackTemplate(path);
      });
    }
  }

  async instantiate(path: string): Promise<ImportMeshResult> {
    if (!this.containers.has(path) && !this.fallbackTemplates.has(path)) {
      await this.preloadAssets('containers', [path]);
    }

    const container = this.containers.get(path);
    if (container) {
      const instance = container.instantiateModelsToScene((name) => `${name}_instance`, true);
      const meshes = instance.rootNodes.filter((node): node is AbstractMesh => 'getChildMeshes' in node);
      return {
        meshes,
        animationGroups: instance.animationGroups,
      };
    }

    return {
      meshes: [this.instantiateFallback(path)],
      animationGroups: [],
    };
  }

  dispose(): void {
    this.containers.forEach((container) => container.dispose());
    this.containers.clear();
    this.fallbackTemplates.forEach((mesh) => mesh.dispose());
    this.fallbackTemplates.clear();
  }

  private ensureFallbackTemplate(path: string): AbstractMesh {
    const cached = this.fallbackTemplates.get(path);
    if (cached) return cached;

    const template = createFallbackAssetMesh(path, this.scene);
    template.setEnabled(false);
    template.getChildMeshes().forEach((mesh) => mesh.setEnabled(false));
    this.fallbackTemplates.set(path, template);
    return template;
  }

  private instantiateFallback(path: string): AbstractMesh {
    const template = this.ensureFallbackTemplate(path);
    const root = MeshBuilder.CreateBox(`${template.name}_root_instance`, { size: 0.01 }, this.scene);
    root.isVisible = false;
    root.checkCollisions = template.checkCollisions;

    const templateChildren = template.getChildMeshes();
    if (templateChildren.length === 0) {
      const clone = template.clone(`${template.name}_clone`, null, false);
      if (clone) return clone;
      return root;
    }

    templateChildren.forEach((child) => {
      const instance = child instanceof Mesh
        ? child.createInstance(`${child.name}_instance`)
        : child.clone(`${child.name}_instance`, root, false);
      if (!instance) return;
      instance.parent = root;
      instance.position.copyFrom(child.position);
      instance.rotation.copyFrom(child.rotation);
      instance.scaling.copyFrom(child.scaling);
      instance.checkCollisions = child.checkCollisions;
      instance.setEnabled(true);
    });

    return root;
  }
}

function splitAssetPath(path: string): { rootUrl: string; filename: string } {
  const separator = path.lastIndexOf('/');
  if (separator === -1) return { rootUrl: '', filename: path };
  return {
    rootUrl: path.slice(0, separator + 1),
    filename: path.slice(separator + 1),
  };
}
