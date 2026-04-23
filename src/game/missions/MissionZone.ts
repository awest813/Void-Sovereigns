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
  Color4
} from '@babylonjs/core';
import { ASSETS } from '../AssetManifest';
import { DungeonGenerator, type RoomNode, type Direction } from './DungeonGenerator';
import { RoomActivitySystem } from './RoomActivitySystem';
import { AIDirector } from './AIDirector';
import { InteractionSystem } from '../InteractionSystem';
import { HUD } from '../../ui/hud/HUD';
import { HealthSystem } from '../state/HealthSystem';
import { BossCenturion } from '../entities/BossCenturion';
import type { Interactable } from '../interactions/Interactable';
import { setupIndustrialPalette } from '../MaterialManager';
import { setupAdvancedRendering } from '../RenderingUtils';
import { createSteamLeak } from '../effects/EnvironmentalHazards';
import { RadioChatter } from '../effects/RadioChatter';
import { gameState } from '../state/GameState';
import { TABLES } from '../state/LootTable';
import { importMeshAsync } from '../BabylonAssetLoader';
import { getParticleTexture } from '../assets/ProceduralAssets';
import { getGameAssetManager } from '../assets/GameAssetManager';

export interface MissionZoneLandmarks {
  objectiveItemOrNode: AbstractMesh | TransformNode;
  extractionPoint: Mesh | AbstractMesh;
  lootInteractables: Interactable[];
}

async function getModel(scene: Scene, path: string): Promise<AbstractMesh> {
  const result = await importMeshAsync(path, scene);
  return result.meshes[0];
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
  const assetManager = getGameAssetManager(scene);
  new RoomActivitySystem(scene, rooms, player);

  new RadioChatter(scene, hud);

  let objectiveItemOrNode: any;
  let extractionPoint: any;
  const lootInteractables: Interactable[] = [];

  await assetManager.preloadAssets('environment', [
    ASSETS.ENVIRONMENT.WALL,
    ASSETS.ENVIRONMENT.FLOOR,
    ASSETS.ENVIRONMENT.CONSOLE,
    ASSETS.ENVIRONMENT.CRATE,
    ASSETS.SHIPS.DROPSHIP,
  ]);

  await assetManager.preloadAssets('containers', [
    ASSETS.ENEMIES.SECURITY_MECH,
    ASSETS.PICKUPS.AMMO,
    ASSETS.PICKUPS.HEALTH,
    ASSETS.WEAPONS.PISTOL,
    ASSETS.WEAPONS.SHOTGUN,
    ASSETS.WEAPONS.SMG,
  ]);

  for (const room of rooms) {
    // 1. Structural: floor slab + ceiling + oriented wall panels
    await buildRoomStructure(scene, room);

    // 2. Room Content
    if (room.type === 'Objective') {
       objectiveItemOrNode = await getModel(scene, ASSETS.ENVIRONMENT.CONSOLE);
       objectiveItemOrNode.position = room.position.add(new Vector3(0, 0.5, 0));
       objectiveItemOrNode.scaling = new Vector3(0.5, 0.5, 0.5);
       markRoomOccupant(objectiveItemOrNode, room);
       
       const objectiveLight = new PointLight('obj_light', objectiveItemOrNode.position, scene);
       objectiveLight.intensity = 1.0;
       objectiveLight.metadata = { roomId: room.id };

       if (Math.random() > 0.7) {
          hud.showMessage("CAUTION: APEX ENTITY DETECTED.", 5000);
          new BossCenturion(scene, room.position.add(new Vector3(2, 0, 2)), player, health, hud);
       }
    }

    if (room.type === 'Extraction') {
       extractionPoint = await getModel(scene, ASSETS.SHIPS.DROPSHIP);
       extractionPoint.position = room.position.add(new Vector3(0, -1.5, room.size.z/2 - 4));
       extractionPoint.scaling = new Vector3(1.5, 1.5, 1.5);
       extractionPoint.rotation = new Vector3(0, Math.PI, 0);
       markRoomOccupant(extractionPoint, room);
    }

    if (room.type === 'Engine') {
       createSteamLeak(scene, room.position);
    }

    // 3. Loot
    if ((room.type === 'Loot' || Math.random() > 0.65) && room.type !== 'Spawn' && room.type !== 'Objective') {
       const l = await spawnLootBox(scene, room, interactionSystem, hud);
       lootInteractables.push(l);
    }

    // Pickups (20% chance)
    if ((room.type === 'Airlock' || Math.random() > 0.8) && room.type !== 'Spawn') {
       const type = Math.random() > 0.5 ? 'medkit' : 'ammo';
       await spawnPickup(scene, room, interactionSystem, hud, health, type);
    }

    addExtractionBreadcrumb(scene, room);
    createDustParticles(scene, room.position, room.size, biome);
  }

  // 4. AI Director — spawn encounters after all room content is placed
  const director = new AIDirector(rooms);
  director.spawnEncounters(scene, player, health, hud, waypoints);

  if (!objectiveItemOrNode) {
    const fallbackRoom = rooms.find((room) => room.criticalPath && room.type !== 'Spawn') ?? rooms[rooms.length - 1];
    objectiveItemOrNode = await getModel(scene, ASSETS.ENVIRONMENT.CONSOLE);
    objectiveItemOrNode.position = fallbackRoom.position.add(new Vector3(0, 0.5, 0));
    markRoomOccupant(objectiveItemOrNode, fallbackRoom);
  }

  if (!extractionPoint) {
    const fallbackRoom = rooms.filter((room) => room.criticalPath).sort((a, b) => b.depth - a.depth)[0];
    extractionPoint = await getModel(scene, ASSETS.SHIPS.DROPSHIP);
    extractionPoint.position = fallbackRoom.position.add(new Vector3(0, -1.5, fallbackRoom.size.z / 2 - 4));
    markRoomOccupant(extractionPoint, fallbackRoom);
  }

  return { objectiveItemOrNode, extractionPoint, lootInteractables };
}

