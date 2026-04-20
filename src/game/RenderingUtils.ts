import { Scene, DefaultRenderingPipeline, SSAORenderingPipeline, Vector3 } from '@babylonjs/core';

export function setupAdvancedRendering(scene: Scene, type: 'hub' | 'mission'): DefaultRenderingPipeline {
  const pipeline = new DefaultRenderingPipeline(`${type}_pipeline`, true, scene);
  
  pipeline.bloomEnabled = true;
  pipeline.bloomThreshold = 0.8;
  pipeline.bloomWeight = type === 'mission' ? 0.7 : 0.4;
  
  pipeline.vignetteEnabled = true;
  pipeline.vignetteWeight = type === 'mission' ? 4 : 2;
  
  pipeline.grainEnabled = true;
  pipeline.grain.intensity = type === 'mission' ? 12 : 5;
  
  if (type === 'mission') {
    pipeline.chromaticAberrationEnabled = true;
    pipeline.chromaticAberration.aberrationAmount = 15;
    
    // SSAO for denser shadows
    const ssao = new SSAORenderingPipeline('ssao', scene, 0.75);
    scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline('ssao', scene.activeCameras!);
  }
  
  return pipeline;
}

export function createVolumetricBeam(scene: Scene, position: Vector3, direction: Vector3): void {
   // Simple fake volumetric beam using a cone with a gradient or particle system
   // For now, we'll use a very thin light with high intensity
}
