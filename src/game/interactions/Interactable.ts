import type { AbstractMesh } from '@babylonjs/core';

export interface Interactable {
  mesh: AbstractMesh;
  promptText: string;
  onInteract: () => void;
}
