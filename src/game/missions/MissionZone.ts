import {
  Scene,
  Vector3,
  MeshBuilder,
  GlowLayer,
  TransformNode,
  PointLight,
  HemisphericLight,
  type Mesh,
} from '@babylonjs/core';
import { createIndustrialDetail, createHazardStripe } from '../VisualUtils';
import { DungeonGenerator } from './DungeonGenerator';
import { getRandomLoot } from '../../content/lootData';
import { createSteamLeak, createFlickeringLight } from '../effects/EnvironmentalHazards';
import { SecurityBot } from '../entities/SecurityBot';
import { RadioChatter } from '../effects/RadioChatter';
import { gameState } from '../state/GameState';
import { HealthSystem } from '../state/HealthSystem';
import { setupIndustrialPalette } from '../MaterialManager';
import { setupAdvancedRendering } from '../RenderingUtils';
import type { Interactable } from '../interactions/Interactable';
import type { InteractionSystem } from '../InteractionSystem';
import type { HUD } from '../../ui/hud/HUD';

export interface MissionZoneLandmarks {
  objectiveItem: Mesh;
  extractionPoint: Mesh;
  lootInteractables: Interactable[];
}

/**
 * Builds a procedurally generated mission zone with complex rooms and hazards.
 * Centralized materials and rendering ensure a consistent 'Doom 3' moody aesthetic.
 */
export function buildMissionZone(
  scene: Scene, 
  interactionSystem: InteractionSystem, 
  hud: HUD, 
  player: TransformNode, 
  health: HealthSystem
): MissionZoneLandmarks {
  const mats = setupIndustrialPalette(scene);
  setupAdvancedRendering(scene, 'mission');

  const glow = new GlowLayer('mz_glow', scene);
  glow.intensity = 0.5;

  const generator = new DungeonGenerator();
  const rooms = generator.generate(Math.random());

  // Radio Chatter System
  new RadioChatter(scene, hud);

  let objectiveItem: Mesh = null as any;
  let extractionPoint: Mesh = null as any;
  const lootInteractables: Interactable[] = [];

  rooms.forEach(room => {
    // 1. Room Shell Creation
    const floor = MeshBuilder.CreateGround(`room_floor_${room.id}`, { width: room.size.x, height: room.size.z }, scene);
    floor.position = room.position;
    floor.material = mats.floor;
    floor.checkCollisions = true;

    // Modular Walls & Details
    const box = MeshBuilder.CreateBox(`room_shell_${room.id}`, { width: room.size.x, height: room.size.y, depth: room.size.z }, scene);
    box.position = room.position.add(new Vector3(0, room.size.y / 2, 0));
    box.material = mats.wall;
    box.flipFaces(true);
    box.checkCollisions = true;

    // Phase 3.1: Modular Pillars in corners
    const corners = [
      new Vector3(-room.size.x/2, 0, -room.size.z/2),
      new Vector3(room.size.x/2, 0, -room.size.z/2),
      new Vector3(-room.size.x/2, 0, room.size.z/2),
      new Vector3(room.size.x/2, 0, room.size.z/2),
    ];
    corners.forEach((c, i) => {
      const p = MeshBuilder.CreateBox(`pillar_${room.id}_${i}`, { width: 0.4, height: room.size.y, depth: 0.4 }, scene);
      p.position = room.position.add(c).add(new Vector3(0, room.size.y/2, 0));
      p.material = mats.wall;
    });

    // Bulkhead panels on walls
    for (let i = 0; i < 4; i++) {
        createIndustrialDetail(scene, 'panel', room.position.add(new Vector3(0, room.size.y/2, 0)));
    }

    // 2. Room Content & Hazards
    if (room.type === 'Bridge') {
       objectiveItem = MeshBuilder.CreateBox('objective_item', { width: 0.6, height: 0.4, depth: 0.6 }, scene);
       objectiveItem.position = room.position.add(new Vector3(0, 0.5, 0));
       objectiveItem.material = mats.objective;
       createHazardStripe(scene, room.position.add(new Vector3(0, 2.5, -room.size.z/2 + 0.1)), new Vector3(0, 0, 0));
    }

    if (room.type === 'Quarters') {
       extractionPoint = MeshBuilder.CreateBox('extraction_point', { width: 2, height: 3, depth: 0.4 }, scene);
       extractionPoint.position = room.position.add(new Vector3(0, 1.5, room.size.z/2 - 0.2));
       extractionPoint.material = mats.extract;
       createHazardStripe(scene, room.position.add(new Vector3(0, 2.5, room.size.z/2 - 0.1)), new Vector3(0, 0, 0));
    }

    if (room.type === 'Engine') {
       createSteamLeak(scene, room.position.add(new Vector3(0, 0, 0)));
       createFlickeringLight(scene, room.position.add(new Vector3(0, 2, 0)));
       new SecurityBot(scene, room.position.add(new Vector3(0, 1.5, 0)), player, health);
    }

    // 3. Procedural Loot
    if (Math.random() > 0.5 && room.id !== 'hub') {
       const l = spawnLootBox(scene, room, mats.loot, interactionSystem, hud);
       lootInteractables.push(l);
    }

    // 4. Detail Greebles
    for(let i=0; i<2; i++) {
       createIndustrialDetail(scene, 'pipe', room.position.add(new Vector3((Math.random()-0.5)*room.size.x, room.size.y-0.2, (Math.random()-0.5)*room.size.z)));
    }

    createDustParticles(scene, room.position, room.size);
  });

  // Global Lighting
  const ambient = new HemisphericLight('mz_ambient', new Vector3(0, 1, 0), scene);
  ambient.intensity = 0.1;
  scene.clearColor.set(0.01, 0.02, 0.03, 1);

  return { objectiveItem, extractionPoint, lootInteractables };
}

function spawnLootBox(scene: Scene, room: any, mat: any, is: InteractionSystem, hud: HUD): Interactable {
  const box = MeshBuilder.CreateBox(`loot_box_${room.id}`, { width: 0.8, height: 0.6, depth: 0.8 }, scene);
  box.position = room.position.add(new Vector3((Math.random()-0.5)*(room.size.x-2), 0.3, (Math.random()-0.5)*(room.size.z-2)));
  box.material = mat;
  box.checkCollisions = true;

  const interactable: Interactable = {
    mesh: box,
    promptText: 'Loot Supply Crate',
    onInteract: () => {
      const loot = getRandomLoot();
      gameState.addLoot({ id: loot.id, name: loot.name, value: loot.value });
      hud.showMessage(`RECOVERED: ${loot.name}`, 3000);
      box.dispose();
      is.unregister(interactable);
    }
  };
  is.register(interactable);
  return interactable;
}

import { ParticleSystem, Texture, Color4 } from '@babylonjs/core';
function createDustParticles(scene: Scene, position: Vector3, size: Vector3): void {
  const ps = new ParticleSystem('dust', 200, scene);
  ps.particleTexture = new Texture('https://www.babylonjs-live.com/assets/textures/flare.png', scene);
  ps.emitter = position;
  ps.minEmitBox = new Vector3(-size.x/2, 0, -size.z/2);
  ps.maxEmitBox = new Vector3(size.x/2, size.y, size.z/2);
  ps.color1 = new Color4(1, 1, 1, 0.1);
  ps.color2 = new Color4(0.8, 0.8, 0.8, 0.05);
  ps.minSize = 0.01;
  ps.maxSize = 0.05;
  ps.minLifeTime = 10;
  ps.maxLifeTime = 15;
  ps.emitRate = 20;
  ps.gravity = new Vector3(0, -0.01, 0);
  ps.start();
}
