# Weapons

All weapons are defined in `godot/scripts/content/ContentSeeds.gd` and loaded via `ContentRegistry`.
Authored `.tres` files under `res://content/weapons/` override seed entries by `id`.

**Damage Types**

| ID | Type |
|----|------|
| 0 | BALLISTIC |
| 1 | VOID |
| 2 | THERMAL |
| 3 | MELEE |
| 4 | EXPLOSIVE |
| 5 | HAZARD |

**Rarity Scale:** Common → Uncommon → Rare → Epic → Legendary

---

## Kestrel .357

| Field | Value |
|-------|-------|
| **ID** | `kestrel_pistol` |
| **Class** | PISTOL |
| **Rarity** | Common |
| **Base Value** | 250 ₢ |
| **Grid Size** | 2 × 1 |
| **Damage** | 18 |
| **Fire Rate** | 0.25 s/shot |
| **Mag Size** | 12 |
| **Ammo Type** | pistol |
| **Recoil** | 0.01 |
| **Range** | 40 m |
| **Damage Type** | BALLISTIC (0) |
| **Pellets** | 1 |
| **DPS** | 72 |

> Sidearm. Reliable. Unlocks aim-in speed bonus with TECH branch.

---

## Hornet SMG

| Field | Value |
|-------|-------|
| **ID** | `hornet_smg` |
| **Class** | SMG |
| **Rarity** | Uncommon |
| **Base Value** | 800 ₢ |
| **Grid Size** | 3 × 1 |
| **Damage** | 9 |
| **Fire Rate** | 0.10 s/shot |
| **Mag Size** | 30 |
| **Ammo Type** | smg |
| **Recoil** | 0.08 |
| **Range** | 35 m |
| **Damage Type** | BALLISTIC (0) |
| **Pellets** | 1 |
| **DPS** | 90 |

> Compact full-auto. Eats ammo, stuns drones.

---

## Breacher 12G

| Field | Value |
|-------|-------|
| **ID** | `breacher_shotgun` |
| **Class** | SHOTGUN |
| **Rarity** | Uncommon |
| **Base Value** | 1,200 ₢ |
| **Grid Size** | 4 × 1 |
| **Damage** | 6 per pellet |
| **Fire Rate** | 0.70 s/shot |
| **Mag Size** | 6 |
| **Ammo Type** | shotgun |
| **Recoil** | 0.15 |
| **Range** | 18 m |
| **Damage Type** | BALLISTIC (0) |
| **Pellets** | 10 |
| **DPS** | 85.7 (600 raw / 0.70 s) |

> Close-quarters pulverizer. Penalized past mid-range.

---

## Lancer Mk-IV

| Field | Value |
|-------|-------|
| **ID** | `lancer_rifle` |
| **Class** | RIFLE |
| **Rarity** | Rare |
| **Base Value** | 2,400 ₢ |
| **Grid Size** | 4 × 1 |
| **Damage** | 42 |
| **Fire Rate** | 0.45 s/shot |
| **Mag Size** | 10 |
| **Ammo Type** | rifle |
| **Recoil** | 0.03 |
| **Range** | 120 m |
| **Damage Type** | BALLISTIC (0) |
| **Pellets** | 1 |
| **DPS** | 93.3 |

> Marksman rifle. High precision, slow cadence.

---

## Void Maul

| Field | Value |
|-------|-------|
| **ID** | `void_maul` |
| **Class** | MELEE |
| **Rarity** | Epic |
| **Base Value** | 4,500 ₢ |
| **Grid Size** | 2 × 3 |
| **Damage** | 55 |
| **Fire Rate** | 0.90 s/swing |
| **Mag Size** | — |
| **Ammo Type** | none |
| **Recoil** | 0.0 |
| **Range** | 2.5 m |
| **Damage Type** | MELEE (3) |
| **Pellets** | 1 |
| **DPS** | 61.1 |

> Melee finisher. Channels VOID damage on heavy swing.

---

## Stat Summary

| Name | Class | Rarity | Dmg | Fire Rate | Mag | Range | DPS | Value |
|------|-------|--------|-----|-----------|-----|-------|-----|-------|
| Kestrel .357 | PISTOL | Common | 18 | 0.25 s | 12 | 40 m | 72.0 | 250 |
| Hornet SMG | SMG | Uncommon | 9 | 0.10 s | 30 | 35 m | 90.0 | 800 |
| Breacher 12G | SHOTGUN | Uncommon | 6×10 | 0.70 s | 6 | 18 m | 85.7 | 1,200 |
| Lancer Mk-IV | RIFLE | Rare | 42 | 0.45 s | 10 | 120 m | 93.3 | 2,400 |
| Void Maul | MELEE | Epic | 55 | 0.90 s | — | 2.5 m | 61.1 | 4,500 |

> **DPS formula:** `damage × pellets / fire_rate`
> Rarity scaling multiplies base damage at runtime (×1.0 Common, ×1.2 Rare, ×1.8 Epic, ×2.5 Legendary).
