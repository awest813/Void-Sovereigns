import { 
  Scene, 
  Vector3, 
  StandardMaterial, 
  Color3, 
  PointLight, 
  TransformNode,
  AbstractMesh,
  Mesh,
  ParticleSystem,
  Texture,
  Color4
} from '@babylonjs/core';
import { ASSETS } from '../AssetManifest';
import { DungeonGenerator, type RoomNode } from './DungeonGenerator';
import { InteractionSystem } from '../InteractionSystem';
import { HUD } from '../../ui/hud/HUD';
import { HealthSystem } from '../state/HealthSystem';
import { SecurityBot } from '../entities/SecurityBot';
import { BossCenturion } from '../entities/BossCenturion';
import type { Interactable } from '../interactions/Interactable';
import { setupIndustrialPalette } from '../MaterialManager';
import { setupAdvancedRendering } from '../RenderingUtils';
import { createSteamLeak } from '../effects/EnvironmentalHazards';
import { RadioChatter } from '../effects/RadioChatter';
import { gameState } from '../state/GameState';
import { TABLES } from '../state/LootTable';
import { importMeshAsync } from '../BabylonAssetLoader';

export interface MissionZoneLandmarks {
  objectiveItemOrNode: AbstractMesh | TransformNode;
  extractionPoint: Mesh | AbstractMesh;
  lootInteractables: Interactable[];
}

// Optimization: Model Cache
const MODEL_CACHE: Record<string, AbstractMesh> = {};

async function getModel(scene: Scene, path: string): Promise<AbstractMesh> {
  if (MODEL_CACHE[path]) {
    const clone = MODEL_CACHE[path].clone(`${path}_clone`, null);
    if (clone) return clone;
  }
  const result = await importMeshAsync(path, scene);
  const mainMesh = result.meshes[0];
  mainMesh.setEnabled(false); // Hide the template
  MODEL_CACHE[path] = mainMesh;
  
  const instance = mainMesh.clone(`${path}_initial`, null);
  instance!.setEnabled(true);
  return instance!;
}

export async function buildMissionZone(
  scene: Scene, 
  interactionSystem: InteractionSystem, 
  hud: HUD, 
  player: TransformNode, 
  health: HealthSystem,
  biome: 'industrial' | 'arctic' | 'depot' = 'industrial'
): Promise<MissionZoneLandmarks> {
  setupIndustrialPalette(scene, biome);
  await setupAdvancedRendering(scene, 'mission');

  const generator = new DungeonGenerator();
  const rooms = generator.generate(Math.random());
  const waypoints = rooms.map(r => r.position);

  new RadioChatter(scene, hud);

  let objectiveItemOrNode: any;
  let extractionPoint: any;
  const lootInteractables: Interactable[] = [];

  // Pre-load common structural assets to avoid UI freeze
  await Promise.all([
     getModel(scene, ASSETS.ENVIRONMENT.WALL),
     getModel(scene, ASSETS.ENVIRONMENT.FLOOR),
     getModel(scene, ASSETS.ENVIRONMENT.CRATE),
  ]);

  for (const room of rooms) {
    // 1. Structural Mesh
    const wall = await getModel(scene, ASSETS.ENVIRONMENT.WALL);
    wall.position = room.position;
    wall.scaling = new Vector3(room.size.x/2.5, room.size.y/2.5, room.size.z/2.5);
    wall.checkCollisions = true;

    const floor = await getModel(scene, ASSETS.ENVIRONMENT.FLOOR);
    floor.position = room.position.subtract(new Vector3(0, 1.5, 0));
    floor.scaling = new Vector3(room.size.x/2.5, 1, room.size.z/2.5);

    // 2. Room Content
    if (room.id === 'objective') {
       objectiveItemOrNode = await getModel(scene, ASSETS.ENVIRONMENT.CONSOLE);
       objectiveItemOrNode.position = room.position.add(new Vector3(0, 0.5, 0));
       objectiveItemOrNode.scaling = new Vector3(0.5, 0.5, 0.5);
       
       new PointLight('obj_light', objectiveItemOrNode.position, scene).intensity = 1.0;

       if (Math.random() > 0.7) {
          hud.showMessage("CAUTION: APEX ENTITY DETECTED.", 5000);
          new BossCenturion(scene, room.position.add(new Vector3(2, 0, 2)), player, health, hud);
       }
    }

    if (room.type === 'Quarters') {
       extractionPoint = await getModel(scene, ASSETS.SHIPS.DROPSHIP);
       extractionPoint.position = room.position.add(new Vector3(0, -1.5, room.size.z/2 - 4));
       extractionPoint.scaling = new Vector3(1.5, 1.5, 1.5);
       extractionPoint.rotation = new Vector3(0, Math.PI, 0);
    }

    if (room.type === 'Engine') {
       createSteamLeak(scene, room.position.add(new Vector3(0, 0, 0)));
       new SecurityBot(scene, room.position.add(new Vector3(0, 1.5, 0)), player, health, hud, waypoints);
    }

    // 3. Loot
    if (Math.random() > 0.5 && room.id !== 'hub' && room.id !== 'objective') {
       const l = await spawnLootBox(scene, room, interactionSystem, hud);
       lootInteractables.push(l);
    }

    // Pickups (20% chance)
    if (Math.random() > 0.8 && room.id !== 'hub') {
       const type = Math.random() > 0.5 ? 'medkit' : 'ammo';
       await spawnPickup(scene, room, interactionSystem, hud, health, type);
    }

    createDustParticles(scene, room.position, room.size, biome);
  }

  return { objectiveItemOrNode, extractionPoint, lootInteractables };
}

