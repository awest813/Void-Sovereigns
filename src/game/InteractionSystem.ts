import { Scene, KeyboardEventTypes } from '@babylonjs/core';
import type { FirstPersonController } from '../engine/player/FirstPersonController';
import type { Interactable } from './interactions/Interactable';

export class InteractionSystem {
  private player: FirstPersonController;
  private interactables: Interactable[] = [];
  private currentTarget: Interactable | null = null;
  private interactRange = 3;
  private onTargetChange: ((target: Interactable | null) => void) | null = null;

  constructor(scene: Scene, player: FirstPersonController) {
    this.player = player;

    // E key to interact
    scene.onKeyboardObservable.add((info) => {
      if (
        info.type === KeyboardEventTypes.KEYDOWN &&
        info.event.code === 'KeyE' &&
        this.currentTarget
      ) {
        this.currentTarget.onInteract();
      }
    });

    // Update targeting each frame
    scene.onBeforeRenderObservable.add(() => this.update());
  }

  register(interactable: Interactable): void {
    this.interactables.push(interactable);
  }

  unregister(interactable: Interactable): void {
    this.interactables = this.interactables.filter(i => i !== interactable);
    if (this.currentTarget === interactable) {
      this.currentTarget = null;
      this.onTargetChange?.(null);
    }
  }

  clearAll(): void {
    this.interactables = [];
    this.currentTarget = null;
    this.onTargetChange?.(null);
  }

  setOnTargetChange(cb: (target: Interactable | null) => void): void {
    this.onTargetChange = cb;
  }

  getCurrentTarget(): Interactable | null {
    return this.currentTarget;
  }

  private update(): void {
    const ray = this.player.getForwardRay(this.interactRange);
    let closest: Interactable | null = null;
    let closestDist = Infinity;

    for (const interactable of this.interactables) {
      const hit = ray.intersectsMesh(interactable.mesh as any);
      if (hit.hit && hit.distance < closestDist) {
        closest = interactable;
        closestDist = hit.distance;
      }
    }

    if (closest !== this.currentTarget) {
      this.currentTarget = closest;
      this.onTargetChange?.(closest);
    }
  }
}
