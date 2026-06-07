import Phaser from 'phaser';
import { Logger, LogLevel } from '../core/Logger';

const logger = Logger.forSystem('DEBUG_OVERLAY');

const CMD_HISTORY_MAX = 50;
const LOG_DISPLAY_COUNT = 8;

type DevCommand = (args: string[]) => string;

const COMMANDS = new Map<string, { run: DevCommand; description: string }>();

function registerCommand(name: string, description: string, run: DevCommand): void {
  COMMANDS.set(name.toLowerCase(), { run, description });
}

registerCommand('help', 'Print all available commands', () => {
  const lines: string[] = [];
  for (const [name, cmd] of COMMANDS) {
    lines.push(`  ${name.padEnd(18)} ${cmd.description}`);
  }
  lines.sort();
  return `Available commands:\n${lines.join('\n')}`;
});

registerCommand('setloglevel', 'Set log level (VERBOSE|DEBUG|INFO|WARN|ERROR|FATAL|OFF)', (args) => {
  const level = args[0]?.toUpperCase() as keyof typeof LogLevel;
  if (level in LogLevel) {
    Logger.getInstance().setLevel(LogLevel[level] as unknown as LogLevel);
    return `Log level set to ${level}`;
  }
  return `Invalid level: ${args[0]}. Use VERBOSE|DEBUG|INFO|WARN|ERROR|FATAL|OFF`;
});

registerCommand('showlog', 'Print last n log entries to console (default: 20)', (args) => {
  const n = parseInt(args[0] || '20', 10);
  const entries = Logger.getInstance().getBuffer().slice(-n);
  for (const entry of entries) {
    // eslint-disable-next-line no-console
    console.log(`[${entry.system.padEnd(12)}] ${entry.message}`, entry.data ?? '');
  }
  return `Printed ${entries.length} log entries to browser console`;
});

registerCommand('filtersystem', 'Show/hide log entries for a system (name on/off)', (args) => {
  const system = args[0]?.toUpperCase();
  const enabled = args[1]?.toLowerCase();
  if (!system || !enabled) return 'Usage: filtersystem [SYSTEM_NAME] [on/off]';
  Logger.getInstance().filter(system, enabled === 'on');
  return `System filter: ${system} = ${enabled === 'on' ? 'ON' : 'OFF'}`;
});

registerCommand('godmode', 'Toggle player invulnerability (on/off)', (args) => {
  const enabled = args[0]?.toLowerCase();
  if (enabled === 'on' || enabled === 'off') {
    logger.info('Dev command executed', { command: 'godmode', args: { enabled: enabled === 'on' } });
    return `Godmode ${enabled === 'on' ? 'ENABLED' : 'DISABLED'} (stub — system not yet implemented)`;
  }
  return 'Usage: godmode [on/off]';
});

registerCommand('givegold', 'Add n gold to player', (args) => {
  const amount = parseInt(args[0] || '0', 10);
  if (isNaN(amount) || amount < 0) return 'Usage: givegold [amount]';
  logger.info('Dev command executed', { command: 'givegold', args: { amount } });
  return `Gave ${amount} gold (stub — system not yet implemented)`;
});

