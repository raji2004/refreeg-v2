/**
 * PM2 Ecosystem Configuration for Refreeg v2
 *
 * One process serves both hostnames — nginx proxies both www.refreeg.com
 * (marketing pages) and apps.refreeg.com (the app) to this same port.
 * middleware.ts's domain-split logic decides which routes are canonical on
 * which hostname (redirecting the browser, not routing to a different
 * backend) purely from the `Host` header, so a single Next.js process can
 * serve both without any cross-process split.
 *
 * This used to be two separate PM2 processes on two ports (frontend:3000,
 * apps:4000) — each held its own Prisma connection pool, and every deploy
 * had to kill and restart both at once. On this same small EC2 box that
 * also runs Postgres, that was enough contention to intermittently show up
 * as PrismaClientKnownRequestError/PrismaClientInitializationError in prod.
 * One process halves both the connection-pool count and the restart
 * contention.
 *
 * Memory limit is intentionally conservative given the limited EC2 RAM.
 * Increase `max_memory_restart` if you upgrade the instance.
 *
 * Docs: https://pm2.keymetrics.io/docs/usage/application-declaration/
 */

const fs = require("fs");

// Read secrets directly from disk instead of relying on the invoking shell's
// environment. `pm2 start ecosystem.config.js` only forwards this file's own
// `env` object to the spawned process — spreading `...process.env` used to
// be how DATABASE_URL etc. got in, but that only works if whoever ran `pm2
// start` happened to `source` secrets.env into their shell first. Any manual
// `pm2 restart`/`pm2 start` run without that step silently starts the app
// with no secrets at all (which is exactly what happened during
// troubleshooting). Reading the file here instead means it works identically
// every time, regardless of how/by whom PM2 is invoked.
function loadSecrets(secretsPath) {
  if (!fs.existsSync(secretsPath)) return {};
  const env = {};
  for (const line of fs.readFileSync(secretsPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

const secrets = loadSecrets("/mnt/data/refreeg/shared/secrets.env");

module.exports = {
  apps: [
    {
      name: "refreeg",
      // Next.js "standalone" output: a minimal self-contained server.js with
      // its own pruned node_modules, instead of running via next start out of
      // a full node_modules copy.
      script: "server.js",
      cwd: "/mnt/data/refreeg/current",
      env: {
        ...secrets,
        NODE_ENV: "production",
        PORT: 3000,
        // Next.js standalone server.js binds to process.env.HOSTNAME if set,
        // defaulting to 0.0.0.0 otherwise. Pin it explicitly so the server
        // always listens on all interfaces, reachable via 127.0.0.1 (required
        // for nginx's proxy_pass and any localhost health check) — no longer
        // strictly needed now that we don't spread the ambient process.env,
        // but kept as defense in depth in case anything upstream ever sets it.
        HOSTNAME: "0.0.0.0",
      },

      // ── Resource limits ───────────────────────────────────────────────────
      max_memory_restart: "400M", // restart if process exceeds 400 MB
      instances: 1, // single instance (small EC2 – keep RAM low)
      exec_mode: "fork", // fork mode (cluster mode needs more RAM)

      // ── Logging ───────────────────────────────────────────────────────────
      out_file: "/mnt/data/refreeg/shared/logs/refreeg.out.log",
      error_file: "/mnt/data/refreeg/shared/logs/refreeg.err.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      // ── Restart policy ────────────────────────────────────────────────────
      autorestart: true,
      restart_delay: 3000, // wait 3 s before restarting
      max_restarts: 10, // give up after 10 rapid crashes
      min_uptime: "10s", // crash if process dies within 10 s
    },
  ],
};
