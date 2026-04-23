class_name ContentSeeds
extends RefCounted
## ContentSeeds — provides a baseline catalogue of weapons, armor, perks, and
## skills as in-memory Resource instances so the project runs even before any
## .tres files are authored. Authored .tres files under res://content/ will
## override these by id in ContentRegistry.

# ── Weapons ───────────────────────────────────────────────────────────────────

static func weapons() -> Array[WeaponDefinition]:
	var out: Array[WeaponDefinition] = []

	var kestrel := WeaponDefinition.new()
	kestrel.id            = &"kestrel_pistol"
	kestrel.display_name  = "Kestrel .357"
	kestrel.description   = "Sidearm. Reliable. Unlocks aim-in speed bonus with TECH branch."
	kestrel.icon          = "PS"
	kestrel.rarity        = ItemDefinition.Rarity.COMMON
	kestrel.base_value    = 250
	kestrel.grid_w        = 2
	kestrel.grid_h        = 1
	kestrel.weapon_class  = WeaponDefinition.WeaponClass.PISTOL
	kestrel.damage        = 18.0
	kestrel.fire_rate     = 0.25
	kestrel.mag_size      = 12
	kestrel.ammo_type     = &"pistol"
	kestrel.recoil        = 0.01
	kestrel.range         = 40.0
	kestrel.damage_type   = 0   # BALLISTIC
	kestrel.pellets       = 1
	out.append(kestrel)

	var hornet := WeaponDefinition.new()
	hornet.id           = &"hornet_smg"
	hornet.display_name = "Hornet SMG"
	hornet.description  = "Compact full-auto. Eats ammo, stuns drones."
	hornet.icon         = "SM"
	hornet.rarity       = ItemDefinition.Rarity.UNCOMMON
	hornet.base_value   = 800
	hornet.grid_w       = 3
	hornet.grid_h       = 1
	hornet.weapon_class = WeaponDefinition.WeaponClass.SMG
	hornet.damage       = 9.0
	hornet.fire_rate    = 0.10
	hornet.mag_size     = 30
	hornet.ammo_type    = &"smg"
	hornet.recoil       = 0.08
	hornet.range        = 35.0
	hornet.damage_type  = 0
	hornet.pellets      = 1
	out.append(hornet)

	var breacher := WeaponDefinition.new()
	breacher.id           = &"breacher_shotgun"
	breacher.display_name = "Breacher 12G"
	breacher.description  = "Close-quarters pulverizer. Penalized past mid-range."
	breacher.icon         = "SG"
	breacher.rarity       = ItemDefinition.Rarity.UNCOMMON
	breacher.base_value   = 1200
	breacher.grid_w       = 4
	breacher.grid_h       = 1
	breacher.weapon_class = WeaponDefinition.WeaponClass.SHOTGUN
	breacher.damage       = 6.0
	breacher.fire_rate    = 0.70
	breacher.mag_size     = 6
	breacher.ammo_type    = &"shotgun"
	breacher.recoil       = 0.15
	breacher.range        = 18.0
	breacher.damage_type  = 0
	breacher.pellets      = 10
	out.append(breacher)

	var lancer := WeaponDefinition.new()
	lancer.id           = &"lancer_rifle"
	lancer.display_name = "Lancer Mk-IV"
	lancer.description  = "Marksman rifle. High precision, slow cadence."
	lancer.icon         = "RF"
	lancer.rarity       = ItemDefinition.Rarity.RARE
	lancer.base_value   = 2400
	lancer.grid_w       = 4
	lancer.grid_h       = 1
	lancer.weapon_class = WeaponDefinition.WeaponClass.RIFLE
	lancer.damage       = 42.0
	lancer.fire_rate    = 0.45
	lancer.mag_size     = 10
	lancer.ammo_type    = &"rifle"
	lancer.recoil       = 0.03
	lancer.range        = 120.0
	lancer.damage_type  = 0
	lancer.pellets      = 1
	out.append(lancer)

	var maul := WeaponDefinition.new()
	maul.id           = &"void_maul"
	maul.display_name = "Void Maul"
	maul.description  = "Melee finisher. Channels VOID damage on heavy swing."
	maul.icon         = "ML"
	maul.rarity       = ItemDefinition.Rarity.EPIC
	maul.base_value   = 4500
	maul.grid_w       = 2
	maul.grid_h       = 3
	maul.weapon_class = WeaponDefinition.WeaponClass.MELEE
	maul.damage       = 55.0
	maul.fire_rate    = 0.90
	maul.mag_size     = 0
	maul.ammo_type    = &"none"
	maul.recoil       = 0.0
	maul.range        = 2.5
	maul.damage_type  = 3   # MELEE
	maul.pellets      = 1
	out.append(maul)

	return out

