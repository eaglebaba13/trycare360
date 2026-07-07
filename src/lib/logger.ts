/**
 * Uniform structured logger. Server + client safe.
 * All app code should call log.info/warn/error instead of console.*.
 */
type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, msg: string, ctx?: Record<string, unknown>) {
  const line = { ts: new Date().toISOString(), level, msg, ...ctx };
  const fn =
    level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  try {
    fn(JSON.stringify(line));
  } catch {
    fn(level, msg, ctx);
  }
}

export const log = {
  debug: (msg: string, ctx?: Record<string, unknown>) => emit("debug", msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => emit("info", msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => emit("warn", msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => emit("error", msg, ctx),
};
