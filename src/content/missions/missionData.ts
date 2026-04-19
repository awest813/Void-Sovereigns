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
  {
    id: 'power-cell-deck4',
    title: 'Power Cell Recovery — Deck 4',
    briefing:
      'Station auxiliary power is critical. Engineering traced the fault to Deck 4 of the old industrial block. A stabilised power cell was abandoned there during the last evacuation. Retrieve it before the backup grid fails.',
    objectiveName: 'Power Cell',
    objectiveDescription: 'Stabilised auxiliary power cell, Deck 4 industrial block.',
    location: 'Industrial Block — Deck 4',
    threat: 'Moderate — unstable structure, residual electrical discharge',
    reward: '750 CR + Station Commendation',
  },
];

export function getMission(id: string): MissionDefinition | undefined {
  return MISSIONS.find(m => m.id === id);
}
