import {
  Color3,
  DynamicTexture,
  MeshBuilder,
  Scene,
  StandardMaterial,
  type AbstractMesh,
  type Sound,
} from '@babylonjs/core';

const particleTextures = new WeakMap<Scene, DynamicTexture>();

export function getParticleTexture(scene: Scene): DynamicTexture {
  const cached = particleTextures.get(scene);
  if (cached) return cached;

  const texture = new DynamicTexture('local_particle_dot', { width: 64, height: 64 }, scene, false);
  const context = texture.getContext();
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 30);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.clearRect(0, 0, 64, 64);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  texture.update();
  particleTextures.set(scene, texture);
  return texture;
}

export function createLocalSound(
  name: string,
  _scene: Scene,
  _options: Record<string, unknown> = {}
): Sound {
  return {
    name,
    play: () => undefined,
    stop: () => undefined,
    dispose: () => undefined,
    attachToMesh: () => undefined,
    setPosition: () => undefined,
  } as unknown as Sound;
}

export function createFallbackAssetMesh(path: string, scene: Scene): AbstractMesh {
  const root = MeshBuilder.CreateBox(`fallback_${assetLabel(path)}`, { size: 0.01 }, scene);
  root.isVisible = false;
  const kind = classifyPath(path);

  const mesh = kind === 'weapon'
    ? MeshBuilder.CreateBox(`${root.name}_body`, { width: 0.28, height: 0.18, depth: 1.1 }, scene)
    : kind === 'character'
      ? MeshBuilder.CreateCapsule(`${root.name}_body`, { height: 1.8, radius: 0.35 }, scene)
      : kind === 'ship'
        ? MeshBuilder.CreateBox(`${root.name}_body`, { width: 2.4, height: 0.6, depth: 3.2 }, scene)
        : MeshBuilder.CreateBox(`${root.name}_body`, { width: 1, height: 1, depth: 1 }, scene);

  const material = new StandardMaterial(`${root.name}_mat`, scene);
  material.diffuseColor = colorForKind(kind);
  material.emissiveColor = colorForKind(kind).scale(0.12);
  mesh.material = material;
  mesh.parent = root;
  mesh.checkCollisions = kind === 'environment' || kind === 'ship';
  root.checkCollisions = mesh.checkCollisions;

  return root;
}

function classifyPath(path: string): 'weapon' | 'character' | 'ship' | 'environment' | 'enemy' {
  const normalized = path.toLowerCase();
  if (normalized.includes('/weapons/')) return 'weapon';
  if (normalized.includes('/characters/')) return 'character';
  if (normalized.includes('/ships/') || normalized.includes('/vehicles/')) return 'ship';
  if (normalized.includes('/robots/') || normalized.includes('mech')) return 'enemy';
  return 'environment';
}

function colorForKind(kind: ReturnType<typeof classifyPath>): Color3 {
  switch (kind) {
    case 'weapon':
      return new Color3(0.12, 0.75, 0.95);
    case 'character':
      return new Color3(0.35, 0.55, 0.7);
    case 'ship':
      return new Color3(0.2, 0.24, 0.28);
    case 'enemy':
      return new Color3(0.55, 0.12, 0.08);
    default:
      return new Color3(0.18, 0.2, 0.22);
  }
}

function assetLabel(path: string): string {
  return path
    .split('/')
    .pop()
    ?.replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9_]+/gi, '_')
    .toLowerCase() || 'asset';
}
