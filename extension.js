const vscode = require('vscode');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

let lastPlayTime = 0;
let statusBarItem;
let outputChannel; // Added Output Channel for Logging

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    // Initialize Output Channel for Logging (from the Meaw Ghop Features screenshot)
    outputChannel = vscode.window.createOutputChannel('Dun dun dun');
    context.subscriptions.push(outputChannel);
    log('Dun dun dun Extension Activated.');

    // 1. Initialize Status Bar Item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'dunDunDun.enable'; // Clicking it toggles state
    context.subscriptions.push(statusBarItem);
    updateStatusBar();

        // 2. Register Commands
        context.subscriptions.push(
            vscode.commands.registerCommand('dunDunDun.enable', async () => {
                const config = vscode.workspace.getConfiguration('dunDunDun');
                const isEnabled = config.get('enabled');

                // Toggle the setting
                await config.update('enabled', !isEnabled, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(`Dun dun dun is now ${!isEnabled ? 'Enabled' : 'Disabled'}.`);
                updateStatusBar();
            })
        );

    context.subscriptions.push(
        vscode.commands.registerCommand('dunDunDun.disable', async () => {
            const config = vscode.workspace.getConfiguration('dunDunDun');
            await config.update('enabled', false, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage('Dun dun dun is Disabled.');
            updateStatusBar();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('dunDunDun.testSound', () => {
            playDunDunDun(context, true); // Force play bypassing cooldown
        })
    );

    // Listen to configuration changes to update the status bar live
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('dunDunDun.enabled')) {
                updateStatusBar();
            }
        })
    );

    // 3. Register Shell Integration Listener
    if (typeof vscode.window.onDidEndTerminalShellExecution !== 'function') {
        vscode.window.showWarningMessage('Dun dun dun: Shell Integration API is missing. Please update VS Code to 1.93+.');
        return;
    }

    const disposableShell = vscode.window.onDidEndTerminalShellExecution((e) => {
        const config = vscode.workspace.getConfiguration('dunDunDun');

        // Check if extension is enabled at all
        if (!config.get('enabled')) return;
        // Check if exit code detection is active
        if (!config.get('useExitCodeDetection')) return;

        if (e.exitCode && e.exitCode !== 0) {
            log(`[Shell Integration] Non-zero exit code detected: ${e.exitCode}`);
            playDunDunDun(context);
        }
    });

    context.subscriptions.push(disposableShell);

    // 4. Register Pattern Detection (Fallback using Proposed API)
    // We cast vscode.window to any to avoid TypeScript complaints about proposed APIs
    const windowAny = /** @type {any} */ (vscode.window);
    if (typeof windowAny.onDidWriteTerminalData === 'function') {
        const disposableData = windowAny.onDidWriteTerminalData((e) => {
            const config = vscode.workspace.getConfiguration('dunDunDun');
            if (!config.get('enabled')) return;
            if (!config.get('usePatternDetection')) return;

            const data = e.data.toLowerCase();
            const patterns = config.get('customPatterns', ['error', 'failed', 'exception', 'invalid']);

            if (patterns.length > 0 && patterns.some(p => data.includes(p.toLowerCase()))) {
                log(`[Pattern Detection] Matched raw terminal output.`);
                playDunDunDun(context);
            }
        });
        context.subscriptions.push(disposableData);
        log('dunDunDun.usePatternDetection enabled via Proposed API.');
    } else {
        log('Warning: onDidWriteTerminalData is not available. Please ensure enabledApiProposals is set and you launch with --enable-proposed-api=realtanmoydeb.dun-dun-dun.');
    }
}

function updateStatusBar() {
    const isEnabled = vscode.workspace.getConfiguration('dunDunDun').get('enabled');
    statusBarItem.text = isEnabled ? `$(unmute) Dun dun dun` : `$(mute) Dun dun dun`;
    statusBarItem.tooltip = isEnabled ? `Dun dun dun is Enabled. Click to disable.` : `Dun dun dun is Disabled. Click to enable.`;
    // We reuse the enable command to act as a toggle in the UI
    statusBarItem.show();
}

function playDunDunDun(context, force = false) {
    const config = vscode.workspace.getConfiguration('dunDunDun');

    // Check cooldown
    const debounceTime = config.get('cooldownMs', 2000);
    const now = Date.now();
    if (!force && (now - lastPlayTime < debounceTime)) {
        return;
    }
    lastPlayTime = now;

    // Resolve audio path (User override or default)
    let audioPath = config.get('soundFile');
    if (!audioPath || audioPath.trim() === '') {
        audioPath = path.join(context.extensionPath, 'media', 'dundundun.mp3');
    }

    // Resolve matching volume
    let volume = config.get('volume', 1.0);
    if (volume < 0) volume = 0;
    if (volume > 1) volume = 1;

    let command;

    switch (os.platform()) {
        case 'win32':
            const safePath = audioPath.replace(/'/g, "''"); // Escape single quotes for PowerShell
            // Windows PresentationCore supports Volume property between 0.0 and 1.0
            command = `powershell -WindowStyle Hidden -Command "Add-Type -AssemblyName presentationCore; $player = New-Object system.windows.media.mediaplayer; $player.Volume = ${volume}; $player.open('${safePath}'); $player.Play(); Start-Sleep -Seconds 4"`;
            break;
        case 'darwin':
            // afplay on Mac uses -v for volume (ranges vary natively but roughly 0 to 1 works ok or scaling from 0 to 2)
            command = `afplay -v ${volume} "${audioPath}"`;
            break;
        case 'linux':
            // For Linux, it usually depends on the player. 
            // We just let paplay volume fallback to volume arguments (often 0-65536) but scaling can get complex.
            // A simple implementation without diving into Linux ALSA APIs for MP3: 
            // If ALSA `mpg123`, `mpg123 -f <scale_factor>`. `paplay --volume=...`
            const linuxVol = Math.floor(volume * 65536);
            command = `paplay --volume=${linuxVol} "${audioPath}" || mpg123 -f ${Math.floor(volume * 32768)} "${audioPath}" || aplay "${audioPath}"`;
            break;
        default:
            log('Dun dun dun: Unsupported OS');
            return;
    }

    exec(command, (error) => {
        if (error) {
            log('Dun dun dun: Error playing sound: ' + error.message);
        } else {
            log(`Dun dun dun: Successfully played sound via ${command.split(' ')[0]}`);
        }
    });
}

function log(message) {
    if (outputChannel) {
        outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] ${message}`);
    } else {
        console.error(message);
    }
}

function deactivate() { }

module.exports = {
    activate,
    deactivate
}