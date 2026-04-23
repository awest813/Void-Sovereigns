# Void Sovereigns — Godot 4 Project

This directory contains the **Godot 4.4+ (Forward+)** migration of Void Sovereigns,
built on top of [`awest813/Void-Sovereigns-FPS`](https://github.com/awest813/Void-Sovereigns-FPS).

## Opening in Godot

1. Download [Godot 4.4](https://godotengine.org/download) (stable)
2. Open **Project Manager** → **Import** → navigate to `godot/` → select `project.godot`
3. Click **Import & Edit**

> **No build step required.** Open in the editor and press F5 to run.

## Project Structure

```
godot/
├── project.godot              # Godot 4 project config (Forward+, all input actions)
├── default_bus_layout.tres    # Audio buses: Master, SFX, Music
├── scenes/
│   ├── player.tscn            # CharacterBody3D FPS controller
│   ├── hub.tscn               # Hub scene — 6 terminal Areas
│   ├── mission.tscn           # Mission scene — dungeon + all gameplay systems
│   └── entities/
│       ├── security_bot.tscn
│       ├── turret.tscn
│       ├── boss_centurion.tscn
│       └── station_npc.tscn
└── scripts/
    ├── Global.gd              # Mouse sensitivity (autoload)
    ├── player.gd              # FPS controller (extends Void-Sovereigns-FPS player)
    ├── mission.gd             # Mission scene controller
    ├── autoloads/
    │   ├── SceneManager.gd    # Scene switching
    │   ├── GameAssetManager.gd# GLB asset cache
    │   ├── MissionState.gd    # Mission FSM + persistence
    │   ├── EconomyState.gd    # Credits, inventory, market
    │   ├── LoadoutState.gd    # Weapons, ammo
    │   ├── SurvivalState.gd   # Oxygen
    │   └── ProgressionState.gd# XP, level, perks
    ├── game/
    │   ├── HealthSystem.gd    # HP + shields
    │   ├── OxygenSystem.gd    # Oxygen drain
    │   ├── ExtractionSystem.gd# Hold-zone countdown
    │   ├── WeaponSystem.gd    # Pistol/shotgun/SMG, raycast, melee, grenade
    │   ├── GravityGrenade.gd  # Pull-grenade physics
    │   └── InteractionSystem.gd
    ├── entities/
    │   ├── SecurityBot.gd     # 8-state FSM AI + NavigationAgent3D
    │   ├── Turret.gd
    │   ├── BossCenturion.gd   # Phase-transition boss
    │   └── StationNPC.gd
    ├── missions/
    │   ├── DungeonGenerator.gd# Seeded grid dungeon (direct port)
    │   ├── MissionZone.gd     # Room instantiation
    │   └── RoomActivitySystem.gd
    ├── hub/
    │   └── HubScene.gd
    ├── effects/
    │   ├── EnvironmentalHazards.gd
    │   └── RadioChatter.gd
    ├── content/
    │   ├── AssetManifest.gd   # GLB path map
    │   ├── MissionData.gd     # Mission definitions
    │   ├── LootData.gd        # Loot tables
    │   └── DataManager.gd     # Autoload data accessor
    ├── ui/
    │   ├── HUD.gd
    │   ├── MainMenuUI.gd
    │   ├── LoadingUI.gd
    │   ├── MissionBoardUI.gd
    │   ├── DebriefUI.gd
    │   ├── ShopUI.gd
    │   ├── PerkMenuUI.gd
    │   ├── InventoryUI.gd
    │   └── DecryptionUI.gd
    └── shaders/
        └── blur.gdshader
```

## Relationship with Void-Sovereigns-FPS

The `player.gd` here extends the FPS template player with:
- Sprint (Shift), crouch (Ctrl), jump already wired
- **Impulse dash (Q)** — 2 charges, 1.8s cooldown
- **Flashlight (L)** toggle via `SpotLight3D`
- Footstep audio accumulator
- FoV sway (sprint → 82°)
- `get_exposure_score()`, `get_accuracy_penalty()`, `is_dodging()` — read by SecurityBot and WeaponSystem
- `impulse_changed` signal → HUD impulse bar

## Asset Pipeline

Place GLB files from `public/assets/` into `res://assets/` following the paths in
`scripts/content/AssetManifest.gd`. Godot auto-imports GLBs on project open.

## What's left (Phase 6)

- Wire real GLB room meshes into `scenes/rooms/` (one `.tscn` per `room_type`)
- Add `AudioStream` assets into `audio/` and connect to `RadioChatter.gd`
- Bake `NavigationMesh` per room template or at mission runtime
- Build Godot `Theme` resource for sci-fi UI styling
- Polish: animation blending, particle effects, post-process env
