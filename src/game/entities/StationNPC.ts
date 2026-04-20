import { 
  Scene, 
  Vector3, 
  SceneLoader, 
  AbstractMesh, 
  AnimationGroup,
  TransformNode,
  Sound
} from '@babylonjs/core';
import { ASSETS } from '../AssetManifest';

export type NPCType = 'guard' | 'engineer' | 'officer' | 'wanderer';

// Optimization: Shared Animation Cache
const ANIM_CACHE: Record<string, AnimationGroup[]> = {};

export class StationNPC {
  private scene: Scene;
  private mesh: AbstractMesh | null = null;
  private animGroups: AnimationGroup[] = [];

  // Wandering AI
  private waypoints: Vector3[] = [];
  private currentWaypointIndex = 0;
  private walkSpeed = 0.02;
  private isWandering = false;
  private stepAccumulator = 0;
  private footstepSound: Sound | null = null;

  constructor(scene: Scene, type: NPCType, position: Vector3, rotationY: number, waypoints?: Vector3[]) {
    this.scene = scene;
    this.waypoints = waypoints || [];
    this.isWandering = this.waypoints.length > 0;
    
    this.loadNPC(type, position, rotationY);

    this.footstepSound = new Sound('npc_step', 'https://www.babylonjs-live.com/assets/sounds/step.wav', this.scene, null, {
        volume: 0.1,
        maxDistance: 10,
        spatialSound: true,
        autoplay: false
    });
  }

  private async loadNPC(type: NPCType, position: Vector3, rotationY: number) {
    // 1. Get/Load Animations from global cache
    if (!ANIM_CACHE['v1'] || !ANIM_CACHE['v2']) {
        const [packV1, packV2] = await Promise.all([
            SceneLoader.ImportMeshAsync("", "", ASSETS.CHARACTERS.ANIM_LIBRARY_V1, this.scene),
            SceneLoader.ImportMeshAsync("", "", ASSETS.CHARACTERS.ANIM_LIBRARY_V2, this.scene)
        ]);
        ANIM_CACHE['v1'] = packV1.animationGroups;
        ANIM_CACHE['v2'] = packV2.animationGroups;
        [...packV1.meshes, ...packV2.meshes].forEach(m => m.setEnabled(false));
    }

    // 2. Load the Character Mesh
    const modelPath = (type === 'officer' || (type === 'wanderer' && Math.random() > 0.5)) 
      ? ASSETS.CHARACTERS.SF_FEMALE 
      : ASSETS.CHARACTERS.SF_MALE;
      
    const modelPack = await SceneLoader.ImportMeshAsync("", "", modelPath, this.scene);
    this.mesh = modelPack.meshes[0];
    this.mesh.position = position;
    this.mesh.rotation = new Vector3(0, rotationY, 0);
    this.mesh.scaling = new Vector3(0.5, 0.5, 0.5);
    if (this.footstepSound) this.footstepSound.attachToMesh(this.mesh);

    // 3. Connect Animations (Clone groups for this specific instance)
    if (this.mesh.skeleton) {
       const allAnims = [...ANIM_CACHE['v1'], ...ANIM_CACHE['v2']];
       allAnims.forEach(ag => {
         // Create a unique animation group for this NPC instance
         const newAg = ag.clone(`${ag.name}_${Math.random()}`);
         newAg.addTargetedAnimation(ag.targetedAnimations[0].animation, this.mesh!);
         this.animGroups.push(newAg);
       });
    }

    // 4. Register update loop if wandering
    if (this.isWandering) {
       this.scene.onBeforeRenderObservable.add(() => this.update());
    }

    // 5. Default state
    this.playBehavior(type);
  }

  private update() {
    if (!this.mesh || !this.isWandering || this.waypoints.length === 0) return;

    const target = this.waypoints[this.currentWaypointIndex];
    const direction = target.subtract(this.mesh.position);
    const dist = direction.length();

    if (dist > 0.5) {
       direction.normalize();
       this.mesh.position.addInPlace(direction.scale(this.walkSpeed));
       this.mesh.lookAt(target);
       this.playAnim('Walk', true);

       this.stepAccumulator += this.scene.getEngine().getDeltaTime();
       if (this.stepAccumulator > 500) {
          this.footstepSound?.play();
          this.stepAccumulator = 0;
       }
    } else {
       this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
    }
  }

  private playBehavior(type: NPCType) {
     if (this.isWandering) {
        this.playAnim('Walk', true);
        return;
     }

     switch(type) {
       case 'guard': this.playAnim('Idle_Standing_ArmsBehindBack', true); break;
       case 'engineer': this.playAnim('Work_Low', true); break; 
       case 'officer': this.playAnim('Idle_ArmsonHips', true); break;
       default: this.playAnim('Idle', true);
     }
  }

  private playAnim(name: string, loop: boolean) {
    const anim = this.animGroups.find(a => a.name.toLowerCase().includes(name.toLowerCase()));
    if (anim && !anim.isPlaying) {
      this.animGroups.forEach(a => a.stop());
      anim.start(loop);
    }
  }

  public dispose() {
    this.mesh?.dispose();
    this.footstepSound?.dispose();
    this.animGroups.forEach(a => a.dispose());
  }
}
