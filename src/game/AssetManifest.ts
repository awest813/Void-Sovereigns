/**
 * Centralized manifest for the Quaternius asset packs.
 * These paths assume the assets have been extracted into the /public/assets/ directory.
 */
export const ASSETS = {
  WEAPONS: {
    PISTOL: '/assets/weapons/SciFi_Pistol.glb',
    SHOTGUN: '/assets/weapons/SciFi_Shotgun.glb',
    SMG: '/assets/weapons/SciFi_SMG.glb',
  },
  ENEMIES: {
    SECURITY_MECH: '/assets/robots/Animated_Mech.glb',
  },
  CHARACTERS: {
    SF_MALE: '/assets/characters/Modular_SciFi_Male.glb',
    SF_FEMALE: '/assets/characters/Modular_SciFi_Female.glb',
    ANIM_LIBRARY_V1: '/assets/characters/Universal_Animations_V1.glb',
    ANIM_LIBRARY_V2: '/assets/characters/Universal_Animations_V2.glb',
  },
  ENVIRONMENT: {
    FLOOR: '/assets/env/Modular_Floor.glb',
    WALL: '/assets/env/Modular_Wall.glb',
    DOOR: '/assets/env/Modular_Door.glb',
    CONSOLE: '/assets/env/Modular_Console.glb',
    CRATE: '/assets/env/Modular_Crate.glb',
  },
  PICKUPS: {
    HEALTH: '/assets/pickups/Health.glb',
    AMMO: '/assets/pickups/Ammo.glb',
  },
  VEHICLES: {
    TRUCK: '/assets/vehicles/SciFi_Truck.glb',
    CRANE: '/assets/vehicles/Hangar_Crane.glb',
  },
  SHIPS: {
    DROPSHIP: '/assets/ships/Modular_Dropship.glb',
    FIGHTER: '/assets/ships/Modular_Fighter.glb',
  }
};
