import { Scene } from '@babylonjs/core';
import type { GameEngine } from '../GameEngine';

export type SceneBuilder = (engine: GameEngine) => Promise<Scene>;

export interface SceneHooks {
  onEnter?: (scene: Scene) => void;
  onExit?: () => void;
}

export class SceneManager {
  private gameEngine: GameEngine;
  private activeScene: Scene | null = null;
  private builders: Map<string, SceneBuilder> = new Map();
  private hooks: Map<string, SceneHooks> = new Map();
  private currentSceneName: string | null = null;
  private loadingUI: any | null = null;

  constructor(gameEngine: GameEngine) {
    this.gameEngine = gameEngine;
  }

  public setLoadingUI(ui: any): void {
    this.loadingUI = ui;
  }

  /**
   * Registers a scene with a name, builder function, and optional lifecycle hooks.
   */
  register(name: string, builder: SceneBuilder, hooks?: SceneHooks): void {
    this.builders.set(name, builder);
    if (hooks) this.hooks.set(name, hooks);
  }

  /**
   * Switches to a new scene by name.
   * Handles disposal of previous scene and execution of lifecycle hooks.
   */
  async switchTo(name: string): Promise<Scene> {
    const builder = this.builders.get(name);
    if (!builder) {
      throw new Error(`[SceneManager] No scene builder registered for "${name}"`);
    }

    if (this.loadingUI) await this.loadingUI.show(1000);

    // 1. Exit Hook
    if (this.currentSceneName) {
      const exitHooks = this.hooks.get(this.currentSceneName);
      exitHooks?.onExit?.();
    }

    this.gameEngine.stopRenderLoop();

    // 2. Dispose Previous Scene
    if (this.activeScene) {
      this.activeScene.dispose();
      this.activeScene = null;
    }

    // 3. Build & Initialize New Scene
    const scene = await builder(this.gameEngine);
    this.activeScene = scene;
    this.currentSceneName = name;

    // 4. Enter Hook
    const enterHooks = this.hooks.get(name);
    enterHooks?.onEnter?.(scene);

    this.gameEngine.startRenderLoop(scene);
    if (this.loadingUI) await this.loadingUI.hide();
    return scene;
  }

  public getCurrentSceneName(): string | null {
    return this.currentSceneName;
  }

  public getActiveScene(): Scene | null {
    return this.activeScene;
  }
}
