import {
  Scene,
  Vector3,
  MeshBuilder,
  GlowLayer,
  TransformNode,
  PointLight,
  SpotLight,
  type Mesh,
} from '@babylonjs/core';
import { addIndustrialClutter, createIndustrialDetail, createHazardStripe } from '../VisualUtils';
import { setupIndustrialPalette, PALETTE } from '../MaterialManager';
import { setupAdvancedRendering } from '../RenderingUtils';
import { createFlickeringLight } from '../effects/EnvironmentalHazards';
import { StationNPC } from '../entities/StationNPC';
import { ASSETS } from '../AssetManifest';
import { importMeshAsync } from '../BabylonAssetLoader';
import { createLocalSound } from '../assets/ProceduralAssets';

export interface HubLandmarks {
  missionTerminal: Mesh;
  npcTerminal: Mesh;
  shopTerminal: Mesh;
  perkTerminal: Mesh;
  decryptionTerminal: Mesh;
  deployPoint: Mesh;
}

/**
 * Builds the Hub station environment with high-fidelity industrial aesthetics.
 * Uses centralized MaterialManager and RenderingUtils for performance and consistency.
 */
export async function buildHubScene(scene: Scene): Promise<HubLandmarks> {
  const mats = setupIndustrialPalette(scene);
  await setupAdvancedRendering(scene, 'hub');

  // 1. Environment Loading (Base placeholder or ship sections)
  // We'll build the ship structure manually for precise 'Ebon Hawk' layout
  const shipRoot = new TransformNode('ship_root', scene);

  // --- Main Hold (Central Hub) ---
  const mainHold = MeshBuilder.CreateCylinder('main_hold', { diameter: 10, height: 3.5, tessellation: 16 }, scene);
  mainHold.position = new Vector3(0, 1.75, 0);
  mainHold.material = mats.wall;
  mainHold.checkCollisions = true;
  mainHold.parent = shipRoot;

  // --- Cockpit (Front) ---
  const cockpit = MeshBuilder.CreateBox('cockpit', { width: 4, height: 3, depth: 5 }, scene);
  cockpit.position = new Vector3(0, 1.5, -7.5);
  cockpit.material = mats.wall;
  cockpit.checkCollisions = true;
  cockpit.parent = shipRoot;

  // --- Engineering (Back) ---
  const engineering = MeshBuilder.CreateBox('engineering', { width: 6, height: 4, depth: 6 }, scene);
  engineering.position = new Vector3(0, 2, 8);
  engineering.material = mats.wall;
  engineering.checkCollisions = true;
  engineering.parent = shipRoot;

  // --- Quarters (Side) ---
  const quarters = MeshBuilder.CreateBox('quarters', { width: 5, height: 3, depth: 4 }, scene);
  quarters.position = new Vector3(-6.5, 1.5, 0);
  quarters.material = mats.wall;
  quarters.checkCollisions = true;
  quarters.parent = shipRoot;

  // --- Hallways ---
  createHallway(scene, new Vector3(0, 1.5, -4), new Vector3(2, 2.5, 3), mats.floor); // To Cockpit
  createHallway(scene, new Vector3(0, 1.5, 4), new Vector3(3, 3, 4), mats.floor);   // To Engine
  createHallway(scene, new Vector3(-4, 1.5, 0), new Vector3(3, 2.5, 2), mats.floor); // To Quarters

  // Atmospheric Details
  createIndustrialDetail(scene, 'intercom', new Vector3(-1.1, 1.8, -4), new Vector3(0, Math.PI/2, 0));
  createIndustrialDetail(scene, 'intercom', new Vector3(1.1, 1.8, 4), new Vector3(0, -Math.PI/2, 0));
  
  createIndustrialDetail(scene, 'console', new Vector3(1.5, 1.2, -9));  // Cockpit side console
  createFlickeringLight(scene, new Vector3(0, 2.5, -8.5)); // Flickering cockpit light

  // Hazard Stripes near transitions
  createHazardStripe(scene, new Vector3(0, 3, -5.5), new Vector3(0, 0, 0)); // Entrance to Cockpit
  createHazardStripe(scene, new Vector3(0, 3, 5.5), new Vector3(0, 0, 0));  // Entrance to Engineering

  // 2. Global Aesthetics (Positional Audio)
  const engineHum = createLocalSound('engine_hum', scene, {
    loop: true,
    autoplay: true,
    spatialSound: true,
    maxDistance: 15,
    volume: 0.3
  });
  engineHum.setPosition(new Vector3(0, 2, 8)); // Source at engineering
  const glow = new GlowLayer('hub_glow', scene);
  glow.intensity = 0.6;
  scene.clearColor.set(0.01, 0.01, 0.02, 1);
  addIndustrialClutter(scene, scene);

  // 3. Landmarks & Terminals (Repositioned for the ship layout)
   const missionTerminal = createTerminal(scene, 'mission', new Vector3(0, 0.9, -9), mats.objective); // In Cockpit
  const npcTerminal = createTerminal(scene, 'npc', new Vector3(-2, 0.9, 0), mats.accent);             // In Main Hold
  const shopTerminal = createTerminal(scene, 'shop', new Vector3(2, 0.9, 0), mats.extract);            // In Main Hold
  const perkTerminal = createTerminal(scene, 'perks', new Vector3(-3, 0.9, 8), mats.accent);           // In Engineering
  const decryptionTerminal = createTerminal(scene, 'decryption', new Vector3(3, 0.9, 8), mats.objective); // In Engineering
  const deployPoint = createTerminal(scene, 'deploy', new Vector3(0, 1.5, 10), mats.extract, true);    // In Engineering/AirLock

  // 4. Injected Life (NPCs)
  new StationNPC(scene, 'guard', new Vector3(1.5, 0, 8.5), Math.PI); // Guard near airlock exit
  new StationNPC(scene, 'engineer', new Vector3(2.5, 0, 1), Math.PI / 2); // Engineer by consoles
  new StationNPC(scene, 'officer', new Vector3(-1.5, 0, -10), 0); // Officer in cockpit area

  // 5. Advanced Props (Ships & Vehicles)
  loadHangarAssets(scene);

  // Wandering Crew
  const patrolPath = [
    new Vector3(0, 0, -8), // Cockpit
    new Vector3(0, 0, 0),  // Main Hold
    new Vector3(0, 0, 6),  // Engineering Entrance
  ];
  new StationNPC(scene, 'wanderer', patrolPath[0], 0, patrolPath);

  // 5. Lighting
  createHubLighting(scene);

  return { missionTerminal, npcTerminal, shopTerminal, perkTerminal, decryptionTerminal, deployPoint };
}

