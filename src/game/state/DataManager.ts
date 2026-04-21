import { MISSIONS, type MissionDefinition } from '../../content/missions/missionData';
import { TABLES } from './LootTable';

export interface Perk {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: number;
}

export class DataManager {
  private static instance: DataManager;
  private missions: MissionDefinition[] = [];
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
    this.missions = [...MISSIONS];
    this.perks = [
      {
        id: 'TITAN SHIELDS',
        name: 'TITAN SHIELDS',
        description: 'Double maximum shield capacity (200 units).',
        icon: 'SH',
        cost: 1,
      },
      {
        id: 'MARATHONER',
        name: 'MARATHONER',
        description: '+25% base movement speed.',
        icon: 'SP',
        cost: 1,
      },
      {
        id: 'OXY-EFFICIENCY',
        name: 'OXY-EFFICIENCY',
        description: '-40% oxygen consumption rate.',
        icon: 'OX',
        cost: 1,
      },
      {
        id: 'DEVASTATOR MELEE',
        name: 'DEVASTATOR MELEE',
        description: 'Double melee bash damage.',
        icon: 'ME',
        cost: 1,
      },
    ];
  }

  public getMissions(): MissionDefinition[] {
    return this.missions;
  }

  public getMission(id: string): MissionDefinition | undefined {
    return this.missions.find((mission) => mission.id === id);
  }

  public getPerks(): Perk[] {
    return this.perks;
  }

  public getPerk(id: string): Perk | undefined {
    return this.perks.find((perk) => perk.id === id);
  }

  public getLootTable(tier: 'COMMON' | 'RARE' | 'BOSS') {
    return TABLES[tier];
  }

  public async syncWithRemote(): Promise<boolean> {
    console.log('[DataManager] Syncing tactical data with terminal...');
    return true;
  }
}

export const dataManager = DataManager.getInstance();
