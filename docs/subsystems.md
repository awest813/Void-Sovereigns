# Subsystems

Subsystems are the runtime game-play systems (nodes added to the player or scene) and the
player-upgrade layers (Skills and Perks). All source files live under `godot/scripts/`.

---

## Game Systems

### WeaponSystem
**File:** `godot/scripts/game/WeaponSystem.gd`

Handles all player-weapon logic: raycast shooting, reloading, melee, and grenade throwing.
Reads the active `WeaponDefinition` from `ContentRegistry` (via `LoadoutState.equipped_primary`)
and applies rarity-scaled damage at runtime.

| Parameter | Default | Notes |
|-----------|---------|-------|
| Fire rates (per class) | PISTOL 0.25 s · SHOTGUN 0.70 s · SMG 0.10 s · RIFLE 0.45 s | Overridden by `WeaponDefinition.fire_rate` |
| Spread (per class) | PISTOL 0.01 · SHOTGUN 0.15 · SMG 0.08 · RIFLE 0.02 | Overridden by `WeaponDefinition.recoil` |
| Pellets (default) | 1 (10 for SHOTGUN) | Overridden by `WeaponDefinition.pellets` |
| Reload time | 1.5 s | Fixed |
| Melee reach | 2.0 m | Hard-coded raycast length |
| Grenade impulse | 12.0 m/s | Forward throw force |
| Rarity damage multiplier | ×1.0 (Common) · ×1.2 (Rare) · ×1.8 (Epic) · ×2.5 (Legendary) | Scales by `ProgressionState.level` |

**Rarity thresholds (by level):**
- Level ≤ 2 → Common (×1.0)
- Level 3–5 → Rare (×1.2)
- Level 6–10 → Epic (×1.8)
- Level > 10 → Legendary (×2.5)

**Signals:** `ammo_changed(current_mag, reserve)` · `weapon_changed(weapon_type)`

---

### HealthSystem
**File:** `godot/scripts/game/HealthSystem.gd`

HP + regenerating shield layer. Can be attached to the player or any damageable entity.
Processes `DamagePacket` objects from `HitPipeline`, applies armor resistances (player-side),
and supports an optional dodge-window callback.

| Parameter | Default | Notes |
|-----------|---------|-------|
| `max_health` | 100.0 | Exported — editable per entity |
| `max_shield` | 100.0 (200.0 with TITAN SHIELDS perk) | Set in `_ready()` |
| `shield_regen_delay` | 5.0 s | Time after last hit before regen starts |
| `shield_regen_rate` | 10.0 units/s | Regen speed while shields are below max |
| Crit multiplier | ×1.5 | Applied when `DamagePacket.is_crit` is `true` |

**Signals:** `damaged(current, max)` · `healed(current, max)` · `died()` · `damage_avoided()` · `shield_changed(percent)`

---

### OxygenSystem
**File:** `godot/scripts/game/OxygenSystem.gd`

Drains `SurvivalState.oxygen` during missions. Triggers critical warnings below 25% and
calls `MissionState.transition("failed")` at zero. The OXY-EFFICIENCY perk reduces drain by 40%.

| Parameter | Default | Notes |
|-----------|---------|-------|
| `drain_rate` | 0.5 units/s | Exported — editable per scene |
| OXY-EFFICIENCY perk multiplier | ×0.6 | Effective rate = 0.30 units/s with perk |
| Critical threshold | 25% | Below this, `oxygen_critical` fires |

**Signals:** `oxygen_changed(current, max)` · `oxygen_critical()` · `oxygen_stabilized()` · `oxygen_depleted()`

---

### ExtractionSystem
**File:** `godot/scripts/game/ExtractionSystem.gd`

`Area3D` node placed in the extraction room. Counts down while the player holds the zone,
spawns security reinforcements periodically, and transitions the mission to `"success"` on completion.

| Parameter | Default | Notes |
|-----------|---------|-------|
| `hold_duration` | 15.0 s | Exported — time to hold the zone |
| `pressure_spawn_interval` | 11.0 s | Pressure-bot spawn rate before player reaches zone |
| `spawn_bot_interval` | 5.0 s | Reinforcement spawn rate while extracting |
| Progress decay | −0.5 units/s | Applied when player leaves the zone mid-extraction |

**Signals:** `extraction_complete()` · `extraction_progress_changed(percent)`

---

### InteractionSystem
**File:** `godot/scripts/game/InteractionSystem.gd`

Raycast-based interaction prompt. Nodes register themselves with a label and a callback;
the system raycasts every frame and fires the registered callback when the player presses `interact`.

| Parameter | Default | Notes |
|-----------|---------|-------|
| `interact_range` | 3.0 m | Exported — max raycast distance |

**Signals:** `interactable_found(label)` · `interactable_lost()`

