import { Scene, Vector3, MeshBuilder, StandardMaterial, Color3, ParticleSystem, Color4, Ray } from '@babylonjs/core';
import { getParticleTexture } from '../assets/ProceduralAssets';

export class GravityGrenade {
  private scene: Scene;
  private mesh: any;
  private duration = 4000; // 4 seconds
  private radius = 8;
  private strength = 0.15;

  constructor(scene: Scene, position: Vector3, direction: Vector3) {
    this.scene = scene;
    
    // 1. Projectile Mesh
    this.mesh = MeshBuilder.CreateSphere('grenade', { diameter: 0.2 }, scene);
    this.mesh.position = position;
    const mat = new StandardMaterial('grenade_mat', scene);
    mat.emissiveColor = new Color3(0.5, 0.2, 0.8); // Purple glow
    this.mesh.material = mat;

    // 2. Simple Throw Physics
    let velocity = direction.scale(0.5);
    const gravity = new Vector3(0, -0.01, 0);

    const observer = scene.onBeforeRenderObservable.add(() => {
        const deltaPos = velocity.clone();
        
        // Raycast ahead to check for collisions
        const ray = new Ray(this.mesh.position, deltaPos.normalize(), deltaPos.length() + 0.1);
        const hit = scene.pickWithRay(ray, (m) => m.checkCollisions);

        if (hit?.hit) {
            // If we hit something, detonate
            scene.onBeforeRenderObservable.remove(observer);
            this.detonate();
        } else {
            this.mesh.position.addInPlace(deltaPos);
            velocity.addInPlace(gravity);
        }
    });

    // Timeout detonation just in case
    setTimeout(() => {
        if (!this.mesh.isDisposed()) {
            scene.onBeforeRenderObservable.remove(observer);
            this.detonate();
        }
    }, 2000);
  }

  private detonate(): void {
    const pos = this.mesh.position.clone();
    this.mesh.dispose();

    // 1. Visual Vortex
    const vortex = MeshBuilder.CreateSphere('vortex', { diameter: this.radius * 2 }, this.scene);
    vortex.position = pos;
    const vMat = new StandardMaterial('vortex_mat', this.scene);
    vMat.diffuseColor = new Color3(0, 0, 0);
    vMat.emissiveColor = new Color3(0.3, 0.1, 0.5);
    vMat.alpha = 0.3;
    vortex.material = vMat;

    // 2. Particles
    const ps = new ParticleSystem('grav_particles', 100, this.scene);
    ps.particleTexture = getParticleTexture(this.scene);
    ps.emitter = pos;
    ps.minEmitBox = new Vector3(-1, -1, -1);
    ps.maxEmitBox = new Vector3(1, 1, 1);
    ps.color1 = new Color4(0.5, 0.2, 0.8, 1);
    ps.color2 = new Color4(0.2, 0.1, 0.4, 0.5);
    ps.minSize = 0.1;
    ps.maxSize = 0.3;
    ps.emitRate = 200;
    ps.gravity = new Vector3(0, 0, 0); 
    // Pull particles to center
    ps.start();

    // 3. Gravity Logic
    const startTime = Date.now();
    const gravityObserver = this.scene.onBeforeRenderObservable.add(() => {
        const elapsed = Date.now() - startTime;
        if (elapsed > this.duration) {
            this.scene.onBeforeRenderObservable.remove(gravityObserver);
            vortex.dispose();
            ps.stop();
            setTimeout(() => ps.dispose(), 2000);
            return;
        }

        // Pull Security Bots
        this.scene.meshes.forEach(m => {
            if (m.name.includes('bot_root')) { // Simple check for bots
                const dist = Vector3.Distance(m.position, pos);
                if (dist < this.radius) {
                    const dir = pos.subtract(m.position).normalize();
                    m.position.addInPlace(dir.scale(this.strength));
                }
            }
        });
        
        vortex.scaling.scaleInPlace(0.99); // Shrink over time
    });
  }
}
