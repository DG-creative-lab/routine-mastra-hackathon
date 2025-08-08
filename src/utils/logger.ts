// =============================================================
// Simple logger utility with levels and timestamps
// Supports LOG_LEVEL env var (debug, info, warn, error)
// =============================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Determine current log level from env (default to 'info')
const envLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
const CURRENT_LEVEL = LEVELS[envLevel] ?? LEVELS.info;

/**
 * Internal log function that checks level and prefixes timestamp
 */
function log(level: LogLevel, ...args: unknown[]) {
  if (LEVELS[level] < CURRENT_LEVEL) return;
  const timestamp = new Date().toISOString();
  // Use console[level] to match levels
  // eslint-disable-next-line no-console
  console[level](`[${timestamp}] [${level.toUpperCase()}]`, ...args);
}

/**
 * Exported logger API
 */
export const logger = {
  debug: (...args: unknown[]) => log('debug', ...args),
  info:  (...args: unknown[]) => log('info',  ...args),
  warn:  (...args: unknown[]) => log('warn',  ...args),
  error: (...args: unknown[]) => log('error', ...args),
};
