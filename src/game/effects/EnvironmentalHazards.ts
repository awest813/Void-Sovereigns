import {
  Scene,
  Vector3,
  ParticleSystem,
  Texture,
  Color4,
  PointLight,
  Sound,
} from '@babylonjs/core';

export function createSteamLeak(scene: Scene, position: Vector3): void {
  const particleSystem = new ParticleSystem('steam', 200, scene);
  
  // Texture
  particleSystem.particleTexture = new Texture('https://www.babylonjs-live.com/assets/Flare.png', scene);
  
  // Position
  particleSystem.emitter = position;
  particleSystem.minEmitBox = new Vector3(-0.1, 0, -0.1);
  particleSystem.maxEmitBox = new Vector3(0.1, 0, 0.1);

  // Colors
  particleSystem.color1 = new Color4(0.7, 0.8, 0.9, 0.1);
  particleSystem.color2 = new Color4(0.5, 0.5, 0.5, 0.05);

  // Size
  particleSystem.minSize = 0.1;
  particleSystem.maxSize = 0.5;

  // Life
  particleSystem.minLifeTime = 0.5;
  particleSystem.maxLifeTime = 1.5;

  // Speed
  particleSystem.emitRate = 50;
  particleSystem.direction1 = new Vector3(0, 1, 0);
  particleSystem.direction2 = new Vector3(0, 1, 0);
  particleSystem.minEmitPower = 1;
  particleSystem.maxEmitPower = 3;

  particleSystem.start();

  // Positional Hiss
  const hiss = new Sound('steam_hiss', 'https://www.babylonjs-live.com/assets/sounds/ambient.wav', scene, null, {
    loop: true,
    autoplay: true,
    spatialSound: true,
    maxDistance: 6,
  });
  hiss.setPosition(position);
}

export function createFlickeringLight(scene: Scene, position: Vector3): void {
  const light = new PointLight('flicker_light', position, scene);
  light.intensity = 0.4;
  
  let elapsed = 0;
  scene.onBeforeRenderObservable.add(() => {
    elapsed += scene.getEngine().getDeltaTime();
    if (Math.random() > 0.95) {
      light.intensity = Math.random() * 0.1; // Flicker off
    } else {
      light.intensity = 0.4 + Math.sin(elapsed * 0.01) * 0.1;
    }
  });
}