async function loadHangarAssets(scene: Scene) {
  // Extraction Dropship (Visible through "windows" or docked in engineering)
  const shipPack = await importMeshAsync(ASSETS.SHIPS.DROPSHIP, scene);
  const ship = shipPack.meshes[0];
  ship.position = new Vector3(8, 0, 10); // Placed outside the airlock area
  ship.rotation = new Vector3(0, -Math.PI / 4, 0);
  ship.scaling = new Vector3(2.5, 2.5, 2.5); // Giant ship presence

  // Engineering Crane
  const cranePack = await importMeshAsync(ASSETS.VEHICLES.CRANE, scene);
  const crane = cranePack.meshes[0];
  crane.position = new Vector3(-6, 0, 7);
  crane.scaling = new Vector3(1.5, 1.5, 1.5);
  crane.rotation = new Vector3(0, Math.PI / 2, 0);
}

function createHallway(scene: Scene, pos: Vector3, size: Vector3, mat: any): void {
  const hall = MeshBuilder.CreateBox('hallway', { width: size.x, height: size.y, depth: size.z }, scene);
  hall.position = pos;
  hall.material = mat;
}

function createTerminal(scene: Scene, name: string, pos: Vector3, mat: any, isLarge = false): Mesh {
  const t = MeshBuilder.CreateBox(`${name}_terminal`, { 
    width: isLarge ? 2.0 : 1.0, 
    height: isLarge ? 3.0 : 1.8, 
    depth: 0.4 
  }, scene);
  t.position = pos;
  t.material = mat;
  t.checkCollisions = true;

  if (!isLarge) {
    const screen = MeshBuilder.CreatePlane(`${name}_screen`, { width: 0.7, height: 0.5 }, scene);
    screen.position = pos.add(new Vector3(0, 0.4, 0.21));
    screen.material = mat;
  }

  return t;
}

function createHubLighting(scene: Scene): void {
  const light = new PointLight('hub_main_light', new Vector3(0, 4, 0), scene);
  light.intensity = 0.8;
  light.diffuse = PALETTE.INDUSTRIAL.ACCENT;

  const spot = new SpotLight('term_spot', new Vector3(-2, 3, -5), new Vector3(0, -1, 0.2), Math.PI / 3, 2, scene);
  spot.intensity = 0.5;
  spot.diffuse = PALETTE.OBJECTIVE;
}
