// Structured logger with level gating.
// Production suppresses debug + info by default; override with LOG_LEVEL env var.

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type Level = keyof typeof LEVELS;

function getMinLevel(): number {
  const env = process.env.LOG_LEVEL?.toLowerCase();
  if (env && env in LEVELS) return LEVELS[env as Level];
  return process.env.NODE_ENV === "production" ? LEVELS.warn : LEVELS.debug;
}

const minLevel = getMinLevel();

export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export function createLogger(module: string): Logger {
  const prefix = `[${module}]`;
  return {
    debug: (...args) => { if (minLevel <= LEVELS.debug) console.debug(prefix, ...args); },
    info: (...args) => { if (minLevel <= LEVELS.info) console.log(prefix, ...args); },
    warn: (...args) => { if (minLevel <= LEVELS.warn) console.warn(prefix, ...args); },
    error: (...args) => { console.error(prefix, ...args); },
  };
}

export const log = createLogger("app");
