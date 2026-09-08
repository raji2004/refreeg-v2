/**
 * PM2 Ecosystem Configuration for Refreeg v2 — ALB + Auto Scaling Group setup
 *
 * Used by the scaled pipeline only (.github/workflows/deploy-scaled.yml,
 * scripts/remote-deploy-scaled.sh, scripts/bootstrap-instance.sh). Identical
 * to ecosystem.config.js except for the app directory (/opt/refreeg instead
 * of /mnt/data/refreeg, matching the ASG base AMI's disk layout — see
 * infra/packer/base-ami.pkr.hcl).
 *
 * Docs: https://pm2.keymetrics.io/docs/usage/application-declaration/
 */

const fs = require("fs");

// Read secrets directly from disk instead of relying on the invoking shell's
// environment. `pm2 start ecosystem.config.js` only forwards this file's own
// `env` object to the spawned process — spreading `...process.env` used to
// be how DATABASE_URL etc. got in, but that only works if whoever ran `pm2
// start` happened to have secrets already sourced into their shell. Any
// manual `pm2 restart`/`pm2 start`, or SSM Run Command invoked slightly
// differently, could silently start the app with no secrets at all. Reading
// the file here instead means it works identically every time, regardless of
// how/by whom PM2 is invoked.
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

const secrets = loadSecrets("/opt/refreeg/shared/secrets.env");

module.exports = {
  apps: [
    {
      // ── Landing page ──────────────────────────────────────────────────────
      name: "frontend",
      // Next.js "standalone" output: a minimal self-contained server.js with
      // its own pruned node_modules, instead of running via next start out of
      // a full node_modules copy.
      script: "server.js",
      cwd: "/opt/refreeg/current",
      env: {
        ...secrets,
        NODE_ENV: "production",
        PORT: 3000,
        // Next.js standalone server.js binds to process.env.HOSTNAME if set,
        // defaulting to 0.0.0.0 otherwise. Pin it explicitly so the server
        // always listens on all interfaces, reachable via 127.0.0.1 (required
        // for the ALB health check target and any localhost check).
        HOSTNAME: "0.0.0.0",
      },

      // ── Resource limits ───────────────────────────────────────────────────
      max_memory_restart: "300M",  // restart if process exceeds 300 MB
      instances: 1,                // single instance per host (ASG scales horizontally instead)
      exec_mode: "fork",           // fork mode (cluster mode needs more RAM)

      // ── Logging ───────────────────────────────────────────────────────────
      out_file: "/opt/refreeg/shared/logs/frontend.out.log",
      error_file: "/opt/refreeg/shared/logs/frontend.err.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      // ── Restart policy ────────────────────────────────────────────────────
      autorestart: true,
      restart_delay: 3000,         // wait 3 s before restarting
      max_restarts: 10,            // give up after 10 rapid crashes
      min_uptime: "10s",           // crash if process dies within 10 s
    },

    {
      // ── API / App ─────────────────────────────────────────────────────────
      name: "api",
      script: "server.js",
      cwd: "/opt/refreeg/current",
      env: {
        ...secrets,
        NODE_ENV: "production",
        PORT: 4000,
        // See the "frontend" app above.
        HOSTNAME: "0.0.0.0",
      },

      // ── Resource limits ───────────────────────────────────────────────────
      max_memory_restart: "300M",
      instances: 1,
      exec_mode: "fork",

      // ── Logging ───────────────────────────────────────────────────────────
      out_file: "/opt/refreeg/shared/logs/api.out.log",
      error_file: "/opt/refreeg/shared/logs/api.err.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      // ── Restart policy ────────────────────────────────────────────────────
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: "10s",
    },
  ],
};