---

## Skills

Skills are authored as `SkillDefinition` resources under `res://content/skills/`.
Active skills are bound to the player hotbar (Z / X / V). Passive skills apply `stat_mods` permanently.
Each tier requires `tier × 4` character levels to unlock.

**Branches:** COMBAT · SURVIVAL · TECH · VOID

### Active Skills

| Name | ID | Branch | Tier | Req. Level | Cooldown | Energy Cost | Requires | Effect |
|------|----|--------|------|-----------|---------|-------------|----------|--------|
| IMPULSE SURGE | `impulse_surge` | TECH | 1 | 4 | 14 s | 25 | — | Kinetic pulse — knockback + 1.5 s stun |
| VOID LANCE | `void_lance` | VOID | 2 | 8 | 18 s | 40 | IMPULSE SURGE | Piercing VOID beam — 80 dmg, 15 m |
| FIELD MEDIC | `field_medic` | SURVIVAL | 2 | 8 | 24 s | 0 | — | Restore 40 HP over 4 s |
| VOIDWALKER | `voidwalker` | VOID | 3 | 12 | 20 s | 50 | VOID LANCE | Phase-dash 6 m with i-frames |

### Passive Skills

| Name | ID | Branch | Tier | Req. Level | Requires | Stat Mod |
|------|----|--------|------|-----------|----------|----------|
| SCAVENGER EYE | `scavenger_eye` | TECH | 1 | 4 | — | `loot_highlight: true` — highlights nearby loot through walls |
| STALWART | `stalwart` | COMBAT | 2 | 8 | — | `full_shield_dr: 0.20` — +20% damage resistance while shields are full |

---

## Perks

Perks are authored as `PerkDefinition` resources under `res://content/perks/`.
Each tier requires `tier × 5` character levels to unlock.
Perks apply `stat_mods` permanently and are arranged in three unlock branches.

**Branches:** COMBAT · SURVIVAL · TECH

### COMBAT Branch

| Tier | Name | ID | Cost | Requires | Effect | Stat Mod |
|------|------|----|------|----------|--------|----------|
| 1 | DEVASTATOR MELEE | `devastator_melee` | 1 | — | Double melee bash damage | `melee_damage_mult: 2.0` |
| 2 | STEADY HANDS | `steady_hands` | 1 | DEVASTATOR MELEE | −30% weapon recoil | `recoil_mult: 0.7` |
| 3 | HEADHUNTER | `headhunter` | 2 | STEADY HANDS | +50% headshot damage | `headshot_damage_mult: 1.5` |
| 4 | APEX PREDATOR | `apex_predator` | 2 | HEADHUNTER | Kills restore 10% shields | `kill_shield_restore: 0.10` |
| 5 | OVERKILL | `overkill` | 3 | APEX PREDATOR | Last-round deals +100% damage | `last_round_damage_mult: 2.0` |

### SURVIVAL Branch

| Tier | Name | ID | Cost | Requires | Effect | Stat Mod |
|------|------|----|------|----------|--------|----------|
| 1 | TITAN SHIELDS | `titan_shields` | 1 | — | Double max shield capacity | `max_shield_mult: 2.0` |
| 2 | MARATHONER | `marathoner` | 1 | TITAN SHIELDS | +25% base move speed | `move_speed_mult: 1.25` |
| 3 | OXY-EFFICIENCY | `oxy_efficiency` | 2 | MARATHONER | −40% oxygen consumption | `oxygen_consumption_mult: 0.6` |
| 4 | IRON SOLES | `iron_soles` | 2 | OXY-EFFICIENCY | Negate fall damage under 12 m/s | `fall_damage_threshold: 12.0` |
| 5 | SECOND WIND | `second_wind` | 3 | IRON SOLES | Once per mission: revive at 25% HP | `revive_once: true` |

### TECH Branch

| Tier | Name | ID | Cost | Requires | Effect | Stat Mod |
|------|------|----|------|----------|--------|----------|
| 1 | OVERDRIVE | `overdrive` | 1 | — | +50% sprint speed | `sprint_speed_mult: 1.5` |
| 2 | IMPULSE RESERVE | `impulse_reserve` | 1 | OVERDRIVE | +1 impulse dash charge | `impulse_extra_charge: 1` |
| 3 | SCAVENGER | `scavenger` | 2 | IMPULSE RESERVE | +15% credits from sold loot | `sell_value_mult: 1.15` |
| 4 | GHOST IN THE SHELL | `ghost_in_the_shell` | 2 | SCAVENGER | −25% AI detection radius | `detection_radius_mult: 0.75` |
| 5 | SINGULARITY TAP | `singularity_tap` | 3 | GHOST IN THE SHELL | Skill cooldowns tick 25% faster | `cooldown_rate_mult: 1.25` |
