/**
 * PM2 Ecosystem Configuration for Refreeg v2
 *
 * Frontend (landing page) → port 3000  (http://www.refreeg.com)
 * API / App              → port 4000  (http://apps.refreeg.com)
 *
 * Memory limits are intentionally conservative given the limited EC2 RAM.
 * Increase `max_memory_restart` if you upgrade the instance.
 *
 * Docs: https://pm2.keymetrics.io/docs/usage/application-declaration/
 */

module.exports = {
  apps: [
    {
      // ── Landing page ──────────────────────────────────────────────────────
      name: "frontend",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/var/www/refreeg/current",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },

      // ── Resource limits ───────────────────────────────────────────────────
      max_memory_restart: "300M",  // restart if process exceeds 300 MB
      instances: 1,                // single instance (small EC2 – keep RAM low)
      exec_mode: "fork",           // fork mode (cluster mode needs more RAM)

      // ── Logging ───────────────────────────────────────────────────────────
      out_file: "/var/www/refreeg/shared/logs/frontend.out.log",
      error_file: "/var/www/refreeg/shared/logs/frontend.err.log",
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
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/var/www/refreeg/current",
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },

      // ── Resource limits ───────────────────────────────────────────────────
      max_memory_restart: "300M",
      instances: 1,
      exec_mode: "fork",

      // ── Logging ───────────────────────────────────────────────────────────
      out_file: "/var/www/refreeg/shared/logs/api.out.log",
      error_file: "/var/www/refreeg/shared/logs/api.err.log",
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
