export type MissionStatus =
  | 'none'
  | 'accepted'
  | 'deployed'
  | 'objectiveActive'
  | 'objectiveComplete'
  | 'extractionAvailable'
  | 'success'
  | 'returnedToHub';

const VALID_TRANSITIONS: Record<MissionStatus, MissionStatus[]> = {
  none: ['accepted'],
  accepted: ['deployed', 'none'],
  deployed: ['objectiveActive'],
  objectiveActive: ['objectiveComplete'],
  objectiveComplete: ['extractionAvailable'],
  extractionAvailable: ['success'],
  success: ['returnedToHub'],
  returnedToHub: ['none'],
};

export function canTransition(from: MissionStatus, to: MissionStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function transitionMission(current: MissionStatus, next: MissionStatus): MissionStatus {
  if (!canTransition(current, next)) {
    console.warn(`Invalid mission transition: ${current} -> ${next}`);
    return current;
  }
  return next;
}
