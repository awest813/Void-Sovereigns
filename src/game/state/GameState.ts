import type { MissionStatus } from './MissionState';

export interface GameStateData {
  currentScene: 'hub' | 'mission';
  activeMissionId: string | null;
  missionStatus: MissionStatus;
  completedMissions: string[];
  flags: Record<string, boolean>;
}

const DEFAULT_STATE: GameStateData = {
  currentScene: 'hub',
  activeMissionId: null,
  missionStatus: 'none',
  completedMissions: [],
  flags: {},
};

class GameState {
  private data: GameStateData;
  private listeners: Array<(state: GameStateData) => void> = [];

  constructor() {
    this.data = { ...DEFAULT_STATE, completedMissions: [], flags: {} };
  }

  get(): Readonly<GameStateData> {
    return this.data;
  }

  update(partial: Partial<GameStateData>): void {
    this.data = { ...this.data, ...partial };
    this.notify();
  }

  setFlag(key: string, value: boolean): void {
    this.data.flags = { ...this.data.flags, [key]: value };
    this.notify();
  }

  getFlag(key: string): boolean {
    return this.data.flags[key] ?? false;
  }

  subscribe(listener: (state: GameStateData) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  reset(): void {
    this.data = { ...DEFAULT_STATE, completedMissions: [], flags: {} };
    this.notify();
  }

  save(): void {
    try {
      localStorage.setItem('void-sovereigns-save', JSON.stringify(this.data));
    } catch {
      // localStorage may not be available
    }
  }

  load(): boolean {
    try {
      const raw = localStorage.getItem('void-sovereigns-save');
      if (raw) {
        this.data = JSON.parse(raw) as GameStateData;
        this.notify();
        return true;
      }
    } catch {
      // ignore corrupt saves
    }
    return false;
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.data);
    }
  }
}

export const gameState = new GameState();
