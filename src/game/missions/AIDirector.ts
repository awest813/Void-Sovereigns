import { Scene, Vector3 } from '@babylonjs/core';
import type { TransformNode } from '@babylonjs/core';
import type { RoomNode } from './DungeonGenerator';
import type { HealthSystem } from '../state/HealthSystem';
import type { HUD } from '../../ui/hud/HUD';
import { SecurityBot } from '../entities/SecurityBot';

/**
 * Decides how many SecurityBots to spawn in each room and whether they start
 * in an alert state.  Budget rules:
 *
 *  - Spawn / Extraction  → 0 bots (safe rooms)
 *  - Objective           → 1–2 bots (scales with depth)
 *  - Engine              → 1 bot
 *  - Junction            → 1–2 bots (extra on deep paths)
 *  - Loot / Airlock      → 0–1 bot (50 % ambush)
 *  - Corridor            → 0–1 bot (probabilistic on deep critical path)
 *
 * Bots whose room sits at or beyond 60 % of the maximum critical-path depth
 * start in the ALERT state, matching the extraction-pressure escalation in
 * SecurityBot.getExtractionPressureMultiplier.
 */
export class AIDirector {
  private readonly maxCriticalDepth: number;

  constructor(private readonly rooms: RoomNode[]) {
    this.maxCriticalDepth = Math.max(...rooms.map((r) => r.depth), 1);
  }

  spawnEncounters(
    scene: Scene,
    player: TransformNode,
    health: HealthSystem,
    hud: HUD,
    waypoints: Vector3[]
  ): SecurityBot[] {
    const bots: SecurityBot[] = [];
    for (const room of this.rooms) {
      const count = this.budgetForRoom(room);
      const forceAlert =
        room.criticalPath &&
        room.depth >= Math.ceil(this.maxCriticalDepth * 0.6);

      for (let i = 0; i < count; i++) {
        const offset = this.spawnOffset(i, count);
        const bot = new SecurityBot(
          scene,
          room.position.clone().addInPlace(offset),
          player,
          health,
          hud,
          waypoints
        );
        if (forceAlert) bot.forceAlert(room.position.clone());
        bots.push(bot);
      }
    }
    return bots;
  }

  private budgetForRoom(room: RoomNode): number {
    const depthFactor = room.depth / this.maxCriticalDepth;

    switch (room.type) {
      case 'Spawn':
      case 'Extraction':
        return 0;

      case 'Objective':
        return depthFactor > 0.5 ? 2 : 1;

      case 'Engine':
        return 1;

      case 'Junction':
        return depthFactor > 0.65 ? 2 : 1;

      case 'Loot':
      case 'Airlock':
        return Math.random() < 0.5 ? 1 : 0;

      case 'Corridor':
        return room.criticalPath && depthFactor > 0.5 && Math.random() < 0.45
          ? 1
          : 0;

      default:
        return 0;
    }
  }

  /** Spread multiple bots in a ring around the room centre. */
  private spawnOffset(index: number, total: number): Vector3 {
    if (total <= 1) return new Vector3(0, 1.5, 0);
    const angle = (index / total) * Math.PI * 2;
    return new Vector3(Math.cos(angle) * 1.8, 1.5, Math.sin(angle) * 1.8);
  }
}
