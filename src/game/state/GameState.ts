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
  
  // Economic Systems
  credits: number;
  inventory: LootItem[];
  equipment: Equipment;
  marketSaturation: Record<string, number>; // itemId -> saturation (0 to 1)

  // New Simulation Systems
  oxygen: number;
  maxOxygen: number;
  equippedWeapon: 'pistol' | 'shotgun' | 'smg';
  
  // RPG Systems
  xp: number;
  level: number;
  perks: string[];
  perkPoints: number;
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
      marketSaturation: {},
      oxygen: 100,
      maxOxygen: 100,
      equippedWeapon: 'pistol',
      xp: 0,
      level: 1,
      perks: [],
      perkPoints: 0,
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
    return true;
  },
  addXP: (amount: number) => {
    const s = gameStateStore.getState();
    const newXP = s.xp + amount;
    const nextLevelXP = s.level * 1000;
    
    if (newXP >= nextLevelXP) {
       gameStateStore.setState({ 
         xp: newXP - nextLevelXP, 
         level: s.level + 1,
         perkPoints: s.perkPoints + 1
       });
       return true; // Level up!
    }
    gameStateStore.setState({ xp: newXP });
    return false;
  },
  getMarketValue: (itemId: string, baseValue: number) => {
    const sat = gameStateStore.getState().marketSaturation[itemId] || 0;
    // Price drops up to 60% based on saturation
    return Math.floor(baseValue * (1.0 - (sat * 0.6)));
  },
  sellItem: (item: LootItem) => {
    const s = gameStateStore.getState();
    const value = gameState.getMarketValue(item.id, item.value);
    const newSat = Math.min(1.0, (s.marketSaturation[item.id] || 0) + 0.15); // +15% saturation per sale
    
    gameStateStore.setState({
      credits: s.credits + value,
      inventory: s.inventory.filter(i => i !== item),
      marketSaturation: { ...s.marketSaturation, [item.id]: newSat }
    });
    return value;
  },
  decaySaturations: () => {
    const s = gameStateStore.getState();
    const newSats = { ...s.marketSaturation };
    Object.keys(newSats).forEach(k => {
      newSats[k] = Math.max(0, newSats[k] - 0.2); // 20% recovery per mission
    });
    gameStateStore.setState({ marketSaturation: newSats });
  },
  hasPerk: (id: string) => {
    return gameStateStore.getState().perks.includes(id);
  },
  unlockPerk: (id: string) => {
    const s = gameStateStore.getState();
    if (s.perkPoints > 0 && !s.perks.includes(id)) {
       gameStateStore.setState({
         perkPoints: s.perkPoints - 1,
         perks: [...s.perks, id]
       });
       return true;
    }
    return false;
  }
};