// ---------------------------------------------------------------------------
// Room structure helpers
// ---------------------------------------------------------------------------

/**
 * Directional transform data for placing a wall panel at each of the four
 * cardinal sides of a room.  The panel faces inward (toward room centre).
 *
 * For N/S panels the span runs along X; for E/W the span runs along Z.
 * The facing direction is stored as a Y-axis rotation in radians.
 */
const SIDE_CONFIGS: Record<
  Direction,
  { offsetFn: (s: Vector3) => Vector3; rotY: number; spanAxis: 'x' | 'z' }
> = {
  N: { offsetFn: (s) => new Vector3(0, 0, -s.z / 2), rotY: 0,            spanAxis: 'x' },
  S: { offsetFn: (s) => new Vector3(0, 0,  s.z / 2), rotY: Math.PI,      spanAxis: 'x' },
  E: { offsetFn: (s) => new Vector3( s.x / 2, 0, 0), rotY: Math.PI / 2,  spanAxis: 'z' },
  W: { offsetFn: (s) => new Vector3(-s.x / 2, 0, 0), rotY: -Math.PI / 2, spanAxis: 'z' },
};

const ALL_DIRS: Direction[] = ['N', 'E', 'S', 'W'];

/**
 * Place structural geometry for one room:
 *   • Floor slab                     (always)
 *   • Ceiling slab                   (always)
 *   • Wall panel per closed side     (skipped where an exit exists)
 */
async function buildRoomStructure(scene: Scene, room: RoomNode): Promise<void> {
  const halfHeight = room.size.y / 2;

  // Floor slab
  const floor = await getModel(scene, ASSETS.ENVIRONMENT.FLOOR);
  floor.position = room.position.subtract(new Vector3(0, halfHeight, 0));
  floor.scaling = new Vector3(room.size.x / 2.5, 1, room.size.z / 2.5);
  markRoomOccupant(floor, room);

  // Ceiling slab (same footprint, flipped up)
  const ceiling = await getModel(scene, ASSETS.ENVIRONMENT.FLOOR);
  ceiling.position = room.position.add(new Vector3(0, halfHeight, 0));
  ceiling.scaling = new Vector3(room.size.x / 2.5, 1, room.size.z / 2.5);
  markRoomOccupant(ceiling, room);

  // Wall panels — one per side that has no exit
  const exitSet = new Set(room.exits);
  for (const dir of ALL_DIRS) {
    if (exitSet.has(dir)) continue; // doorway — leave open

    const { offsetFn, rotY, spanAxis } = SIDE_CONFIGS[dir];
    const span = spanAxis === 'x' ? room.size.x : room.size.z;

    const wall = await getModel(scene, ASSETS.ENVIRONMENT.WALL);
    wall.position = room.position.add(offsetFn(room.size));
    wall.rotation = new Vector3(0, rotY, 0);
    // Scale: span covers the side's length, height covers the room height, depth is thin
    wall.scaling = new Vector3(span / 2.5, room.size.y / 2.5, 0.16);
    wall.checkCollisions = true;
    markRoomOccupant(wall, room);
  }
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
  const mesh = await getModel(scene, type === 'medkit' ? ASSETS.PICKUPS.HEALTH : ASSETS.PICKUPS.AMMO);
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
  ps.particleTexture = getParticleTexture(scene);
  ps.emitter = position;
  ps.minEmitBox = new Vector3(-size.x/2, 0, -size.z/2);
  ps.maxEmitBox = new Vector3(size.x/2, size.y, size.z/2);
  ps.color1 = biome === 'arctic' ? new Color4(0.8, 0.9, 1, 0.1) : new Color4(1, 1, 1, 0.05);
  ps.minSize = 0.01; ps.maxSize = 0.05;
  ps.emitRate = 10;
  ps.start();
}

function markRoomOccupant(mesh: AbstractMesh, room: RoomNode): void {
  mesh.metadata = {
    ...(mesh.metadata ?? {}),
    roomId: room.id,
    roomConnections: room.connections,
    roomShape: room.shape,
    criticalPath: room.criticalPath,
    roomCullable: true,
  };
  mesh.getChildMeshes().forEach((child) => {
    child.metadata = {
      ...(child.metadata ?? {}),
      roomId: room.id,
      roomConnections: room.connections,
      roomShape: room.shape,
      criticalPath: room.criticalPath,
      roomCullable: true,
    };
  });
}

function addExtractionBreadcrumb(scene: Scene, room: RoomNode): void {
  if (!room.criticalPath || room.type === 'Spawn') return;
  const light = new PointLight(`breadcrumb_${room.id}`, room.position.add(new Vector3(0, 2.2, 0)), scene);
  light.intensity = Math.min(0.55, 0.08 + room.depth * 0.04);
  light.range = 5;
  light.diffuse = room.type === 'Extraction'
    ? new Color3(0.1, 1, 0.8)
    : new Color3(0.8, 0.12, 0.08);
  light.metadata = { roomId: room.id };
}
