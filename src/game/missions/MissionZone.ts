import {
  Scene,
  Vector3,
  Color3,
  MeshBuilder,
  StandardMaterial,
  HemisphericLight,
  PointLight,
  GlowLayer,
  type Mesh,
} from '@babylonjs/core';

function makeMaterial(scene: Scene, name: string, diffuse: Color3, emissive?: Color3): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = diffuse;
  mat.specularColor = new Color3(0.1, 0.1, 0.1);
  if (emissive) {
    mat.emissiveColor = emissive;
  }
  return mat;
}

export interface MissionZoneLandmarks {
  objectiveItem: Mesh;
  extractionPoint: Mesh;
}

export function buildMissionZone(scene: Scene): MissionZoneLandmarks {
  const floorMat = makeMaterial(scene, 'mz_floor', new Color3(0.06, 0.07, 0.08));
  const wallMat = makeMaterial(scene, 'mz_wall', new Color3(0.1, 0.1, 0.12));
  const ceilingMat = makeMaterial(scene, 'mz_ceiling', new Color3(0.04, 0.05, 0.06));
  const objectiveMat = makeMaterial(scene, 'mz_objective', new Color3(0.05, 0.1, 0.08), new Color3(0.2, 0.8, 0.5));
  const extractMat = makeMaterial(scene, 'mz_extract', new Color3(0.08, 0.06, 0.02), new Color3(0.5, 0.4, 0.1));
  const damagedMat = makeMaterial(scene, 'mz_damaged', new Color3(0.08, 0.06, 0.05));
  const pipeMat = makeMaterial(scene, 'mz_pipe', new Color3(0.15, 0.12, 0.1));
  const dangerMat = makeMaterial(scene, 'mz_danger', new Color3(0.12, 0.03, 0.02), new Color3(0.4, 0.08, 0.02));

  const glow = new GlowLayer('mz_glow', scene);
  glow.intensity = 0.5;

  // Floor
  const floor = MeshBuilder.CreateGround('mz_floor', { width: 12, height: 18 }, scene);
  floor.material = floorMat;
  floor.checkCollisions = true;

  // Ceiling
  const ceiling = MeshBuilder.CreateGround('mz_ceiling', { width: 12, height: 18 }, scene);
  ceiling.position.y = 3.2;
  ceiling.rotation.x = Math.PI;
  ceiling.material = ceilingMat;

  // Walls — corridor-like shape
  const walls: Array<{ pos: Vector3; w: number; h: number; d: number }> = [
    // Left wall
    { pos: new Vector3(-6, 1.6, 0), w: 0.3, h: 3.2, d: 18 },
    // Right wall
    { pos: new Vector3(6, 1.6, 0), w: 0.3, h: 3.2, d: 18 },
    // Far wall (behind objective)
    { pos: new Vector3(0, 1.6, -9), w: 12, h: 3.2, d: 0.3 },
    // Near wall (behind extraction)
    { pos: new Vector3(0, 1.6, 9), w: 12, h: 3.2, d: 0.3 },
  ];
  walls.forEach((w, i) => {
    const wall = MeshBuilder.CreateBox(`mz_wall_${i}`, { width: w.w, height: w.h, depth: w.d }, scene);
    wall.position = w.pos;
    wall.material = wallMat;
    wall.checkCollisions = true;
  });

  // Interior obstacles — debris / crates
  const cratePositions = [
    new Vector3(-3, 0.5, -3),
    new Vector3(2, 0.5, -5),
    new Vector3(-1, 0.5, 1),
    new Vector3(4, 0.5, 4),
    new Vector3(-4, 0.5, 6),
  ];
  cratePositions.forEach((pos, i) => {
    const crate = MeshBuilder.CreateBox(`mz_crate_${i}`, { width: 1, height: 1, depth: 1 }, scene);
    crate.position = pos;
    crate.material = damagedMat;
    crate.checkCollisions = true;
    crate.rotation.y = Math.random() * Math.PI;
  });

  // Pipes along walls
  const pipePositions = [
    { start: new Vector3(-5.6, 2.5, -8), end: new Vector3(-5.6, 2.5, 8) },
    { start: new Vector3(5.6, 1.8, -8), end: new Vector3(5.6, 1.8, 8) },
  ];
  pipePositions.forEach((p, i) => {
    const length = Vector3.Distance(p.start, p.end);
    const pipe = MeshBuilder.CreateCylinder(`mz_pipe_${i}`, { diameter: 0.15, height: length }, scene);
    pipe.position = Vector3.Center(p.start, p.end);
    pipe.rotation.x = Math.PI / 2;
    pipe.material = pipeMat;
  });

  // Danger stripe on floor near objective
  const dangerStripe = MeshBuilder.CreateGround('mz_danger', { width: 3, height: 0.3 }, scene);
  dangerStripe.position = new Vector3(0, 0.01, -6);
  dangerStripe.material = dangerMat;

  // === OBJECTIVE ITEM ===
  const objectiveItem = MeshBuilder.CreateBox('objective_item', { width: 0.4, height: 0.3, depth: 0.4 }, scene);
  objectiveItem.position = new Vector3(0, 0.6, -7.5);
  objectiveItem.material = objectiveMat;

  // Pedestal for the objective
  const pedestal = MeshBuilder.CreateBox('mz_pedestal', { width: 0.8, height: 0.45, depth: 0.8 }, scene);
  pedestal.position = new Vector3(0, 0.225, -7.5);
  pedestal.material = makeMaterial(scene, 'mz_pedestal_mat', new Color3(0.1, 0.1, 0.12));
  pedestal.checkCollisions = true;

  // === EXTRACTION POINT ===
  const extractionPoint = MeshBuilder.CreateBox('extraction_point', { width: 2.0, height: 3.0, depth: 0.3 }, scene);
  extractionPoint.position = new Vector3(0, 1.5, 8.7);
  extractionPoint.material = extractMat;
  extractionPoint.checkCollisions = true;

  // Extraction frame
  const exFrameL = MeshBuilder.CreateBox('mz_exframe_l', { width: 0.12, height: 3.2, depth: 0.35 }, scene);
  exFrameL.position = new Vector3(-1.1, 1.5, 8.7);
  exFrameL.material = dangerMat;
  const exFrameR = MeshBuilder.CreateBox('mz_exframe_r', { width: 0.12, height: 3.2, depth: 0.35 }, scene);
  exFrameR.position = new Vector3(1.1, 1.5, 8.7);
  exFrameR.material = dangerMat;

  // === LIGHTING ===
  const ambient = new HemisphericLight('mz_ambient', new Vector3(0, 1, 0), scene);
  ambient.intensity = 0.08;
  ambient.diffuse = new Color3(0.4, 0.5, 0.6);
  ambient.groundColor = new Color3(0.02, 0.02, 0.04);

  // Sparse overhead lights — flickering feel
  const lightPositions = [
    new Vector3(0, 3, -6),
    new Vector3(-3, 3, 0),
    new Vector3(3, 3, 3),
    new Vector3(0, 3, 7),
  ];
  lightPositions.forEach((pos, i) => {
    const light = new PointLight(`mz_light_${i}`, pos, scene);
    light.intensity = 0.4;
    light.diffuse = new Color3(0.7, 0.75, 0.9);
    light.range = 8;
  });

  // Objective spotlight
  const objLight = new PointLight('mz_obj_light', new Vector3(0, 2.5, -7.5), scene);
  objLight.intensity = 0.6;
  objLight.diffuse = new Color3(0.3, 0.9, 0.5);
  objLight.range = 5;

  // Dark atmosphere
  scene.clearColor.set(0.01, 0.02, 0.03, 1);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.025;
  scene.fogColor = new Color3(0.01, 0.02, 0.03);

  return { objectiveItem, extractionPoint };
}
