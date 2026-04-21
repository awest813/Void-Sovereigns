import { Scene, Vector3 } from '@babylonjs/core';
import type { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';

export async function setupAdvancedRendering(
  scene: Scene,
  type: 'hub' | 'mission'
): Promise<DefaultRenderingPipeline> {
  const [{ DefaultRenderingPipeline }, ssaoModule] = await Promise.all([
    import('@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline'),
    type === 'mission'
      ? import('@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssaoRenderingPipeline')
      : Promise.resolve(null),
  ]);

  const pipeline = new DefaultRenderingPipeline(`${type}_pipeline`, true, scene);
  
  pipeline.bloomEnabled = true;
  pipeline.bloomThreshold = 0.8;
  pipeline.bloomWeight = type === 'mission' ? 0.7 : 0.4;
  
  pipeline.grainEnabled = true;
  pipeline.grain.intensity = type === 'mission' ? 12 : 5;
  
  if (type === 'mission') {
    pipeline.chromaticAberrationEnabled = true;
    pipeline.chromaticAberration.aberrationAmount = 15;
    
    // SSAO for denser shadows
    new ssaoModule!.SSAORenderingPipeline('ssao', scene, 0.75);
    scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline('ssao', scene.activeCameras!);
  }
  
  return pipeline;
}

export function createVolumetricBeam(_scene: Scene, _position: Vector3, _direction: Vector3): void {
   // Simple fake volumetric beam using a cone with a gradient or particle system
   // For now, we'll use a very thin light with high intensity
}
