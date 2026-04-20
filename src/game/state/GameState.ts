import { createStore } from 'zustand/vanilla';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { MissionStatus } from './MissionState';

export interface LootItem {
  id: string;
  name: string;
  value: number;
}

export interface Equipment {
  weaponDamage: number;
  armorDurability: number;
}

export interface GameStateData {
  currentScene: 'hub' | 'mission';
  activeMissionId: string | null;
  missionStatus: MissionStatus;
  completedMissions: string[];
  flags: Record<string, boolean>;
  
  credits: number;
  inventory: LootItem[];
  equipment: Equipment;

  // New Simulation Systems
  oxygen: number;
  maxOxygen: number;
  equippedWeapon: 'pistol' | 'shotgun' | 'smg';
}

export const gameStateStore = createStore<GameStateData>()(
  persist(
    () => ({
      currentScene: 'hub',
      activeMissionId: null,
      missionStatus: 'none',
      completedMissions: [],
      flags: {},
      credits: 0,
      inventory: [],
      equipment: {
        weaponDamage: 10,
        armorDurability: 100,
      },
      oxygen: 100,
      maxOxygen: 100,
      equippedWeapon: 'pistol',
    }),
    {
      name: 'void-sovereigns-save',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Compatibility / Helper Layer
export const gameState = {
  get: () => gameStateStore.getState(),
  update: (partial: Partial<GameStateData>) => gameStateStore.setState(partial),
  setFlag: (key: string, value: boolean) => {
    const flags = { ...gameStateStore.getState().flags, [key]: value };
    gameStateStore.setState({ flags });
  },
  addLoot: (item: LootItem) => {
    const inventory = [...gameStateStore.getState().inventory, item];
    gameStateStore.setState({ inventory });
  },
  reset: () => {
     localStorage.removeItem('void-sovereigns-save');
     window.location.reload(); 
  },
  save: () => {
    // Zustand persist handles this automatically, 
    // but we can keep it as a no-op or trigger manual sync if needed.
  },
  load: () => {
    // Zustand persist handles this automatically on store creation.
    return true;
  }
};
