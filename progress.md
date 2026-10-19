Original prompt: A slow, methodical crawl changes the AI's role from "combatant" to "predator." In this setup, the AI's goal is to punish impatience and reward sound/light management.

Progress:
- Starting predator-pressure pass after state-slice refactor.
- Targeting small, compatible systems: player exposure metadata, suspicion-based bot detection, peek behavior, and more aggressive extraction-phase response.
- Added player stealth metadata from controller movement state, crouch, dash, and flashlight.
- Added suspicion/peek behavior to SecurityBot and made post-objective/extraction reinforcements arrive alert.
- Playwright smoke exposed a startup issue in headless Chromium where WebGPU is advertised but unavailable; added WebGL fallback.
- `npm run check` and `npm run build` pass.
- Playwright smoke now reaches gameplay in WebGL fallback mode; remaining console errors are pre-existing external asset fetch/import failures from Babylon-hosted assets/sounds.
- Fixed known runtime errors from the smoke test:
  - Removed external Babylon sample sound/texture URLs from gameplay systems.
  - Added procedural particle texture and no-op local sound facade for offline/headless stability.
  - Fixed Babylon mesh import rootUrl/filename splitting.
  - Added procedural fallback meshes for missing manifest assets without issuing 404 preflight requests.
  - Replaced missing favicon file request with inline SVG favicon.
  - Tightened renderer choice: WebGL remains the reliable fallback, WebGPU checks for an adapter before initialization, and `?renderer=webgl` / `?renderer=webgpu` can force a path for testing.
- Added a browser-safe asset pipeline spine:
  - `GameAssetManager` caches GLB AssetContainers by scene and instantiates from them instead of loading directly into gameplay callers.
  - Missing manifest assets now use procedural fallback templates and mesh instances instead of clone-heavy ad-hoc placeholders.
  - Mission generation preloads environment/entity asset groups before room placement.
  - Room metadata and `RoomActivitySystem` are in place for adjacent-room light/mesh culling.
- Replaced fixed mission layout with a seeded grid-based main-path + branches generator:
  - Spawn starts at grid `[0,0]`.
  - Extraction resolves to the end of the critical path.
  - Objective resolves before extraction on the critical path.
  - Branch dead-ends become Loot/Airlock rooms for horror looting pressure.
  - Rooms now expose grid coordinates, tile shape, exits, depth, and critical-path metadata.
- Imported a narrow set of verified CC0 Quaternius assets from OpenGameArt Ultimate Space Kit:
  - Real mech, crate, dropship stand-in, health pickup, and ammo pickup GLBs.
  - Added `public/assets/THIRD_PARTY_ASSETS.md` with source/license/import notes.
  - Left broader packs out unless their download/source path was clean and exact-fit.
- `npm run check`, `npm run build`, and Playwright smoke pass now complete without generated `errors-*.json`.
- AIDirector implemented (`src/game/missions/AIDirector.ts`):
  - Spawn budgets by room type + critical-path depth (Objective 1–2, Engine 1, Junction 1–2, Loot/Airlock 50% ambush, Corridor probabilistic patrol).
  - Bots in rooms at or beyond 60% of max critical-path depth start force-alerted.
  - Multiple bots in the same room are spread in a ring around the room centre.
  - SecurityBot spawning removed from MissionZone room loop; AIDirector.spawnEncounters called after all room content is placed.
- Structural tile variants implemented in MissionZone (`buildRoomStructure`):
  - Per-room floor slab + ceiling slab (always present).
  - Wall panels placed at each cardinal side that has no exit, oriented inward via Y-axis rotation.
  - N/S panels span the X axis; E/W panels span the Z axis — corridors and rooms now read as enclosed spaces with directional openings.

Steam release shell (Godot):
- Title screen is the boot scene: Continue, New Game, Settings, Credits, Quit.
- Settings persist outside the campaign slot (window mode, resolution, vsync, frame cap, volumes, mouse/stick, invert, FOV, rebinding).
- Pause menu (Esc / Start) with resume, settings, abandon contract, return to title, confirm-quit. Steam overlay pauses the sim when GodotSteam is present.
- Failed contracts open a KIA debrief instead of leaving the player with no way back to the station.
- Gamepad bindings for movement, look, fire, jump, crouch, interact, reload, sprint, dash, flashlight, melee, grenade, and menu navigation.
- SteamService talks to GodotSteam when the singleton exists, unlocks nine achievements, and syncs slot 0 through Remote Storage. Release exports refuse Spacewar app id 480.
- `export_presets.cfg` covers Windows, Linux, and macOS and excludes `steam_appid.txt`.
- Headless `godot --path godot -- --release-check` loads the boot, hub, mission, and player scenes and checks the shipping invariants.
- Godot 4.4.1 now compiles the gameplay scripts. `:=` against untyped values was a hard error, and `Node.get_world_3d()` is not a method, so those call sites were given real types.

TODO:
- Install GodotSteam plus the Steamworks redistributable, set the real App ID, create the achievements in Steamworks, then upload with `steam/export_release.sh` and `steamcmd`.
- Content still thin for a store page: local sound, corridor mesh variants, and the remaining Quaternius packs.
