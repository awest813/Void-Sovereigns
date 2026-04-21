import { Vector3 } from '@babylonjs/core';

export type RoomType = 'Storage' | 'Engine' | 'Bridge' | 'Quarters' | 'Corridor';

export interface RoomNode {
  id: string;
  type: RoomType;
  position: Vector3;
  size: Vector3;
  connections: string[]; // Connected node IDs
}

export class DungeonGenerator {
  generate(_seed: number): RoomNode[] {
    const rooms: RoomNode[] = [];
    
    // Start with a central Corridor Hub
    rooms.push({
      id: 'hub',
      type: 'Corridor',
      position: new Vector3(0, 0, 0),
      size: new Vector3(6, 3, 6),
      connections: ['storage', 'engine', 'bridge', 'quarters']
    });

    // Branch out in 4 directions
    rooms.push({
      id: 'storage',
      type: 'Storage',
      position: new Vector3(-12, 0, 0),
      size: new Vector3(8, 4, 8),
      connections: ['hub']
    });

    rooms.push({
      id: 'engine',
      type: 'Engine',
      position: new Vector3(12, 0, 0),
      size: new Vector3(8, 6, 12),
      connections: ['hub']
    });

    rooms.push({
      id: 'bridge',
      type: 'Bridge',
      position: new Vector3(0, 0, -12),
      size: new Vector3(10, 4, 8),
      connections: ['hub']
    });

    rooms.push({
      id: 'quarters',
      type: 'Quarters',
      position: new Vector3(0, 0, 12),
      size: new Vector3(8, 3, 8),
      connections: ['hub']
    });

    // Add connector corridors
    this.addCorridor(rooms, 'hub', 'storage');
    this.addCorridor(rooms, 'hub', 'engine');
    this.addCorridor(rooms, 'hub', 'bridge');
    this.addCorridor(rooms, 'hub', 'quarters');

    return rooms;
  }

  private addCorridor(rooms: RoomNode[], idA: string, idB: string): void {
    const a = rooms.find(r => r.id === idA)!;
    const b = rooms.find(r => r.id === idB)!;
    
    const midPoint = Vector3.Center(a.position, b.position);
    const diff = b.position.subtract(a.position);
    
    rooms.push({
      id: `corr_${idA}_${idB}`,
      type: 'Corridor',
      position: midPoint,
      size: new Vector3(
        Math.abs(diff.x) > 0 ? Math.abs(diff.x) - 4 : 3,
        3,
        Math.abs(diff.z) > 0 ? Math.abs(diff.z) - 4 : 3
      ),
      connections: [idA, idB]
    });
  }
}
