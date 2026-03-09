# The sound of failure
A VS Code extension that plays a dramatic "Dun dun dun" sound whenever a command fails in your integrated terminal!

## Features
- **Automatic error detection** via shell integration exit codes (preferred) and/or text-pattern matching as a fallback.
- **Works with** bash, zsh, PowerShell, and Windows cmd.
- **Custom sounds** – use any `.wav` or `.mp3` file from your local machine.
- **Cooldown timer** – prevents repeated sounds within a configurable window (default: 2 seconds).
- **Status bar indicator** – shows enabled/disabled state; click to toggle.
- **Logging** – detailed debug output in the *Dun dun dun* Output panel.

## Extension Settings
This extension contributes the following settings:
* `dunDunDun.enabled`: Enable or disable the extension globally.
* `dunDunDun.soundFile`: Absolute path to a custom audio file.
* `dunDunDun.volume`: Volume level from `0.0` to `1.0`.
* `dunDunDun.cooldownMs`: Minimum delay between sound triggers.
* `dunDunDun.useExitCodeDetection`: Toggle detection of terminal command failure exit codes.
* `dunDunDun.usePatternDetection`: Toggle raw text pattern matching (`Proposed API` only).
* `dunDunDun.customPatterns`: Array of words to trigger the sound on when `usePatternDetection` is enabled.

## Requirements
* **macOS**: uses `afplay` (built-in).
* **Windows**: uses `PowerShell` (built-in).
* **Linux**: requires `paplay`, `aplay`, `ffplay`, or `mpg123`.

*Enjoy the drama!*
