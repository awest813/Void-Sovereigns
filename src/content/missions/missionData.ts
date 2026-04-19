export interface MissionDefinition {
  id: string;
  title: string;
  briefing: string;
  objectiveName: string;
  objectiveDescription: string;
  location: string;
  threat: string;
  reward: string;
}

export const MISSIONS: MissionDefinition[] = [
  {
    id: 'salvage-alpha',
    title: 'Salvage Run — Sector 7G',
    briefing:
      'A derelict freighter in Sector 7G has been flagged for salvage. Recovery teams reported unusual interference before losing contact. Retrieve the cargo manifest data core from the wreck and return to the station.',
    objectiveName: 'Data Core',
    objectiveDescription: 'Cargo manifest data core from the derelict freighter.',
    location: 'Derelict Freighter — Sector 7G',
    threat: 'Low — environmental hazards, no confirmed hostiles',
    reward: '500 CR + Salvage Rights',
  },
];

export function getMission(id: string): MissionDefinition | undefined {
  return MISSIONS.find(m => m.id === id);
}
