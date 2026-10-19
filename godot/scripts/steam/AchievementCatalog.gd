class_name AchievementCatalog
extends RefCounted
## Steamworks achievement API names. Keep steam/achievements.json in sync.
## Display names and descriptions are what the Steamworks partner site should use.

const ALL: Array[Dictionary] = [
	{
		"api": "FIRST_CONTRACT",
		"display": "Contract Signed",
		"desc": "Accept a contract.",
	},
	{
		"api": "COLD_DROP",
		"display": "Cold Drop",
		"desc": "Deploy into a derelict.",
	},
	{
		"api": "PACKAGE_SECURED",
		"display": "Package Secured",
		"desc": "Secure a mission objective.",
	},
	{
		"api": "EXTRACTED",
		"display": "Extracted",
		"desc": "Extract from a contract.",
	},
	{
		"api": "VETERAN",
		"display": "Repeat Offender",
		"desc": "Extract from three contracts.",
	},
	{
		"api": "KIA",
		"display": "Killed in Action",
		"desc": "Die on a contract.",
	},
	{
		"api": "TRADER",
		"display": "Black Market",
		"desc": "Sell an item to the trader.",
	},
	{
		"api": "PROMOTED",
		"display": "Field Promotion",
		"desc": "Reach operator level 2.",
	},
	{
		"api": "GEAR_UP",
		"display": "Suited",
		"desc": "Equip a piece of armor.",
	},
]


static func has_api(api: String) -> bool:
	for entry in ALL:
		if String(entry["api"]) == api:
			return true
	return false


static func apis() -> PackedStringArray:
	var ids := PackedStringArray()
	for entry in ALL:
		ids.append(String(entry["api"]))
	return ids
