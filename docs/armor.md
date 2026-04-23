# Armor

All armor pieces are defined in `godot/scripts/content/ContentSeeds.gd` and loaded via `ContentRegistry`.
Authored `.tres` files under `res://content/armor/` override seed entries by `id`.

**Slots:** HEAD · CHEST · LEGS · ARMS · BACKPACK · RIG

**Resistance values** are damage multipliers keyed by `DamagePacket.Type`.
A value of `0.55` means the wearer takes **55%** of that damage type (45% reduction).
A slot with no resistance entry takes **100%** of that damage type.

**Damage Types**

| ID | Type |
|----|------|
| 0 | BALLISTIC |
| 1 | VOID |
| 2 | THERMAL |
| 3 | MELEE |
| 4 | EXPLOSIVE |
| 5 | HAZARD |

---

## Scout Hood

| Field | Value |
|-------|-------|
| **ID** | `helmet_scout` |
| **Slot** | HEAD |
| **Rarity** | Common |
| **Base Value** | 150 ₢ |
| **Grid Size** | 2 × 2 |
| **Armor Value** | 20 |
| **Durability** | 80 |
| **Move Speed** | ×1.00 (no penalty) |
| **Stealth** | ×1.10 (+10% stealth) |
| **Resistances** | — (none) |
| **Container** | — |

> Lightweight EVA hood. Barely armored, low profile.

---

## Centurion Helm

| Field | Value |
|-------|-------|
| **ID** | `helmet_centurion` |
| **Slot** | HEAD |
| **Rarity** | Rare |
| **Base Value** | 1,400 ₢ |
| **Grid Size** | 2 × 2 |
| **Armor Value** | 65 |
| **Durability** | 200 |
| **Move Speed** | ×0.95 (−5%) |
| **Stealth** | ×1.00 |
| **Resistances** | BALLISTIC → 0.55 (45% reduction) · MELEE → 0.70 (30% reduction) |
| **Container** | — |

> Ballistic composite. Shrugs off pistol fire.

---

## Rigger Vest

| Field | Value |
|-------|-------|
| **ID** | `chest_rigger` |
| **Slot** | CHEST |
| **Rarity** | Common |
| **Base Value** | 400 ₢ |
| **Grid Size** | 3 × 2 |
| **Armor Value** | 40 |
| **Durability** | 150 |
| **Move Speed** | ×1.00 |
| **Stealth** | ×1.00 |
| **Resistances** | BALLISTIC → 0.80 (20% reduction) |
| **Container** | — |

> Tier I plate carrier. Everyman's vest.

---

## Marauder Plates

| Field | Value |
|-------|-------|
| **ID** | `chest_marauder` |
| **Slot** | CHEST |
| **Rarity** | Uncommon |
| **Base Value** | 1,200 ₢ |
| **Grid Size** | 3 × 2 |
| **Armor Value** | 75 |
| **Durability** | 220 |
| **Move Speed** | ×0.97 (−3%) |
| **Stealth** | ×1.00 |
| **Resistances** | BALLISTIC → 0.60 (40% reduction) · EXPLOSIVE → 0.80 (20% reduction) |
| **Container** | — |

> Tier II composite. Decent all-rounder.

---

## Voidforged Harness

| Field | Value |
|-------|-------|
| **ID** | `chest_voidforged` |
| **Slot** | CHEST |
| **Rarity** | Epic |
| **Base Value** | 4,800 ₢ |
| **Grid Size** | 3 × 2 |
| **Armor Value** | 130 |
| **Durability** | 350 |
| **Move Speed** | ×0.92 (−8%) |
| **Stealth** | ×1.00 |
| **Resistances** | BALLISTIC → 0.45 (55% reduction) · VOID → 0.30 (70% reduction) · THERMAL → 0.70 (30% reduction) |
| **Container** | — |

> Tier III void-laced. Heavy but resists VOID bleed.

---

## Scavenger Rig

| Field | Value |
|-------|-------|
| **ID** | `rig_scavenger` |
| **Slot** | RIG |
| **Rarity** | Uncommon |
| **Base Value** | 650 ₢ |
| **Grid Size** | 3 × 2 |
| **Armor Value** | 10 |
| **Durability** | 120 |
| **Move Speed** | ×1.00 |
| **Stealth** | ×1.00 |
| **Resistances** | — (none) |
| **Container** | 5 × 3 (15 cells) |

> Chest rig. Grants a 5×3 on-body container.

---

## Drifter Pack

| Field | Value |
|-------|-------|
| **ID** | `backpack_drifter` |
| **Slot** | BACKPACK |
| **Rarity** | Rare |
| **Base Value** | 1,100 ₢ |
| **Grid Size** | 4 × 4 |
| **Armor Value** | 0 |
| **Durability** | 200 |
| **Move Speed** | ×0.95 (−5%) |
| **Stealth** | ×1.00 |
| **Resistances** | — (none) |
| **Container** | 6 × 5 (30 cells) |

> Large 6×5 backpack. Takes up the back slot.

---

## Stat Summary

| Name | Slot | Rarity | Armor | Durability | Move | Stealth | Container | Value |
|------|------|--------|-------|------------|------|---------|-----------|-------|
| Scout Hood | HEAD | Common | 20 | 80 | ×1.00 | ×1.10 | — | 150 |
| Centurion Helm | HEAD | Rare | 65 | 200 | ×0.95 | ×1.00 | — | 1,400 |
| Rigger Vest | CHEST | Common | 40 | 150 | ×1.00 | ×1.00 | — | 400 |
| Marauder Plates | CHEST | Uncommon | 75 | 220 | ×0.97 | ×1.00 | — | 1,200 |
| Voidforged Harness | CHEST | Epic | 130 | 350 | ×0.92 | ×1.00 | — | 4,800 |
| Scavenger Rig | RIG | Uncommon | 10 | 120 | ×1.00 | ×1.00 | 5×3 | 650 |
| Drifter Pack | BACKPACK | Rare | 0 | 200 | ×0.95 | ×1.00 | 6×5 | 1,100 |

### Resistance Quick-Reference

| Name | BALLISTIC | VOID | THERMAL | MELEE | EXPLOSIVE |
|------|-----------|------|---------|-------|-----------|
| Scout Hood | — | — | — | — | — |
| Centurion Helm | 45% ↓ | — | — | 30% ↓ | — |
| Rigger Vest | 20% ↓ | — | — | — | — |
| Marauder Plates | 40% ↓ | — | — | — | 20% ↓ |
| Voidforged Harness | 55% ↓ | 70% ↓ | 30% ↓ | — | — |
| Scavenger Rig | — | — | — | — | — |
| Drifter Pack | — | — | — | — | — |

> **↓** = damage reduction percentage (higher is better for the wearer).