# ── Armor ─────────────────────────────────────────────────────────────────────

static func armor() -> Array[ArmorDefinition]:
	var out: Array[ArmorDefinition] = []

	var helm_light := ArmorDefinition.new()
	helm_light.id           = &"helmet_scout"
	helm_light.display_name = "Scout Hood"
	helm_light.description  = "Lightweight EVA hood. Barely armored, low profile."
	helm_light.icon         = "HD"
	helm_light.rarity       = ItemDefinition.Rarity.COMMON
	helm_light.base_value   = 150
	helm_light.grid_w       = 2
	helm_light.grid_h       = 2
	helm_light.slot         = ArmorDefinition.Slot.HEAD
	helm_light.armor_value  = 20
	helm_light.durability_max = 80
	helm_light.move_speed_mult = 1.0
	helm_light.stealth_mult  = 1.1
	out.append(helm_light)

	var helm_heavy := ArmorDefinition.new()
	helm_heavy.id           = &"helmet_centurion"
	helm_heavy.display_name = "Centurion Helm"
	helm_heavy.description  = "Ballistic composite. Shrugs off pistol fire."
	helm_heavy.icon         = "HV"
	helm_heavy.rarity       = ItemDefinition.Rarity.RARE
	helm_heavy.base_value   = 1400
	helm_heavy.grid_w       = 2
	helm_heavy.grid_h       = 2
	helm_heavy.slot         = ArmorDefinition.Slot.HEAD
	helm_heavy.armor_value  = 65
	helm_heavy.durability_max = 200
	helm_heavy.resistances  = { 0: 0.55, 3: 0.70 }   # BALLISTIC, MELEE
	helm_heavy.move_speed_mult = 0.95
	helm_heavy.stealth_mult  = 1.0
	out.append(helm_heavy)

	var chest_t1 := ArmorDefinition.new()
	chest_t1.id           = &"chest_rigger"
	chest_t1.display_name = "Rigger Vest"
	chest_t1.description  = "Tier I plate carrier. Everyman's vest."
	chest_t1.icon         = "C1"
	chest_t1.rarity       = ItemDefinition.Rarity.COMMON
	chest_t1.base_value   = 400
	chest_t1.grid_w       = 3
	chest_t1.grid_h       = 2
	chest_t1.slot         = ArmorDefinition.Slot.CHEST
	chest_t1.armor_value  = 40
	chest_t1.durability_max = 150
	chest_t1.resistances  = { 0: 0.80 }
	out.append(chest_t1)

	var chest_t2 := ArmorDefinition.new()
	chest_t2.id           = &"chest_marauder"
	chest_t2.display_name = "Marauder Plates"
	chest_t2.description  = "Tier II composite. Decent all-rounder."
	chest_t2.icon         = "C2"
	chest_t2.rarity       = ItemDefinition.Rarity.UNCOMMON
	chest_t2.base_value   = 1200
	chest_t2.grid_w       = 3
	chest_t2.grid_h       = 2
	chest_t2.slot         = ArmorDefinition.Slot.CHEST
	chest_t2.armor_value  = 75
	chest_t2.durability_max = 220
	chest_t2.resistances  = { 0: 0.60, 4: 0.80 }
	chest_t2.move_speed_mult = 0.97
	out.append(chest_t2)

	var chest_t3 := ArmorDefinition.new()
	chest_t3.id           = &"chest_voidforged"
	chest_t3.display_name = "Voidforged Harness"
	chest_t3.description  = "Tier III void-laced. Heavy but resists VOID bleed."
	chest_t3.icon         = "C3"
	chest_t3.rarity       = ItemDefinition.Rarity.EPIC
	chest_t3.base_value   = 4800
	chest_t3.grid_w       = 3
	chest_t3.grid_h       = 2
	chest_t3.slot         = ArmorDefinition.Slot.CHEST
	chest_t3.armor_value  = 130
	chest_t3.durability_max = 350
	chest_t3.resistances  = { 0: 0.45, 1: 0.30, 2: 0.70 }   # VOID at 30%
	chest_t3.move_speed_mult = 0.92
	out.append(chest_t3)

	var rig := ArmorDefinition.new()
	rig.id           = &"rig_scavenger"
	rig.display_name = "Scavenger Rig"
	rig.description  = "Chest rig. Grants a 5×3 on-body container."
	rig.icon         = "RG"
	rig.rarity       = ItemDefinition.Rarity.UNCOMMON
	rig.base_value   = 650
	rig.grid_w       = 3
	rig.grid_h       = 2
	rig.slot         = ArmorDefinition.Slot.RIG
	rig.armor_value  = 10
	rig.durability_max = 120
	rig.container_w  = 5
	rig.container_h  = 3
	out.append(rig)

	var backpack := ArmorDefinition.new()
	backpack.id           = &"backpack_drifter"
	backpack.display_name = "Drifter Pack"
	backpack.description  = "Large 6×5 backpack. Takes up the back slot."
	backpack.icon         = "BP"
	backpack.rarity       = ItemDefinition.Rarity.RARE
	backpack.base_value   = 1100
	backpack.grid_w       = 4
	backpack.grid_h       = 4
	backpack.slot         = ArmorDefinition.Slot.BACKPACK
	backpack.armor_value  = 0
	backpack.durability_max = 200
	backpack.container_w  = 6
	backpack.container_h  = 5
	backpack.move_speed_mult = 0.95
	out.append(backpack)

	return out

