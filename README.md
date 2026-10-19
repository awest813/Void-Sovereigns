# VOID SOVEREIGNS

A first-person sci-fi extraction game built with [Babylon.js](https://www.babylonjs.com/) + TypeScript + Vite.

## Phase 0 — Playable Prototype

Complete core loop:  
**Hub station → Accept mission → Deploy → Retrieve objective → Extract → Debrief → Return**

### Controls

| Key | Action |
|-----|--------|
| WASD / Arrow keys | Move |
| Mouse | Look |
| Shift | Sprint |
| E | Interact |
| Click | Lock mouse pointer |

### Getting started

```bash
npm install
npm start       # dev server (http://localhost:5173)
npm run build   # production build
npm run check   # TypeScript type check
```

### Steam

The desktop build that ships on Steam is the Godot 4 project in [`godot/`](godot/README.md). It boots to a title screen (continue, new game, settings, credits, quit), pauses on Esc / Start and when the Steam overlay opens, and exports from `export_presets.cfg`. Replace `godot/steam/app_id.txt` with the real Steamworks App ID before a store upload. App ID 480 is the Spacewar test app and is refused in release exports.

### Architecture

```
src/
  engine/           GameEngine, SceneManager, FirstPersonController
  game/
    hub/            HubScene — industrial space station interior
    missions/       MissionZone — derelict corridor with objective + extraction
    interactions/   Interactable interface + InteractionSystem (raycast, E key)
    state/          GameState (localStorage persistence), MissionState (validated transitions)
  ui/
    hud/            HUD — crosshair, interaction prompt, mission status bar
    missionBoard/   MissionBoardUI — briefing panel with Accept / Deploy / Close
    debrief/        DebriefUI — mission success overlay
  content/
    missions/       missionData — mission definitions
  main.ts           Wires scenes, state, UI and transitions together
```
