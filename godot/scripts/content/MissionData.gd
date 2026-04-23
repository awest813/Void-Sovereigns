extends Node
## MissionData — ports missionData.ts content into GDScript dictionaries.

const MISSIONS: Array = [
	{
		"id": "mission_001",
		"title": "DEAD SIGNAL",
		"description": "A distress beacon has been detected in Sector 7. Retrieve the encrypted data core before corporate extraction teams arrive.",
		"objective_name": "Encrypted Data Core",
		"biome": "industrial",
		"difficulty": 1,
		"xp_reward": 500,
		"credit_reward": 800,
		"loot_tier": "COMMON",
	},
	{
		"id": "mission_002",
		"title": "VOID ECHO",
		"description": "A derelict mining platform drifts at the edge of the Void. Recover the neural archive before it's swallowed by the dark.",
		"objective_name": "Neural Archive Drive",
		"biome": "void",
		"difficulty": 2,
		"xp_reward": 750,
		"credit_reward": 1400,
		"loot_tier": "RARE",
	},
	{
		"id": "mission_003",
		"title": "IRON TOMB",
		"description": "A sealed military installation holds the last known Centurion combat data. Extract it — and survive what guards it.",
		"objective_name": "Centurion Combat Log",
		"biome": "military",
		"difficulty": 3,
		"xp_reward": 1200,
		"credit_reward": 2500,
		"loot_tier": "RARE",
	},
	{
		"id": "mission_004",
		"title": "APEX",
		"description": "The Void Centurion is still online. Terminate it. Recover the void-touched artifact from its chassis.",
		"objective_name": "Void Core Fragment",
		"biome": "boss",
		"difficulty": 5,
		"xp_reward": 3000,
		"credit_reward": 8000,
		"loot_tier": "BOSS",
	},
]
