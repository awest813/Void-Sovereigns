import { Scene, TransformNode, Vector3 } from '@babylonjs/core';
import type { RoomNode } from './DungeonGenerator';

export class RoomActivitySystem {
  private activeRoomId: string | null = null;
  private activeRoomIds = new Set<string>();

  constructor(
    private readonly scene: Scene,
    private readonly rooms: RoomNode[],
    private readonly player: TransformNode
  ) {
    this.scene.onBeforeRenderObservable.add(() => this.update());
  }

  private update(): void {
    const currentRoom = this.findCurrentRoom();
    if (!currentRoom || currentRoom.id === this.activeRoomId) return;

    this.activeRoomId = currentRoom.id;
    this.activeRoomIds = new Set([currentRoom.id, ...currentRoom.connections]);
    this.applyRoomActivity();
  }

  private findCurrentRoom(): RoomNode | null {
    let closest: RoomNode | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    this.rooms.forEach((room) => {
      const distance = Vector3.DistanceSquared(this.player.position, room.position);
      if (distance < closestDistance) {
        closest = room;
        closestDistance = distance;
      }
    });

    return closest;
  }

  private applyRoomActivity(): void {
    this.scene.lights.forEach((light) => {
      const roomId = light.metadata?.roomId as string | undefined;
      if (!roomId) return;
      light.setEnabled(this.activeRoomIds.has(roomId));
    });

    this.scene.meshes.forEach((mesh) => {
      const roomId = mesh.metadata?.roomId as string | undefined;
      const canCull = mesh.metadata?.roomCullable === true;
      if (!roomId || !canCull) return;
      mesh.setEnabled(this.activeRoomIds.has(roomId));
    });
  }
}