# ── Perks ─────────────────────────────────────────────────────────────────────

static func _perk(id: StringName, name_s: String, desc: String, icon: String,
		tier: int, branch: int, cost: int,
		requires: Array, mods: Dictionary) -> PerkDefinition:
	var p := PerkDefinition.new()
	p.id           = id
	p.display_name = name_s
	p.description  = desc
	p.icon         = icon
	p.tier         = tier
	p.branch       = branch
	p.cost         = cost
	var typed: Array[StringName] = []
	for r in requires:
		typed.append(StringName(r))
	p.requires     = typed
	p.stat_mods    = mods
	return p

static func perks() -> Array[PerkDefinition]:
	var out: Array[PerkDefinition] = []
	# COMBAT branch
	out.append(_perk(&"devastator_melee", "DEVASTATOR MELEE",
		"Double melee bash damage.", "ME",
		1, PerkDefinition.Branch.COMBAT, 1, [],
		{"melee_damage_mult": 2.0}))
	out.append(_perk(&"steady_hands", "STEADY HANDS",
		"-30% weapon recoil.", "SH",
		2, PerkDefinition.Branch.COMBAT, 1, [&"devastator_melee"],
		{"recoil_mult": 0.7}))
	out.append(_perk(&"headhunter", "HEADHUNTER",
		"+50% headshot damage.", "HH",
		3, PerkDefinition.Branch.COMBAT, 2, [&"steady_hands"],
		{"headshot_damage_mult": 1.5}))
	out.append(_perk(&"apex_predator", "APEX PREDATOR",
		"Kills restore 10% shields.", "AP",
		4, PerkDefinition.Branch.COMBAT, 2, [&"headhunter"],
		{"kill_shield_restore": 0.10}))
	out.append(_perk(&"overkill", "OVERKILL",
		"Last round in magazine deals +100% damage.", "OK",
		5, PerkDefinition.Branch.COMBAT, 3, [&"apex_predator"],
		{"last_round_damage_mult": 2.0}))

	# SURVIVAL branch
	out.append(_perk(&"titan_shields", "TITAN SHIELDS",
		"Double maximum shield capacity.", "TS",
		1, PerkDefinition.Branch.SURVIVAL, 1, [],
		{"max_shield_mult": 2.0}))
	out.append(_perk(&"marathoner", "MARATHONER",
		"+25% base movement speed.", "MR",
		2, PerkDefinition.Branch.SURVIVAL, 1, [&"titan_shields"],
		{"move_speed_mult": 1.25}))
	out.append(_perk(&"oxy_efficiency", "OXY-EFFICIENCY",
		"-40% oxygen consumption.", "OX",
		3, PerkDefinition.Branch.SURVIVAL, 2, [&"marathoner"],
		{"oxygen_consumption_mult": 0.6}))
	out.append(_perk(&"iron_soles", "IRON SOLES",
		"Negate fall damage under 12 m/s.", "IS",
		4, PerkDefinition.Branch.SURVIVAL, 2, [&"oxy_efficiency"],
		{"fall_damage_threshold": 12.0}))
	out.append(_perk(&"second_wind", "SECOND WIND",
		"Once per mission: revive at 25% HP instead of dying.", "SW",
		5, PerkDefinition.Branch.SURVIVAL, 3, [&"iron_soles"],
		{"revive_once": true}))

	# TECH branch
	out.append(_perk(&"overdrive", "OVERDRIVE",
		"+50% sprint speed multiplier.", "OD",
		1, PerkDefinition.Branch.TECH, 1, [],
		{"sprint_speed_mult": 1.5}))
	out.append(_perk(&"impulse_reserve", "IMPULSE RESERVE",
		"+1 impulse dash charge.", "IR",
		2, PerkDefinition.Branch.TECH, 1, [&"overdrive"],
		{"impulse_extra_charge": 1}))
	out.append(_perk(&"scavenger", "SCAVENGER",
		"+15% credits from sold loot.", "SC",
		3, PerkDefinition.Branch.TECH, 2, [&"impulse_reserve"],
		{"sell_value_mult": 1.15}))
	out.append(_perk(&"ghost_in_the_shell", "GHOST IN THE SHELL",
		"-25% detection radius from Eyes/Ears.", "GS",
		4, PerkDefinition.Branch.TECH, 2, [&"scavenger"],
		{"detection_radius_mult": 0.75}))
	out.append(_perk(&"singularity_tap", "SINGULARITY TAP",
		"Skill cooldowns tick 25% faster.", "ST",
		5, PerkDefinition.Branch.TECH, 3, [&"ghost_in_the_shell"],
		{"cooldown_rate_mult": 1.25}))
	return out

