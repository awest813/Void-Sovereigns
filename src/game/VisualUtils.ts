import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
} from '@babylonjs/core';

export function createIndustrialDetail(scene: Scene, type: 'pipe' | 'vent' | 'panel' | 'intercom' | 'console', position: Vector3, rotation?: Vector3): Mesh {
  let mesh: Mesh;
  const mat = new StandardMaterial(`detail_mat_${type}`, scene);
  
  switch (type) {
    case 'intercom':
      mesh = MeshBuilder.CreateBox(`ic_${Date.now()}`, { width: 0.3, height: 0.4, depth: 0.1 }, scene);
      mat.diffuseColor = new Color3(0.3, 0.3, 0.35);
      mat.emissiveColor = new Color3(0.4, 0.1, 0.05); // Little red light
      break;
    case 'console':
      mesh = MeshBuilder.CreateBox(`cn_${Date.now()}`, { width: 0.8, height: 0.2, depth: 0.4 }, scene);
      mat.diffuseColor = new Color3(0.2, 0.2, 0.2);
      mat.emissiveColor = new Color3(0.1, 0.3, 0.5); // Blue screen glow
      break;
    case 'pipe':
      mesh = MeshBuilder.CreateCylinder(`pipe_${Date.now()}`, { diameter: 0.15, height: 4 }, scene);
      mat.diffuseColor = new Color3(0.2, 0.18, 0.15);
      break;
    case 'vent':
      mesh = MeshBuilder.CreateBox(`vent_${Date.now()}`, { width: 0.8, height: 0.8, depth: 0.15 }, scene);
      mat.diffuseColor = new Color3(0.15, 0.16, 0.18);
      break;
    case 'panel':
      mesh = MeshBuilder.CreateBox(`panel_${Date.now()}`, { width: 1.2, height: 2, depth: 0.1 }, scene);
      mat.diffuseColor = new Color3(0.15, 0.16, 0.18);
      break;
  }

  mesh.material = mat;
  mesh.position = position;
  if (rotation) {
    mesh.rotation = rotation;
  }
  mesh.checkCollisions = true;
  return mesh;
}

export function createHazardStripe(scene: Scene, position: Vector3, rotation: Vector3, width = 1.0): Mesh {
  const root = new Mesh(`stripe_${Date.now()}`, scene);
  
  for (let i = 0; i < 6; i++) {
    const strip = MeshBuilder.CreatePlane(`s_${i}`, { width: 0.12, height: 0.5 }, scene);
    strip.position = new Vector3((i - 2.5) * 0.15, 0, 0);
    const mat = new StandardMaterial(`stripe_mat_${i % 2}`, scene);
    mat.diffuseColor = i % 2 === 0 ? new Color3(0, 0, 0) : new Color3(0.6, 0.5, 0.05);
    strip.material = mat;
    strip.parent = root;
  }

  root.position = position;
  root.rotation = rotation;
  root.scaling.x = width;
  return root;
}

export function addIndustrialClutter(scene: Scene, _container: Mesh | Scene): void {
  // Add a few pipes along walls
  createIndustrialDetail(scene, 'pipe', new Vector3(-5.8, 2.8, 0), new Vector3(Math.PI / 2, 0, 0));
  createIndustrialDetail(scene, 'pipe', new Vector3(-5.7, 2.9, 0), new Vector3(Math.PI / 2, 0, 0));
  
  // Add some vents/panels
  createIndustrialDetail(scene, 'vent', new Vector3(5.8, 2, -3), new Vector3(0, Math.PI / 2, 0));
  createIndustrialDetail(scene, 'panel', new Vector3(5.8, 1.5, 2), new Vector3(0, Math.PI / 2, 0));
}
