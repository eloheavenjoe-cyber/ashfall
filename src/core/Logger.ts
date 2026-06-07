export enum LogLevel {
  VERBOSE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
  OFF = 6,
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  system: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface ILogger {
  verbose(message: string, data?: Record<string, unknown>): void;
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
  fatal(message: string, data?: Record<string, unknown>): void;
}

const LABELS: Record<LogLevel, string> = {
  [LogLevel.VERBOSE]: 'VERBOSE',
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL',
  [LogLevel.OFF]: 'OFF',
};

const LEVEL_PADDED: Record<LogLevel, string> = {
  [LogLevel.VERBOSE]: 'VERBOSE',
  [LogLevel.DEBUG]: 'DEBUG ',
  [LogLevel.INFO]: 'INFO  ',
  [LogLevel.WARN]: 'WARN  ',
  [LogLevel.ERROR]: 'ERROR ',
  [LogLevel.FATAL]: 'FATAL ',
  [LogLevel.OFF]: 'OFF   ',
};

const SYSTEM_PAD_WIDTH = 12;
const BUFFER_MAX = 500;

function padEnd(str: string, len: number): string {
  return (str + ' '.repeat(len)).slice(0, len);
}

function formatTimestamp(now: Date): string {
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

export class Logger {
  private static instance: Logger;

  private level: LogLevel = (typeof IS_DEV !== 'undefined' && IS_DEV)
    ? LogLevel.DEBUG
    : LogLevel.WARN;
  private systemFilters: Map<string, boolean> = new Map();
  private buffer: LogEntry[] = [];

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  static forSystem(system: string): ILogger {
    const logger = Logger.getInstance();
    const tag = system.toUpperCase();
    return {
      verbose: (msg, data?) => logger.write(LogLevel.VERBOSE, tag, msg, data),
      debug: (msg, data?) => logger.write(LogLevel.DEBUG, tag, msg, data),
      info: (msg, data?) => logger.write(LogLevel.INFO, tag, msg, data),
      warn: (msg, data?) => logger.write(LogLevel.WARN, tag, msg, data),
      error: (msg, data?) => logger.write(LogLevel.ERROR, tag, msg, data),
      fatal: (msg, data?) => logger.write(LogLevel.FATAL, tag, msg, data),
    };
  }

  private write(level: LogLevel, system: string, message: string, data?: Record<string, unknown>): void {
    if (level < this.level) return;
    if (this.systemFilters.get(system) === false) return;

    const now = performance.now();
    const entry: LogEntry = { timestamp: now, level, system, message, data };
    this.buffer.push(entry);
    if (this.buffer.length > BUFFER_MAX) {
      this.buffer = this.buffer.slice(-BUFFER_MAX);
    }

    const date = new Date();
    const ts = formatTimestamp(date);
    const levelStr = LEVEL_PADDED[level];
    const sysStr = padEnd(system, SYSTEM_PAD_WIDTH);
    const dataStr = data !== undefined ? ` — ${JSON.stringify(data)}` : '';
    // eslint-disable-next-line no-console
    console.log(`[${ts}] [${levelStr}] [${sysStr}] ${message}${dataStr}`);
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  filter(system: string, enabled: boolean): void {
    this.systemFilters.set(system.toUpperCase(), enabled);
  }

  getBuffer(): LogEntry[] {
    return [...this.buffer];
  }

  clear(): void {
    this.buffer = [];
  }
}