async function spawnLootBox(scene: Scene, room: RoomNode, is: InteractionSystem, hud: HUD): Promise<Interactable> {
  const box = await getModel(scene, ASSETS.ENVIRONMENT.CRATE);
  box.position = room.position.add(new Vector3((Math.random()-0.5)*(room.size.x-2), 0.3, (Math.random()-0.5)*(room.size.z-2)));
  box.scaling = new Vector3(0.6, 0.6, 0.6);
  box.checkCollisions = true;

  const interactable: Interactable = {
    mesh: box as Mesh,
    promptText: 'Search Container',
    onInteract: () => {
       const table = Math.random() > 0.8 ? TABLES.RARE : TABLES.COMMON;
       const item = table.roll();
       if (item) {
         gameState.addLoot({ id: item.id, name: item.name, value: item.baseValue });
         hud.showMessage(`Recovered: ${item.name}`);
       }
       is.unregister(interactable);
       box.dispose();
    }
  };

  is.register(interactable);
  return interactable;
}

async function spawnPickup(scene: Scene, room: RoomNode, is: InteractionSystem, hud: HUD, health: HealthSystem, type: 'medkit' | 'ammo'): Promise<void> {
  const mesh = await getModel(scene, ASSETS.ENVIRONMENT.CRATE);
  mesh.position = room.position.add(new Vector3((Math.random()-0.5)*(room.size.x-4), 0.3, (Math.random()-0.5)*(room.size.z-4)));
  mesh.scaling = new Vector3(0.4, 0.4, 0.4);

  // Apply visual theme
  const color = type === 'medkit' ? new Color3(0, 1, 0.2) : new Color3(1, 0.8, 0);
  mesh.getChildMeshes().forEach(m => {
    if (m.material instanceof StandardMaterial) {
      m.material.emissiveColor = color;
    }
  });

  const interactable: Interactable = {
    mesh: mesh as Mesh,
    promptText: type === 'medkit' ? 'Use Medkit' : 'Take Ammo',
    onInteract: () => {
       if (type === 'medkit') {
          health.heal(50);
          hud.showMessage("NEURAL INTEGRITY RESTORED (+50 HP)");
       } else {
          const ammo = { ...gameState.get().ammo };
          ammo.pistol += 18;
          ammo.shotgun += 6;
          ammo.smg += 36;
          gameState.update({ ammo });
          hud.showMessage("WEAPON CHARGES REPLENISHED");
       }
       mesh.dispose();
       is.unregister(interactable);
    }
  };
  is.register(interactable);
}

function createDustParticles(scene: Scene, position: Vector3, size: Vector3, biome: string): void {
  const ps = new ParticleSystem('dust', 100, scene);
  ps.particleTexture = new Texture('https://www.babylonjs-live.com/assets/textures/flare.png', scene);
  ps.emitter = position;
  ps.minEmitBox = new Vector3(-size.x/2, 0, -size.z/2);
  ps.maxEmitBox = new Vector3(size.x/2, size.y, size.z/2);
  ps.color1 = biome === 'arctic' ? new Color4(0.8, 0.9, 1, 0.1) : new Color4(1, 1, 1, 0.05);
  ps.minSize = 0.01; ps.maxSize = 0.05;
  ps.emitRate = 10;
  ps.start();
}
