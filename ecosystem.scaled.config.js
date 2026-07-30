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
      // Spread process.env so every secret fetched from SSM Parameter Store by
      // remote-deploy-scaled.sh (DATABASE_URL, PAYSTACK_SECRET_KEY, etc.)
      // reaches the spawned process — PM2 does NOT auto-forward the invoking
      // shell's env for apps started from a config file, only what's listed here.
      env: {
        ...process.env,
        NODE_ENV: "production",
        PORT: 3000,
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
        ...process.env,
        NODE_ENV: "production",
        PORT: 4000,
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
