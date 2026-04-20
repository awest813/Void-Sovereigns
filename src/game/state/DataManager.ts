import { MISSIONS, Mission } from '../../content/missions/missionData';
import { TABLES, LootEntry } from './LootTable';

export interface Perk {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: number;
}

export class DataManager {
  private static instance: DataManager;
  
  private missions: Mission[] = [];
  private perks: Perk[] = [];

  private constructor() {
    this.initialize();
  }

  public static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  private initialize(): void {
    // 1. Load Missions from Content
    this.missions = [...MISSIONS];

    // 2. Load Perks (Static for now, can be external JSON)
    this.perks = [
      { id: 'TITAN_SHIELDS', name: 'TITAN SHIELDS', description: 'Double maximum shield capacity (200 Units)', icon: '🛡️', cost: 1 },
      { id: 'MARATHONER', name: 'MARATHONER', description: '+25% Base Movement Speed', icon: '🏃', cost: 1 },
      { id: 'OXY_EFFICIENCY', name: 'OXY-EFFICIENCY', description: '-40% Oxygen Consumption Rate', icon: '🫁', cost: 1 },
      { id: 'DEVASTATOR_MELEE', name: 'DEVASTATOR MELEE', description: 'Double Melee Bash Damage (100 Damage)', icon: '👊', cost: 1 },
    ];
  }

  // --- Mission API ---
  public getMissions(): Mission[] {
    return this.missions;
  }

  public getMission(id: string): Mission | undefined {
    return this.missions.find(m => m.id === id);
  }

  // --- Perk API ---
  public getPerks(): Perk[] {
    return this.perks;
  }

  public getPerk(id: string): Perk | undefined {
    return this.perks.find(p => p.id === id);
  }

  // --- Loot API ---
  public getLootTable(tier: 'COMMON' | 'RARE' | 'BOSS') {
    return TABLES[tier];
  }

  /**
   * Centralized method to handle data migrations or external overrides 
   * in the future (e.g., loading from a remote URL).
   */
  public async syncWithRemote(): Promise<boolean> {
    console.log('[DataManager] Syncing tactical data with terminal...');
    return true; 
  }
}

export const dataManager = DataManager.getInstance();