# ── Skills ────────────────────────────────────────────────────────────────────

static func _skill(id: StringName, name_s: String, desc: String, icon: String,
		kind: int, branch: int, tier: int, cost: int,
		cooldown: float, energy: float,
		requires: Array, mods: Dictionary) -> SkillDefinition:
	var s := SkillDefinition.new()
	s.id           = id
	s.display_name = name_s
	s.description  = desc
	s.icon         = icon
	s.kind         = kind
	s.branch       = branch
	s.tier         = tier
	s.cost         = cost
	s.cooldown     = cooldown
	s.energy_cost  = energy
	var typed: Array[StringName] = []
	for r in requires:
		typed.append(StringName(r))
	s.requires     = typed
	s.stat_mods    = mods
	return s

static func skills() -> Array[SkillDefinition]:
	var out: Array[SkillDefinition] = []
	out.append(_skill(&"impulse_surge", "IMPULSE SURGE",
		"Active: emit a kinetic pulse that knocks back and stuns for 1.5s.", "IS",
		SkillDefinition.Kind.ACTIVE, SkillDefinition.Branch.TECH,
		1, 1, 14.0, 25.0, [], {}))
	out.append(_skill(&"scavenger_eye", "SCAVENGER EYE",
		"Passive: highlight nearby lootable containers through walls.", "SE",
		SkillDefinition.Kind.PASSIVE, SkillDefinition.Branch.TECH,
		1, 1, 0.0, 0.0, [], {"loot_highlight": true}))
	out.append(_skill(&"void_lance", "VOID LANCE",
		"Active: fire a piercing VOID beam (80 dmg, 15 m).", "VL",
		SkillDefinition.Kind.ACTIVE, SkillDefinition.Branch.VOID,
		2, 2, 18.0, 40.0, [&"impulse_surge"], {}))
	out.append(_skill(&"stalwart", "STALWART",
		"Passive: +20% damage resistance while shields are full.", "ST",
		SkillDefinition.Kind.PASSIVE, SkillDefinition.Branch.COMBAT,
		2, 1, 0.0, 0.0, [], {"full_shield_dr": 0.20}))
	out.append(_skill(&"field_medic", "FIELD MEDIC",
		"Active: restore 40 HP over 4 seconds.", "FM",
		SkillDefinition.Kind.ACTIVE, SkillDefinition.Branch.SURVIVAL,
		2, 2, 24.0, 0.0, [], {}))
	out.append(_skill(&"voidwalker", "VOIDWALKER",
		"Active: phase-dash 6 m with i-frames.", "VW",
		SkillDefinition.Kind.ACTIVE, SkillDefinition.Branch.VOID,
		3, 3, 20.0, 50.0, [&"void_lance"], {}))
	return out
