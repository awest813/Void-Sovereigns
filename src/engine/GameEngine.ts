import { Engine, WebGPUEngine, Scene } from '@babylonjs/core';

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
    if (navigator.gpu) {
      engine = new WebGPUEngine(canvas, { antialias: true, adaptToDeviceRatio: true });
      await (engine as WebGPUEngine).initAsync();
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
