import { Scene } from '@babylonjs/core';
import type { GameEngine } from '../GameEngine';

export type SceneBuilder = (engine: GameEngine) => Promise<Scene>;

export class SceneManager {
  private gameEngine: GameEngine;
  private activeScene: Scene | null = null;
  private builders: Map<string, SceneBuilder> = new Map();

  constructor(gameEngine: GameEngine) {
    this.gameEngine = gameEngine;
  }

  register(name: string, builder: SceneBuilder): void {
    this.builders.set(name, builder);
  }

  async switchTo(name: string): Promise<Scene> {
    const builder = this.builders.get(name);
    if (!builder) {
      throw new Error(`No scene builder registered for "${name}"`);
    }

    this.gameEngine.stopRenderLoop();

    if (this.activeScene) {
      this.activeScene.dispose();
      this.activeScene = null;
    }

    const scene = await builder(this.gameEngine);
    this.activeScene = scene;
    this.gameEngine.startRenderLoop(scene);
    return scene;
  }

  getActiveScene(): Scene | null {
    return this.activeScene;
  }
}
