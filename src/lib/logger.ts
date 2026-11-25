/**
 * Isomorphic structured application logger (safe in both Node scripts and browser bundles).
 */
export interface AppLogger {
  info: (message: string, meta?: unknown) => void;
  warn: (message: string, meta?: unknown) => void;
  error: (message: string, meta?: unknown) => void;
}

const isNodeRuntime =
  typeof process !== 'undefined' &&
  typeof process.stdout !== 'undefined' &&
  typeof process.stdout.write === 'function';

/**
 * Creates a scoped logger instance.
 *
 * @param scope - Logical module identifier
 */
export function createLogger(scope: string): AppLogger {
  const format = (level: string, message: string) =>
    `[${new Date().toISOString()}] [${level}] [${scope}] ${message}`;

  return {
    info: (message: string, meta?: unknown) => {
      if (isNodeRuntime && process.env.NODE_ENV !== 'test') {
        process.stdout.write(`${format('INFO', message)}${meta ? ` ${JSON.stringify(meta)}` : ''}\n`);
      }
    },
    warn: (message: string, meta?: unknown) => {
      if (isNodeRuntime) {
        process.stderr.write(`${format('WARN', message)}${meta ? ` ${JSON.stringify(meta)}` : ''}\n`);
      }
    },
    error: (message: string, meta?: unknown) => {
      if (isNodeRuntime) {
        const details = meta instanceof Error ? meta.message : meta ? JSON.stringify(meta) : '';
        process.stderr.write(`${format('ERROR', message)}${details ? ` :: ${details}` : ''}\n`);
      }
    },
  };
}
