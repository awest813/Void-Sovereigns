import {
  Scene,
  Vector3,
  Color3,
  MeshBuilder,
  StandardMaterial,
  HemisphericLight,
  PointLight,
  SpotLight,
  GlowLayer,
  type Mesh,
} from '@babylonjs/core';

// Colors for the industrial sci-fi palette
const FLOOR_COLOR = new Color3(0.08, 0.09, 0.1);
const WALL_COLOR = new Color3(0.12, 0.13, 0.14);
const CEILING_COLOR = new Color3(0.06, 0.07, 0.08);
const TERMINAL_COLOR = new Color3(0.02, 0.08, 0.06);
const TERMINAL_EMISSIVE = new Color3(0.1, 0.6, 0.5);
const DEPLOY_COLOR = new Color3(0.08, 0.06, 0.02);
const DEPLOY_EMISSIVE = new Color3(0.6, 0.5, 0.1);
const ACCENT_COLOR = new Color3(0.15, 0.04, 0.04);
const ACCENT_EMISSIVE = new Color3(0.5, 0.1, 0.05);

function makeMaterial(scene: Scene, name: string, diffuse: Color3, emissive?: Color3): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = diffuse;
  mat.specularColor = new Color3(0.1, 0.1, 0.1);
  if (emissive) {
    mat.emissiveColor = emissive;
  }
  return mat;
}

export interface HubLandmarks {
  missionTerminal: Mesh;
  npcTerminal: Mesh;
  deployPoint: Mesh;
}