registerCommand('exportlog', 'Download full log buffer as .txt', () => {
  const entries = Logger.getInstance().getBuffer();
  const text = entries.map((e) => {
    const level = LogLevel[e.level].padEnd(6);
    const dataStr = e.data ? ` — ${JSON.stringify(e.data)}` : '';
    return `[${level}] [${e.system.padEnd(12)}] ${e.message}${dataStr}`;
  }).join('\n');
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ashfall_log_${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  return `Exported ${entries.length} log entries`;
});

registerCommand('clear', 'Clear the log buffer', () => {
  Logger.getInstance().clear();
  return 'Log buffer cleared';
});

export class DebugOverlayScene extends Phaser.Scene {
  static readonly KEY = 'DebugOverlayScene';

  private visible = false;

  private bgRect!: Phaser.GameObjects.Rectangle;
  private headerText!: Phaser.GameObjects.Text;
  private perfText!: Phaser.GameObjects.Text;
  private playerText!: Phaser.GameObjects.Text;
  private zoneText!: Phaser.GameObjects.Text;
  private logText!: Phaser.GameObjects.Text;
  private inputText!: Phaser.GameObjects.Text;
  private inputCursor!: Phaser.GameObjects.Rectangle;

  private commandBuffer = '';
  private commandHistory: string[] = [];
  private historyIndex = -1;
  private inputActive = false;

  private devCommands: Map<string, DevCommand>;

  private lastLogTimestamp = 0;
  private cachedLogLines: string[] = [];

  constructor() {
    super({ key: DebugOverlayScene.KEY });

    this.devCommands = new Map();
    for (const [name, cmd] of COMMANDS) {
      this.devCommands.set(name, cmd.run);
    }
  }

  create(): void {
    this.visible = false;
    this.createUI();
    this.setupInput();
    this.setupWindowDev();
    this.cachedLogLines = this.buildLogLines();
  }

  update(time: number, _delta: number): void {
    if (!this.visible) return;
    this.updatePerfText();
    this.updateLogDisplay();
  }

  toggle(): void {
    this.visible = !this.visible;
    this.bgRect.setVisible(this.visible);
    this.headerText.setVisible(this.visible);
    this.perfText.setVisible(this.visible);
    this.playerText.setVisible(this.visible);
    this.zoneText.setVisible(this.visible);
    this.logText.setVisible(this.visible);
    this.inputText.setVisible(this.visible);
    this.inputCursor.setVisible(this.visible && this.inputActive);
    this.inputActive = false;
    this.commandBuffer = '';
    this.inputText.setText('> ');
  }

  showNotification(message: string): void {
    // Show a brief notification in the log area
    this.cachedLogLines.push(`[NOTIFY] ${message}`);
    if (this.cachedLogLines.length > LOG_DISPLAY_COUNT) {
      this.cachedLogLines.shift();
    }
  }

  private createUI(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.bgRect = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0)
      .setScrollFactor(0).setDepth(100000);

    this.headerText = this.add.text(10, 5, 'ASHFALL DEBUG OVERLAY — [F1] close', {
      color: '#00ff00', fontSize: '14px', fontFamily: 'monospace',
    }).setScrollFactor(0).setDepth(100001);

    this.perfText = this.add.text(10, 25, '', {
      color: '#00ff00', fontSize: '12px', fontFamily: 'monospace', lineSpacing: 2,
    }).setScrollFactor(0).setDepth(100001);

    this.playerText = this.add.text(w / 2 + 10, 25, '', {
      color: '#00ff00', fontSize: '12px', fontFamily: 'monospace', lineSpacing: 2,
    }).setScrollFactor(0).setDepth(100001);

    this.zoneText = this.add.text(10, 145, '', {
      color: '#00ff00', fontSize: '12px', fontFamily: 'monospace', lineSpacing: 2,
    }).setScrollFactor(0).setDepth(100001);

    this.logText = this.add.text(w / 2 + 10, 145, '', {
      color: '#00ff00', fontSize: '12px', fontFamily: 'monospace', lineSpacing: 2,
    }).setScrollFactor(0).setDepth(100001);

    this.inputText = this.add.text(10, h - 30, '> ', {
      color: '#00ff00', fontSize: '13px', fontFamily: 'monospace',
    }).setScrollFactor(0).setDepth(100001);

    this.inputCursor = this.add.rectangle(14, h - 22, 2, 14, 0x00ff00)
      .setScrollFactor(0).setDepth(100001);

    if (!IS_DEV) {
      this.headerText.setText('ASHFALL DEBUG OVERLAY — [F1] close [DEV MODE ONLY]');
    }

    this.hideAll();
  }

  private hideAll(): void {
    this.bgRect.setVisible(false);
    this.headerText.setVisible(false);
    this.perfText.setVisible(false);
    this.playerText.setVisible(false);
    this.zoneText.setVisible(false);
    this.logText.setVisible(false);
    this.inputText.setVisible(false);
    this.inputCursor.setVisible(false);
  }

  private setupInput(): void {
    if (!this.input.keyboard) return;

    this.input.keyboard.on('keydown', (event: KeyboardEvent) => {
      if (event.key === 'F1') {
        event.preventDefault();
        this.toggle();
        return;
      }

      if (!this.visible) return;

      if (event.key === 'F2') {
        this.showNotification('F2: Tile grid toggle — stub');
        return;
      }
      if (event.key === 'F3') {
        this.showNotification('F3: Collision overlay — stub');
        return;
      }
      if (event.key === 'F4') {
        this.showNotification('F4: Entity bounds — stub');
        return;
      }
      if (event.key === 'F5') {
        this.showNotification('F5: AI state labels — stub');
        return;
      }
      if (event.key === 'Escape' && this.visible) {
        this.toggle();
        return;
      }

      if (event.key === 'Enter') {
        this.executeCommand();
        return;
      }

      if (event.key === 'ArrowUp') {
        this.navigateHistory(-1);
        return;
      }

      if (event.key === 'ArrowDown') {
        this.navigateHistory(1);
        return;
      }

      if (event.key === 'Backspace') {
        this.commandBuffer = this.commandBuffer.slice(0, -1);
        this.renderInput();
        return;
      }

      if (event.key.length === 1) {
        this.commandBuffer += event.key;
        this.renderInput();
      }
    });
  }

  private setupWindowDev(): void {
    (window as any).DEV = {
      log: (id?: string) => {
        const entries = Logger.getInstance().getBuffer();
        entries.forEach((e) => console.log(e));
        return entries.length;
      },
      setloglevel: (level: string) => {
        const l = level?.toUpperCase() as keyof typeof LogLevel;
        if (l in LogLevel) {
          Logger.getInstance().setLevel(LogLevel[l] as unknown as LogLevel);
          return `Level set to ${l}`;
        }
        return `Invalid level: ${level}`;
      },
      help: () => Array.from(COMMANDS.keys()).sort(),
    };
  }

  private executeCommand(): void {
    const input = this.commandBuffer.trim();
    if (!input) return;

    this.commandHistory.push(input);
    if (this.commandHistory.length > CMD_HISTORY_MAX) {
      this.commandHistory.shift();
    }
    this.historyIndex = -1;

    const parts = input.split(/\s+/);
    const cmdName = parts[0].toLowerCase();
    const args = parts.slice(1);

    const cmd = this.devCommands.get(cmdName);
    if (cmd) {
      const result = cmd(args);
      this.showNotification(result);
    } else {
      this.showNotification(`Unknown command: ${cmdName}. Type 'help' for available commands.`);
    }

    this.commandBuffer = '';
    this.renderInput();
  }

  private navigateHistory(direction: -1 | 1): void {
    if (this.commandHistory.length === 0) return;

    this.historyIndex += direction;
    if (this.historyIndex < -1) {
      this.historyIndex = -1;
      this.commandBuffer = '';
    } else if (this.historyIndex >= this.commandHistory.length) {
      this.historyIndex = this.commandHistory.length - 1;
    } else if (this.historyIndex === -1) {
      this.commandBuffer = '';
    } else {
      this.commandBuffer = this.commandHistory[this.historyIndex];
    }
    this.renderInput();
  }

  private renderInput(): void {
    this.inputText.setText(`> ${this.commandBuffer}`);
    const cursorX = this.inputText.x + this.inputText.width + 2;
    this.inputCursor.setX(cursorX);

    if (!this.visible) {
      this.inputCursor.setVisible(false);
    }
  }

  private updatePerfText(): void {
    const game = this.game;
    const fps = Math.round(game.loop.actualFps);
    const frameMs = (1000 / (game.loop.actualFps || 60)).toFixed(1);
    const renderer = game.renderer as any;
    const drawCalls = typeof renderer.drawCount === 'number' ? renderer.drawCount : 0;

    this.perfText.setText(
      `PERFORMANCE\n` +
      `FPS:      ${fps}\n` +
      `Frame:    ${frameMs}ms\n` +
      `Draw cls: ${drawCalls}`
    );

    this.playerText.setText(
      `PLAYER\n` +
      `Level: 1  Class: --\n` +
      `Pos: --\n` +
      `HP: --`
    );

    this.zoneText.setText(
      `ZONE\n` +
      `ID:     --\n` +
      `Level:  --\n` +
      `Enemies: 0`
    );
  }

  private buildLogLines(): string[] {
    const entries = Logger.getInstance().getBuffer();
    const recent = entries.slice(-LOG_DISPLAY_COUNT);
    return recent.map((e) => {
      const level = LogLevel[e.level].padEnd(6);
      return `[${level}] [${e.system.padEnd(12)}] ${e.message}`;
    });
  }

  private updateLogDisplay(): void {
    if (performance.now() - this.lastLogTimestamp < 250) return;
    this.lastLogTimestamp = performance.now();

    const newLines = this.buildLogLines();
    if (newLines.length !== this.cachedLogLines.length ||
        (newLines.length > 0 && newLines[newLines.length - 1] !== this.cachedLogLines[this.cachedLogLines.length - 1])) {
      this.cachedLogLines = newLines;
    }

    this.logText.setText(
      `LAST EVENTS (most recent ${LOG_DISPLAY_COUNT})\n` +
      (this.cachedLogLines.length === 0 ? '  (no events)' : this.cachedLogLines.join('\n'))
    );
  }
}
