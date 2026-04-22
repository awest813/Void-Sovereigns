import { createStore } from 'zustand/vanilla';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { MissionStatus } from './MissionState';

export type SceneId = 'hub' | 'mission';
export type WeaponType = 'pistol' | 'shotgun' | 'smg';

export interface LootItem {
  id: string;
  name: string;
  value: number;
}

export interface Equipment {
  weaponDamage: number;
  armorDurability: number;
}

export interface MissionSlice {
  currentScene: SceneId;
  activeMissionId: string | null;
  missionStatus: MissionStatus;
  completedMissions: string[];
  flags: Record<string, boolean>;
}

export interface EconomySlice {
  credits: number;
  inventory: LootItem[];
  marketSaturation: Record<string, number>;
}

export interface LoadoutSlice {
  equipment: Equipment;
  equippedWeapon: WeaponType;
  ammo: Record<WeaponType, number>;
}

export interface SurvivalSlice {
  oxygen: number;
  maxOxygen: number;
}

export interface ProgressionSlice {
  xp: number;
  level: number;
  perks: string[];
  perkPoints: number;
}

export type GameStateData =
  MissionSlice &
  EconomySlice &
  LoadoutSlice &
  SurvivalSlice &
  ProgressionSlice;

const SAVE_KEY = 'void-sovereigns-save';

const missionDefaults: MissionSlice = {
  currentScene: 'hub',
  activeMissionId: null,
  missionStatus: 'none',
  completedMissions: [],
  flags: {},
};

const economyDefaults: EconomySlice = {
  credits: 0,
  inventory: [],
  marketSaturation: {},
};

const loadoutDefaults: LoadoutSlice = {
  equipment: {
    weaponDamage: 10,
    armorDurability: 100,
  },
  equippedWeapon: 'pistol',
  ammo: {
    pistol: 60,
    shotgun: 12,
    smg: 120,
  },
};

const survivalDefaults: SurvivalSlice = {
  oxygen: 100,
  maxOxygen: 100,
};

const progressionDefaults: ProgressionSlice = {
  xp: 0,
  level: 1,
  perks: [],
  perkPoints: 0,
};

const initialState: GameStateData = {
  ...missionDefaults,
  ...economyDefaults,
  ...loadoutDefaults,
  ...survivalDefaults,
  ...progressionDefaults,
};

export const gameStateStore = createStore<GameStateData>()(
  persist(() => initialState, {
    name: SAVE_KEY,
    storage: createJSONStorage(() => localStorage),
  })
);

const read = () => gameStateStore.getState();
const patch = (partial: Partial<GameStateData>) => gameStateStore.setState(partial);

export const missionState = {
  setScene: (currentScene: SceneId) => patch({ currentScene }),
  setMissionStatus: (missionStatus: MissionStatus) => patch({ missionStatus }),
  acceptMission: (activeMissionId: string, missionStatus: MissionStatus) => {
    patch({ activeMissionId, missionStatus });
  },
  clearActiveMission: () => patch({ activeMissionId: null, missionStatus: 'none' }),
  completeMission: (missionId: string, missionStatus: MissionStatus) => {
    const s = read();
    patch({
      missionStatus,
      completedMissions: s.completedMissions.includes(missionId)
        ? s.completedMissions
        : [...s.completedMissions, missionId],
    });
  },
  setFlag: (key: string, value: boolean) => {
    patch({ flags: { ...read().flags, [key]: value } });
  },
};

export const economyState = {
  addLoot: (item: LootItem) => {
    patch({ inventory: [...read().inventory, item] });
  },
  getMarketValue: (itemId: string, baseValue: number) => {
    const saturation = read().marketSaturation[itemId] || 0;
    return Math.floor(baseValue * (1.0 - saturation * 0.6));
  },
  sellItem: (item: LootItem) => {
    const s = read();
    const value = economyState.getMarketValue(item.id, item.value);
    const newSaturation = Math.min(1.0, (s.marketSaturation[item.id] || 0) + 0.15);

    patch({
      credits: s.credits + value,
      inventory: s.inventory.filter((candidate) => candidate !== item),
      marketSaturation: { ...s.marketSaturation, [item.id]: newSaturation },
    });

    return value;
  },
  decaySaturations: () => {
    const next = { ...read().marketSaturation };
    Object.keys(next).forEach((key) => {
      next[key] = Math.max(0, next[key] - 0.2);
    });
    patch({ marketSaturation: next });
  },
};

export const loadoutState = {
  equipWeapon: (equippedWeapon: WeaponType) => patch({ equippedWeapon }),
  updateAmmo: (ammo: Record<WeaponType, number>) => patch({ ammo }),
  spendAmmo: (weapon: WeaponType, amount: number) => {
    const ammo = { ...read().ammo };
    ammo[weapon] = Math.max(0, ammo[weapon] - amount);
    patch({ ammo });
  },
  upgradeWeaponDamage: (amount: number) => {
    const s = read();
    patch({ equipment: { ...s.equipment, weaponDamage: s.equipment.weaponDamage + amount } });
  },
  setArmorDurability: (armorDurability: number) => {
    const s = read();
    patch({ equipment: { ...s.equipment, armorDurability } });
  },
};

export const survivalState = {
  resetOxygen: () => patch({ oxygen: read().maxOxygen }),
  setOxygen: (oxygen: number) => patch({ oxygen }),
  setMaxOxygen: (maxOxygen: number) => patch({ maxOxygen }),
};

export const progressionState = {
  addXP: (amount: number) => {
    const s = read();
    let xp = s.xp + amount;
    let level = s.level;
    let perkPoints = s.perkPoints;
    let leveledUp = false;

    while (xp >= level * 1000) {
      xp -= level * 1000;
      level++;
      perkPoints++;
      leveledUp = true;
    }

    patch({ xp, level, perkPoints });
    return leveledUp;
  },
  hasPerk: (id: string) => read().perks.includes(id),
  unlockPerk: (id: string) => {
    const s = read();
    if (s.perkPoints <= 0 || s.perks.includes(id)) return false;

    patch({
      perkPoints: s.perkPoints - 1,
      perks: [...s.perks, id],
    });

    return true;
  },
};

// Compatibility facade. Existing gameplay code can keep using this while newer
// systems move toward the grouped slice helpers above.
export const gameState = {
  get: read,
  update: patch,
  setFlag: missionState.setFlag,
  addLoot: economyState.addLoot,
  reset: () => {
    localStorage.removeItem(SAVE_KEY);
    window.location.reload();
  },
  save: () => {
    // Zustand persist handles writes automatically.
  },
  load: () => true,
  addXP: progressionState.addXP,
  getMarketValue: economyState.getMarketValue,
  sellItem: economyState.sellItem,
  decaySaturations: economyState.decaySaturations,
  hasPerk: progressionState.hasPerk,
  unlockPerk: progressionState.unlockPerk,
};
