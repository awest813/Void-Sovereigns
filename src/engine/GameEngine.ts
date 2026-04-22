import { Engine, Scene } from '@babylonjs/core';
import type { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine';

export class GameEngine {
  readonly canvas: HTMLCanvasElement;
  readonly engine: Engine | WebGPUEngine;

  constructor(canvas: HTMLCanvasElement, engine: Engine | WebGPUEngine) {
    this.canvas = canvas;
    this.engine = engine;
  }

  static async create(): Promise<GameEngine> {
    const canvas = document.createElement('canvas');
    canvas.id = 'game-canvas';
    document.body.appendChild(canvas);

    let engine: Engine | WebGPUEngine;
    const rendererPreference = new URLSearchParams(window.location.search).get('renderer');
    const forceWebGL = rendererPreference === 'webgl';
    const forceWebGPU = rendererPreference === 'webgpu';
    const shouldAttemptWebGPU =
      !forceWebGL &&
      Boolean(navigator.gpu) &&
      (forceWebGPU || !navigator.webdriver);

    if (shouldAttemptWebGPU) {
      try {
        const adapter = await navigator.gpu?.requestAdapter();
        if (!adapter) {
          throw new Error('No WebGPU adapter available.');
        }

        const { WebGPUEngine } = await import('@babylonjs/core/Engines/webgpuEngine');
        const webgpuEngine = new WebGPUEngine(canvas, { antialias: true, adaptToDeviceRatio: true });
        await webgpuEngine.initAsync();
        engine = webgpuEngine;
      } catch (error) {
        console.warn('WebGPU initialization failed; falling back to WebGL.', error);
        engine = new Engine(canvas, true, {}, true);
      }
    } else {
      engine = new Engine(canvas, true, {}, true);
    }

    window.addEventListener('resize', () => engine.resize());

    return new GameEngine(canvas, engine);
  }

  createScene(): Scene {
    return new Scene(this.engine);
  }

  startRenderLoop(scene: Scene): void {
    this.engine.runRenderLoop(() => scene.render());
  }

  stopRenderLoop(): void {
    this.engine.stopRenderLoop();
  }
}
