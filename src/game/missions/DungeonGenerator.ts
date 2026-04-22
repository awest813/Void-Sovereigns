import { Vector3 } from '@babylonjs/core';

export type RoomType = 'Spawn' | 'Corridor' | 'Junction' | 'Loot' | 'Engine' | 'Objective' | 'Extraction' | 'Airlock';
export type TileShape = 'dead-end' | 'straight' | 'corner' | 't-junction' | 'cross' | 'room';
export type Direction = 'N' | 'E' | 'S' | 'W';

export interface RoomNode {
  id: string;
  type: RoomType;
  shape: TileShape;
  position: Vector3;
  size: Vector3;
  grid: { x: number; y: number };
  depth: number;
  criticalPath: boolean;
  connections: string[];
  exits: Direction[];
}

type GridCell = {
  x: number;
  y: number;
  criticalPath: boolean;
  depth: number;
  connections: Set<string>;
};

const GRID_UNIT = 10;
const DIRECTIONS: Record<Direction, { x: number; y: number; opposite: Direction }> = {
  N: { x: 0, y: -1, opposite: 'S' },
  E: { x: 1, y: 0, opposite: 'W' },
  S: { x: 0, y: 1, opposite: 'N' },
  W: { x: -1, y: 0, opposite: 'E' },
};

export class DungeonGenerator {
  generate(seed: number): RoomNode[] {
    const random = mulberry32(Math.floor(seed * 1_000_000) || 1);
    const cells = new Map<string, GridCell>();
    const criticalPath = this.buildCriticalPath(random, 9);

    criticalPath.forEach((point, depth) => {
      this.ensureCell(cells, point.x, point.y, true, depth);
      if (depth > 0) {
        const previous = criticalPath[depth - 1];
        this.connectCells(cells, previous.x, previous.y, point.x, point.y);
      }
    });

    criticalPath.slice(1, -2).forEach((point, index) => {
      if (random() > 0.55) return;
      this.buildBranch(cells, point.x, point.y, random, 1 + Math.floor(random() * 3), index + 1);
    });

    return Array.from(cells.values()).map((cell) => this.toRoomNode(cell, cells, criticalPath.length - 1));
  }

  private buildCriticalPath(random: () => number, length: number): Array<{ x: number; y: number }> {
    const path = [{ x: 0, y: 0 }];
    let heading: Direction = random() > 0.5 ? 'E' : 'S';

    while (path.length < length) {
      const current = path[path.length - 1];
      const choices = this.weightedDirections(heading, random);
      const nextDirection = choices.find((direction) => {
        const step = DIRECTIONS[direction];
        const next = { x: current.x + step.x, y: current.y + step.y };
        return !path.some((point) => point.x === next.x && point.y === next.y);
      });

      if (!nextDirection) break;
      const step = DIRECTIONS[nextDirection];
      path.push({ x: current.x + step.x, y: current.y + step.y });
      heading = nextDirection;
    }

    return path;
  }

  private weightedDirections(heading: Direction, random: () => number): Direction[] {
    const lateral = heading === 'N' || heading === 'S' ? ['E', 'W'] as Direction[] : ['N', 'S'] as Direction[];
    const options: Direction[] = random() > 0.28
      ? [heading, ...shuffle(lateral, random), DIRECTIONS[heading].opposite]
      : [...shuffle(lateral, random), heading, DIRECTIONS[heading].opposite];
    return options;
  }

  private buildBranch(
    cells: Map<string, GridCell>,
    startX: number,
    startY: number,
    random: () => number,
    length: number,
    depth: number
  ): void {
    let x = startX;
    let y = startY;
    let lastDirection: Direction | null = null;

    for (let i = 0; i < length; i++) {
      const direction = shuffle(Object.keys(DIRECTIONS) as Direction[], random).find((candidate) => {
        if (lastDirection && candidate === DIRECTIONS[lastDirection].opposite) return false;
        const step = DIRECTIONS[candidate];
        return !cells.has(key(x + step.x, y + step.y));
      });

      if (!direction) return;
      const step = DIRECTIONS[direction];
      const nextX = x + step.x;
      const nextY = y + step.y;
      this.ensureCell(cells, nextX, nextY, false, depth + i + 1);
      this.connectCells(cells, x, y, nextX, nextY);
      x = nextX;
      y = nextY;
      lastDirection = direction;
    }
  }