export function buildHubScene(scene: Scene): HubLandmarks {
  // Materials
  const floorMat = makeMaterial(scene, 'hub_floor', FLOOR_COLOR);
  const wallMat = makeMaterial(scene, 'hub_wall', WALL_COLOR);
  const ceilingMat = makeMaterial(scene, 'hub_ceiling', CEILING_COLOR);
  const terminalMat = makeMaterial(scene, 'hub_terminal', TERMINAL_COLOR, TERMINAL_EMISSIVE);
  const deployMat = makeMaterial(scene, 'hub_deploy', DEPLOY_COLOR, DEPLOY_EMISSIVE);
  const accentMat = makeMaterial(scene, 'hub_accent', ACCENT_COLOR, ACCENT_EMISSIVE);

  // Glow layer for emissive surfaces
  const glow = new GlowLayer('glow', scene);
  glow.intensity = 0.6;

  // Floor
  const floor = MeshBuilder.CreateGround('hub_floor', { width: 16, height: 12 }, scene);
  floor.material = floorMat;
  floor.checkCollisions = true;

  // Ceiling
  const ceiling = MeshBuilder.CreateGround('hub_ceiling', { width: 16, height: 12 }, scene);
  ceiling.position.y = 3.5;
  ceiling.rotation.x = Math.PI;
  ceiling.material = ceilingMat;

  // Walls
  // Walls — using thin boxes so collision works from both sides
  const wallDefs: Array<{ pos: Vector3; w: number; h: number; d: number }> = [
    // Back wall
    { pos: new Vector3(0, 1.75, -6), w: 16, h: 3.5, d: 0.2 },
    // Front wall
    { pos: new Vector3(0, 1.75, 6), w: 16, h: 3.5, d: 0.2 },
    // Left wall
    { pos: new Vector3(-8, 1.75, 0), w: 0.2, h: 3.5, d: 12 },
    // Right wall
    { pos: new Vector3(8, 1.75, 0), w: 0.2, h: 3.5, d: 12 },
  ];

  wallDefs.forEach((w, i) => {
    const wall = MeshBuilder.CreateBox(`hub_wall_${i}`, { width: w.w, height: w.h, depth: w.d }, scene);
    wall.position = w.pos;
    wall.material = wallMat;
    wall.checkCollisions = true;
  });

  // Interior column/pillar details
  const pillarPositions = [
    new Vector3(-4, 1.75, -3),
    new Vector3(4, 1.75, -3),
    new Vector3(-4, 1.75, 3),
    new Vector3(4, 1.75, 3),
  ];
  pillarPositions.forEach((pos, i) => {
    const pillar = MeshBuilder.CreateBox(`hub_pillar_${i}`, { width: 0.6, height: 3.5, depth: 0.6 }, scene);
    pillar.position = pos;
    pillar.material = wallMat;
    pillar.checkCollisions = true;
  });

  // Warning stripe accents on pillars
  pillarPositions.forEach((pos, i) => {
    const stripe = MeshBuilder.CreateBox(`hub_stripe_${i}`, { width: 0.62, height: 0.15, depth: 0.62 }, scene);
    stripe.position = new Vector3(pos.x, 1.0, pos.z);
    stripe.material = accentMat;
  });

  // === MISSION TERMINAL ===
  // Located against the back wall, left of center
  const missionTerminal = MeshBuilder.CreateBox('mission_terminal', { width: 1.2, height: 1.8, depth: 0.4 }, scene);
  missionTerminal.position = new Vector3(-2, 0.9, -5.7);
  missionTerminal.material = terminalMat;
  missionTerminal.checkCollisions = true;

  // Screen on the terminal
  const termScreen = MeshBuilder.CreatePlane('term_screen', { width: 0.9, height: 0.6 }, scene);
  termScreen.position = new Vector3(-2, 1.3, -5.49);
  termScreen.material = makeMaterial(scene, 'term_screen_mat', new Color3(0, 0, 0), new Color3(0.15, 0.7, 0.6));

  // === NPC TERMINAL ===
  // Located against the back wall, right of center
  const npcTerminal = MeshBuilder.CreateBox('npc_terminal', { width: 1.0, height: 2.0, depth: 0.4 }, scene);
  npcTerminal.position = new Vector3(2, 1.0, -5.7);
  npcTerminal.material = makeMaterial(scene, 'npc_mat', new Color3(0.05, 0.05, 0.08), new Color3(0.3, 0.15, 0.5));
  npcTerminal.checkCollisions = true;

  // NPC screen
  const npcScreen = MeshBuilder.CreatePlane('npc_screen', { width: 0.7, height: 0.5 }, scene);
  npcScreen.position = new Vector3(2, 1.4, -5.49);
  npcScreen.material = makeMaterial(scene, 'npc_screen_mat', new Color3(0, 0, 0), new Color3(0.4, 0.2, 0.6));

  // === DEPLOY POINT ===
  // Located at the far end of the hub (front wall), centered — like an airlock
  const deployPoint = MeshBuilder.CreateBox('deploy_point', { width: 2.0, height: 3.0, depth: 0.3 }, scene);
  deployPoint.position = new Vector3(0, 1.5, 5.7);
  deployPoint.material = deployMat;
  deployPoint.checkCollisions = true;

  // Deploy frame accents
  const deployFrameLeft = MeshBuilder.CreateBox('deploy_frame_l', { width: 0.15, height: 3.2, depth: 0.35 }, scene);
  deployFrameLeft.position = new Vector3(-1.1, 1.5, 5.7);
  deployFrameLeft.material = accentMat;
  deployFrameLeft.checkCollisions = true;

  const deployFrameRight = MeshBuilder.CreateBox('deploy_frame_r', { width: 0.15, height: 3.2, depth: 0.35 }, scene);
  deployFrameRight.position = new Vector3(1.1, 1.5, 5.7);
  deployFrameRight.material = accentMat;
  deployFrameRight.checkCollisions = true;

  // === LIGHTING ===
  // Dim ambient
  const ambient = new HemisphericLight('hub_ambient', new Vector3(0, 1, 0), scene);
  ambient.intensity = 0.15;
  ambient.diffuse = new Color3(0.6, 0.7, 0.8);
  ambient.groundColor = new Color3(0.05, 0.05, 0.08);

  // Overhead point lights
  const overheadPositions = [
    new Vector3(-3, 3.2, -2),
    new Vector3(3, 3.2, -2),
    new Vector3(0, 3.2, 2),
  ];
  overheadPositions.forEach((pos, i) => {
    const light = new PointLight(`hub_light_${i}`, pos, scene);
    light.intensity = 0.6;
    light.diffuse = new Color3(0.8, 0.85, 1.0);
    light.range = 10;
  });

  // Terminal spot
  const termSpot = new SpotLight(
    'term_spot',
    new Vector3(-2, 3, -5),
    new Vector3(0, -1, -0.3),
    Math.PI / 4,
    2,
    scene
  );
  termSpot.intensity = 0.5;
  termSpot.diffuse = new Color3(0.3, 0.8, 0.7);

  // Deploy glow
  const deploySpot = new SpotLight(
    'deploy_spot',
    new Vector3(0, 3, 5),
    new Vector3(0, -1, 0.3),
    Math.PI / 3,
    2,
    scene
  );
  deploySpot.intensity = 0.5;
  deploySpot.diffuse = new Color3(0.8, 0.7, 0.3);

  // Background color
  scene.clearColor.set(0.02, 0.03, 0.05, 1);

  // Fog for mood
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.015;
  scene.fogColor = new Color3(0.02, 0.03, 0.05);

  return { missionTerminal, npcTerminal, deployPoint };
}
