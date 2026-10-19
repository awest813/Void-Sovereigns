#!/usr/bin/env bash
# Export release builds with the Godot 4.4 editor binary on PATH (or $GODOT).
# Requires matching export templates. Does not upload to Steam.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GODOT="${GODOT:-godot}"
mkdir -p "$ROOT/../build/windows" "$ROOT/../build/linux" "$ROOT/../build/macos"
"$GODOT" --headless --path "$ROOT" --export-release "Windows Desktop" "$ROOT/../build/windows/Void Sovereigns.exe"
"$GODOT" --headless --path "$ROOT" --export-release "Linux" "$ROOT/../build/linux/Void Sovereigns.x86_64"
"$GODOT" --headless --path "$ROOT" --export-release "macOS" "$ROOT/../build/macos/Void Sovereigns.zip"
echo "Exports written under build/. Upload the Windows (and Linux) folders with steamcmd."