  private ensureCell(cells: Map<string, GridCell>, x: number, y: number, criticalPath: boolean, depth: number): GridCell {
    const id = key(x, y);
    const existing = cells.get(id);
    if (existing) {
      existing.criticalPath ||= criticalPath;
      if (criticalPath) existing.depth = Math.min(existing.depth, depth);
      return existing;
    }

    const cell: GridCell = {
      x,
      y,
      criticalPath,
      depth,
      connections: new Set(),
    };
    cells.set(id, cell);
    return cell;
  }

  private connectCells(cells: Map<string, GridCell>, ax: number, ay: number, bx: number, by: number): void {
    const a = this.ensureCell(cells, ax, ay, false, 0);
    const b = this.ensureCell(cells, bx, by, false, 0);
    a.connections.add(key(bx, by));
    b.connections.add(key(ax, ay));
  }

  private toRoomNode(cell: GridCell, _cells: Map<string, GridCell>, maxCriticalDepth: number): RoomNode {
    const id = key(cell.x, cell.y);
    const connections = Array.from(cell.connections);
    const exits = this.resolveExits(cell);
    const shape = resolveShape(exits.length, exits);
    const isDeadEnd = connections.length === 1;
    const isExtraction = cell.criticalPath && cell.depth === maxCriticalDepth;
    const isObjective = cell.criticalPath && cell.depth === Math.max(2, maxCriticalDepth - 2);

    const type: RoomType = cell.x === 0 && cell.y === 0
      ? 'Spawn'
      : isExtraction
        ? 'Extraction'
        : isObjective
          ? 'Objective'
          : isDeadEnd && !cell.criticalPath
            ? (cell.depth % 2 === 0 ? 'Loot' : 'Airlock')
            : exits.length >= 3
              ? 'Junction'
              : cell.depth % 5 === 0
                ? 'Engine'
                : 'Corridor';

    const roomScale = type === 'Loot' || type === 'Objective' || type === 'Extraction' || type === 'Airlock'
      ? 1.4
      : 1;

    return {
      id,
      type,
      shape: type === 'Loot' || type === 'Objective' || type === 'Extraction' || type === 'Airlock' ? 'room' : shape,
      position: new Vector3(cell.x * GRID_UNIT, 0, cell.y * GRID_UNIT),
      size: new Vector3(GRID_UNIT * roomScale, type === 'Engine' ? 5 : 3.5, GRID_UNIT * roomScale),
      grid: { x: cell.x, y: cell.y },
      depth: cell.depth,
      criticalPath: cell.criticalPath,
      connections,
      exits,
    };
  }

  private resolveExits(cell: GridCell): Direction[] {
    return Array.from(cell.connections)
      .map((connection) => {
        const [x, y] = connection.split(',').map(Number);
        const dx = x - cell.x;
        const dy = y - cell.y;
        return (Object.keys(DIRECTIONS) as Direction[]).find((direction) => {
          const step = DIRECTIONS[direction];
          return step.x === dx && step.y === dy;
        });
      })
      .filter((direction): direction is Direction => Boolean(direction));
  }
}

function resolveShape(exitCount: number, exits: Direction[]): TileShape {
  if (exitCount <= 1) return 'dead-end';
  if (exitCount === 4) return 'cross';
  if (exitCount === 3) return 't-junction';
  const [a, b] = exits;
  return DIRECTIONS[a].opposite === b ? 'straight' : 'corner';
}

function key(x: number, y: number): string {
  return `${x},${y}`;
}

function shuffle<T>(items: T[], random: () => number): T[] {
  return [...items].sort(() => random() - 0.5);
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = seed += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
