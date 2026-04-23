# Void Sovereigns — Godot 4 Project

This directory contains the **Godot 4.4+ (Forward+)** migration of Void Sovereigns,
built on top of [`awest813/Void-Sovereigns-FPS`](https://github.com/awest813/Void-Sovereigns-FPS).

## Opening in Godot

1. Download [Godot 4.4](https://godotengine.org/download) (stable)
2. Open **Project Manager** → **Import** → navigate to `godot/` → select `project.godot`
3. Click **Import & Edit**

> **No build step required.** Open in the editor and press F5 to run.## Project Structure

```
godot/
├── project.godot              # Godot 4.4 project config (Forward+, all input actions)
├── default_bus_layout.tres    # Audio buses: Master, SFX, Music
├── scenes/
│   ├── player.tscn
│   ├── hub.tscn
│   ├── mission.tscn
│   └── entities/
│       ├── security_bot.tscn
│       ├── turret.tscn
│       ├── boss_centurion.tscn
│       └── station_npc.tscn
└── scripts/
    ├── Global.gd
    ├── player.gd
    ├── mission.gd
    ├── autoloads/
    │   ├── SceneManager.gd
    │   ├── GameAssetManager.gd
    │   ├── MissionState.gd        # delegates persistence to SaveSystem
    │   ├── EconomyState.gd
    │   ├── LoadoutState.gd
    │   ├── SurvivalState.gd
    │   └── ProgressionState.gd
    ├── system/
    │   ├── SaveSystem.gd          # Slot-based save, versioned, crash-safe writes [NEW]
    │   └── SpawnTrackerManager.gd # Tracks cleared spawns across sessions [NEW]
    ├── combat/
    │   ├── DamagePacket.gd        # Typed damage data (type, crit, tags, status) [NEW]
    │   ├── StatusEffect.gd        # Timed effects: burn, slow, void, freeze [NEW]
    │   ├── CombatantComponent.gd  # Resistances, poise, i-frames, status [NEW]
    │   ├── HitPipeline.gd         # Autoload — routes DamagePackets to targets [NEW]
    │   ├── SKHitbox.gd            # Area3D attacker hitbox (melee dedup) [NEW]
    │   └── SKHurtbox.gd           # Area3D defender hurtbox [NEW]
    ├── loottable/
    │   └── SKLootTable.gd         # Weighted drops, min/max rolls, conditions [NEW]
    ├── quests/
    │   ├── QuestDefinition.gd     # DAG quest Resource [NEW]
    │   └── QuestGraphEngine.gd    # Autoload — multi-obj quest graph [NEW]
    ├── ai/
    │   ├── PerceptionEyes.gd      # FOV cone + light estimation detection [NEW]
    │   ├── PerceptionEars.gd      # Sound-event perception [NEW]
    │   └── SKBlackboard.gd        # Shared AI key-value store per encounter [NEW]
    ├── dialogue/
    │   ├── DialogueDefinition.gd  # Branching dialogue Resource [NEW]
    │   └── DialogueSession.gd     # Runtime dialogue state [NEW]
    ├── game/
    │   ├── HealthSystem.gd        # HP + shields + DamagePacket receive()
    │   ├── OxygenSystem.gd
    │   ├── ExtractionSystem.gd
    │   ├── WeaponSystem.gd        # Uses DamagePacket + HitPipeline
    │   ├── GravityGrenade.gd      # Uses DamagePacket.Type.EXPLOSIVE
    │   └── InteractionSystem.gd
    ├── entities/
    │   ├── SecurityBot.gd         # Uses CombatantComponent, PerceptionEyes, SKBlackboard
    │   ├── Turret.gd
    │   ├── BossCenturion.gd       # Uses CombatantComponent, SKLootTable
    │   └── StationNPC.gd          # Uses DialogueSession
    ├── missions/
    │   ├── DungeonGenerator.gd
    │   ├── MissionZone.gd
    │   └── RoomActivitySystem.gd
    ├── hub/
    │   └── HubScene.gd
    ├── effects/
    │   ├── EnvironmentalHazards.gd # Uses DamagePacket + StatusEffect
    │   └── RadioChatter.gd
    ├── content/
    │   ├── AssetManifest.gd
    │   ├── MissionData.gd
    │   ├── LootData.gd            # Legacy tables (still used as fallback)
    │   └── DataManager.gd
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
- ~~Build Godot `Theme` resource for sci-fi UI styling~~ ✅ — see **Hub UI (Marathon × Tarkov)** below
- Polish: animation blending, particle effects, post-process env

---

## Hub UI (Marathon × Tarkov)

The hub now ships with a **full-screen shell** (`scripts/ui/hub/HubShell.gd`)
laid out in classic extraction-shooter density: top bar (credits / XP / perk &
skill pips), left nav rail, tab content, bottom status hint bar. The shell is
purely code-constructed and automatically instantiated by `HubScene.gd`; toggle
with the new input actions:

| Action          | Default key(s) | Tab opened |
|-----------------|----------------|------------|
| `ui_inventory`  | `I` / `Tab`    | INVENTORY  |
| `ui_character`  | `C`            | CHARACTER  |
| `ui_perks`      | `P`            | PERKS      |
| `ui_skills`     | `K`            | SKILLS     |
| `ui_map`        | `M`            | (reserved) |
| `skill_slot_1`  | `Z`            | hotbar 1   |
| `skill_slot_2`  | `X`            | hotbar 2   |
| `skill_slot_3`  | `V`            | hotbar 3   |

### Tabs
`CharacterTab` paper-doll slots + damage-resistance readout · `InventoryTab`
rarity-bordered tile grid with filter strip + SORT · `LoadoutTab` primary /
secondary / melee slots with DPS & ammo · `PerksTab` three-branch × five-tier
matrix with prerequisite lines drawn in `_draw()` · `SkillsTab` list + Z/X/V
hotbar binder · `TraderTab` Kirov sell list with market-saturation pricing ·
`LaunchTab` contract cards with READY check and `DEPLOY`.

### Theme palette (`scripts/ui/theme/HubPalette.gd`)
- Backgrounds: `#0b0e11`, `#14181c`, `#1b2026`
- Accent: `#2be0c8` (teal) · Warn: `#e07a2b` · Danger: `#d94a4a`
- Rarity accents: grey / green / blue / purple / gold
- Spacing scale: 2 / 4 / 8 / 16 / 24; 0 corner radius; 1 px borders
- Optional scanline+grain shader (`hub_grain.gdshader`) applied to the full-screen background

## Content Registry & Typed Resources

Weapons, armor, perks, and skills are authored as `Resource` subclasses under
`scripts/content/`:

| Resource             | Notes |
|----------------------|-------|
| `ItemDefinition`     | Base class — id/display_name/rarity/grid_w×h/category/stack_size |
| `WeaponDefinition`   | damage / fire_rate / mag_size / recoil / pellets / damage_type; `dps()` helper |
| `ArmorDefinition`    | slot (HEAD/CHEST/LEGS/ARMS/BACKPACK/RIG) / resistances per DamagePacket.Type / move_speed/stealth / container grid |
| `PerkDefinition`     | branch (COMBAT/SURVIVAL/TECH/VOID) × tier 1–5 / requires / stat_mods |
| `SkillDefinition`    | ACTIVE/PASSIVE / cooldown / energy_cost / requires / optional script hook |

`ContentRegistry` (autoload) scans `res://content/{weapons,armor,perks,skills}/`
for `.tres` files and falls back to a code-defined seed catalogue
(`ContentSeeds.gd`) so the project is always runnable:

- **Weapons**: Kestrel .357, Hornet SMG, Breacher 12G, Lancer Mk-IV, Void Maul
- **Armor**: Scout Hood, Centurion Helm, Rigger / Marauder / Voidforged chest tiers, Scavenger Rig, Drifter Pack
- **Perks**: 15 perks across COMBAT / SURVIVAL / TECH (5 tiers each)
- **Skills**: Impulse Surge, Scavenger Eye, Void Lance, Stalwart, Field Medic, Voidwalker

To author new items, drop a `.tres` file (with matching `id`) into the
corresponding folder; on next load it overrides the seed entry.

## Grid Inventory (`InventoryState` autoload)

Inventory is now grid-aware. Capacity is derived from the equipped RIG +
BACKPACK (`ArmorDefinition.container_w × container_h`); `EconomyState.inventory`
is a read-mostly facade kept for backwards compatibility with older UI scripts.

API:
```
InventoryState.add_item(id, count=1)
InventoryState.remove_item(id, count=1)
InventoryState.move_item(stack, Vector2i(x, y))
InventoryState.sort()
InventoryState.can_fit(id, count=1) -> bool
InventoryState.total_capacity() -> int
InventoryState.remaining_capacity() -> int
```

Signals: `inventory_changed`, `item_added`, `item_removed`, `capacity_changed`.

## Progression Extensions

`ProgressionState` now tracks **skills** alongside perks:
- `skill_points` earned at **1 per 2 character levels**
- `can_unlock_perk(id)` enforces `PerkDefinition.requires` + tier gating (`level >= tier * 5`)
- `can_unlock_skill(id)` enforces `SkillDefinition.requires` + level gating
- `bind_skill_to_slot(i, id)` binds an active skill to hotbar slot 0..2 (Z/X/V)

Legacy perk ids (e.g. `"TITAN SHIELDS"`) are aliased internally to the new ids
(`"titan_shields"`), so older saves and call-sites keep working.

## Loadout Slots

`LoadoutState` has expanded from a single `equipped_weapon` string to:
- `equipped_primary` / `equipped_secondary` / `equipped_melee` — WeaponDefinition ids
- `equipped_armor: Dictionary[slot → id]` — armor slots
- `equipped_rig` — convenience alias for the `rig` armor slot
- `aggregate_resistance(damage_type: int)` — product of all equipped armor multipliers
- Legacy fields (`equipped_weapon`, `ammo`, `weapon_damage`, `armor_durability`) are preserved as facades so `WeaponSystem.gd`, `HUD.gd`, `ShopUI.gd` etc. keep working unchanged.

`WeaponSystem.gd` now reads `damage / fire_rate / recoil / pellets / damage_type`
from the `WeaponDefinition` of the currently equipped primary (via
`ContentRegistry`), falling back to its original hard-coded tables when no
definition is found.

`HealthSystem.receive()` on the player applies `LoadoutState.aggregate_resistance()`
so equipped armor actually mitigates incoming `DamagePacket`s by type.


---

## New Systems (SkeleRealms-inspired)

### 🔴 Save System (`scripts/system/SaveSystem.gd`)
Centralized persistence autoload. **Always the first autoload.**
- **3 named save slots** (`user://saves/slot_N.cfg`)
- **Schema version** stamped in `__meta` section; migrate via `MIGRATIONS` dict
- **Crash-safe atomic write**: data written to `.tmp` first, then renamed
- **API**: `get_value(section, key, default)` / `set_value(section, key, val)` / `flush()` / `switch_slot(n)` / `delete_slot(n)` / `list_slots()`
- All autoloads use SaveSystem instead of raw ConfigFile

### 🔴 Damage Pipeline (`scripts/combat/`)
| Class | Role |
|---|---|
| `DamagePacket` | Typed damage data: `amount`, `type` (BALLISTIC/VOID/THERMAL/MELEE/EXPLOSIVE/HAZARD), `is_crit`, `tags`, optional `StatusEffect` |
| `StatusEffect` | Timed effect with tick damage + slow. Factories: `burn()`, `slow()`, `void_exposure()`, `freeze()`, `radiation()` |
| `CombatantComponent` | Node attached to enemies. Handles resistances, poise/stagger, i-frames, active status effects |
| `HitPipeline` (autoload) | `resolve(packet, target)` — finds CombatantComponent → HealthSystem → legacy `take_damage()` |
| `SKHitbox` | Area3D attacker; call `activate(packet)` to begin melee swing detection |
| `SKHurtbox` | Area3D defender; deduplicates per-hit and routes to HitPipeline |

**WeaponSystem**, **GravityGrenade**, **EnvironmentalHazards** all create typed `DamagePacket`s.
**HealthSystem** gained `receive(packet)` for player damage. **SecurityBot** / **BossCenturion** have a `CombatantComponent` child created in `_ready()`.

### 🔴 Loot Tables (`scripts/loottable/SKLootTable.gd`)
`SKLootTable` is a `Resource` with weighted entries, `min_rolls`/`max_rolls`, and per-entry `condition` strings (`"level>=5"`). Call `roll(context)` → `Array[{id, name, value, category}]`.  
`SKLootTable.from_array(LootData.TABLE_BOSS)` bridges legacy tier arrays.  
Both enemies expose `@export var loot_table: SKLootTable` (falls back to `LootData` when null).

### 🟡 Quest Graph Engine (`scripts/quests/`)
`QuestDefinition` — a Resource DAG. Each objective can branch to multiple next objectives and set flags on completion. `QuestGraphEngine` (autoload) evaluates flag changes against active quest conditions, advances objectives, and grants rewards on terminal-objective completion. Persists completed quest IDs via SaveSystem.

### 🟡 Perception System (`scripts/ai/`)
`PerceptionEyes` — proper FOV cone (direct + peripheral), distance falloff, line-of-sight raycast, and graduated suspicion ramp. `update(delta, target, parent)` returns `0/1/2` (unseen/noticed/alerted). Replaces SecurityBot's former `_update_suspicion()` + `_has_line_of_sight()`.  
`PerceptionEars` — sound-event broadcasting. Call `PerceptionEars.emit_sound_at(pos, volume, tree)` from gunshots or footsteps; all `"perception_ears"` group nodes within `hearing_range × volume` fire `sound_detected`.

### 🟡 AI Blackboard (`scripts/ai/SKBlackboard.gd`)
`SKBlackboard` (RefCounted) is a shared typed key-value store per encounter. `mission.gd` creates one and calls `bot.set_blackboard(bb)` so all bots in an encounter share `"last_known_player_pos"` and other coordination keys. Typed accessors: `get_vec3`, `get_bool`, `get_float`, `get_int`, `get_node`, `get_string`.

### 🟡 Status Effects (part of `CombatantComponent`)
Applied by `CombatantComponent.apply_status(effect)`. Stacks by ID (refreshes duration). `EnvironmentalHazards` optionally applies matching effects per tick (`apply_status = true`).

### 🟢 Dialogue System (`scripts/dialogue/`)
`DialogueDefinition` — Resource with `nodes: Dictionary` (id → {speaker, text, choices, effects, auto_next}). `DialogueSession` (RefCounted) manages runtime state; signals `node_changed` and `dialogue_ended`. Effects: `set_flag`, `give_xp`, `give_credits`. `StationNPC` uses DialogueSession when `dialogue_definition` is set, and falls back to the legacy `dialog_lines` array otherwise.

### 🟢 Spawn Tracker (`scripts/system/SpawnTrackerManager.gd`)
Autoload that records activated spawn IDs in SaveSystem. `is_activated(id)`, `activate(id)`, `reset_zone(prefix)`. Designed for extraction missions where cleared rooms should stay dead within a session but reset between runs (`reset_zone("mission_id/")` on mission start).
