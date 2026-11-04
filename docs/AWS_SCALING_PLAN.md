# AWS Scaling Plan

Step-by-step plan for taking the ALB + Auto Scaling Group + RDS stack in
[`infra/`](../infra) from "staged" to "scales with user count". Work through
the phases in order. Tick the boxes as you go.

**Target architecture**

```
Users ─► CloudFront ─► ALB ─► ASG (EC2 t4g, PM2 cluster, Next.js standalone)
                                 │            │
                                 │            ├─► ElastiCache (Valkey) — shared Next.js cache
                                 │            └─► RDS Postgres (later: RDS Proxy / Aurora Serverless v2)
                                 └─► S3 (media, releases)
EventBridge Scheduler ─► /api/cron/* (exactly once, not per instance)
```

**Current state (as of Nov 2026)**

- Production runs on a single EC2 box ([`deploy.yml`](../.github/workflows/deploy.yml),
  [`ecosystem.config.js`](../ecosystem.config.js)) with Postgres on the same machine.
- The scaled stack ([`infra/`](../infra), [`deploy-scaled.yml`](../.github/workflows/deploy-scaled.yml),
  [`ecosystem.scaled.config.js`](../ecosystem.scaled.config.js)) is defined but not live.
- **Gaps that block horizontal scaling:**
  1. No scaling policy on the ASG, so it never grows past `desired_capacity`.
  2. Cron jobs are only declared in [`vercel.json`](../vercel.json). Nothing on AWS triggers them.
  3. The Next.js data cache is per-instance, so the `revalidateTag`/`revalidatePath`
     calls in `actions/` don't propagate between instances.
  4. `db.t4g.micro` is too small, and Prisma's connection pool is unbounded per process.

---

## Phase 0 — Prerequisites

- [ ] Confirm the AWS region (`us-east-1` per `infra/variables.tf`) and that the
      Terraform state backend in `infra/providers.tf` is remote (S3 + lock), not local.
- [ ] Build the base AMI: `packer build infra/packer/base-ami.pkr.hcl`. Record the
      AMI ID for `base_ami_id`.
- [ ] Check all secrets are in SSM Parameter Store under `/refreeg/production/`
      (including `CRON_SECRET`, `DATABASE_URL`, `REDIS_URL` once Phase 3 is done).
- [ ] Set up a load-testing tool (k6 or Artillery) and write one script that
      covers: home page, a cause page, login, and a donation flow up to payment.

---

## Phase 1 — Make the ASG actually autoscale (`infra/asg.tf`, `infra/variables.tf`)

- [ ] Add a target-tracking policy on CPU:
  ```hcl
  resource "aws_autoscaling_policy" "cpu" {
    name                   = "${var.project_name}-cpu-target"
    autoscaling_group_name = aws_autoscaling_group.app.name
    policy_type            = "TargetTrackingScaling"
    target_tracking_configuration {
      predefined_metric_specification {
        predefined_metric_type = "ASGAverageCPUUtilization"
      }
      target_value = 50
    }
  }
  ```
- [ ] Add a second target-tracking policy on `ALBRequestCountPerTarget`
      (`resource_label` = `"${aws_lb.app.arn_suffix}/${aws_lb_target_group.<tg>.arn_suffix}"`).
      Start at a target of 500 and tune it from load-test results.
- [ ] Change `asg_min_size` from 1 to **2**, and check that `data.aws_subnets.default`
      covers at least 2 availability zones.
- [ ] Raise `asg_max_size` as needed (4 for now, about 10 in Phase 6).
- [ ] Set `default_instance_warmup` (about 120s) so a new instance's startup CPU
      doesn't trigger more scale-outs.
- [ ] Turn on instance-level CloudWatch metrics (`enabled_metrics`) so you can see
      desired, in-service and pending instance counts.

**Done when:** a load test makes the ASG add instances, and they're removed again
about 15 minutes after the load stops.

---

## Phase 2 — Run cron jobs exactly once (EventBridge Scheduler)

Every instance runs the same code. If cron ran on each instance, a 4-instance
fleet would run `pledge-charges` **4 times**, which would charge donors 4 times.
The routes already require `Authorization: Bearer ${CRON_SECRET}`
([`lib/cron-auth.ts`](../lib/cron-auth.ts)), which works as-is with EventBridge
API destinations.

- [ ] New file `infra/scheduler.tf` containing:
  - `aws_cloudwatch_event_connection`: auth type `API_KEY`, key `Authorization`,
    value `Bearer <CRON_SECRET>` (pass it in as a sensitive variable).
  - One `aws_cloudwatch_event_api_destination` per route, method `POST`, pointing
    at `https://apps.refreeg.com/api/cron/<job>`.
  - One `aws_cloudwatch_event_rule` + target per job. Copy the schedules from
    `vercel.json`:

    | Job                 | Schedule (UTC)       |
    | ------------------- | -------------------- |
    | `pledge-charges`    | `cron(0 6 * * ? *)`  |
    | `pledge-reminders`  | `cron(15 6 * * ? *)` |
    | `proof-enforcement` | `cron(0 0 * * ? *)`  |

  - A dead-letter SQS queue and a CloudWatch alarm on failed invocations.
- [ ] Check that `chargeDuePledgesForToday` ([`lib/pledge-paystack.ts`](../lib/pledge-paystack.ts))
      is idempotent, i.e. running it twice on the same day doesn't charge twice.
      EventBridge retries failed calls. If it isn't idempotent, add a per-pledge,
      per-day guard (a unique row or status flag) before turning the schedule on.
- [ ] The ALB idle timeout is 60s by default. If a cron job can run longer than
      that, either raise `idle_timeout` on `aws_lb.app` or have the route queue
      the work and return straight away.
- [ ] Remove `vercel.json` once the schedules are live, or leave a note in it
      that EventBridge owns the schedules now.
- [ ] `warm-cause-images` is currently triggered by `scripts/remote-deploy.sh`.
      In the scaled flow, call it **once** per deploy from
      `remote-deploy-scaled.sh` or the workflow, not from each instance.

**Done when:** each job runs once per scheduled time (check the logs) whatever the
instance count is.

---

## Phase 3 — Shared Next.js cache (ElastiCache Valkey)

- [ ] New file `infra/cache.tf`: an `aws_elasticache_replication_group` running
      Valkey, `cache.t4g.small`, 1 primary + 1 replica, in the same subnets. Add a
      security group that allows port 6379 from `aws_security_group.app` only.
- [ ] Add a cache handler that stores Next.js data-cache entries and tags in
      Redis (for example `@neshca/cache-handler` with a Redis adapter, or a small
      custom `cache-handler.mjs`). Set it up in `next.config.mjs`:
  ```js
  cacheHandler: process.env.REDIS_URL ? require.resolve("./cache-handler.mjs") : undefined,
  cacheMaxMemorySize: 0, // disable the per-instance in-memory cache
  ```
- [ ] Add `cache-handler.mjs` to `outputFileTracingIncludes` so the standalone
      build ships it.
- [ ] Put `REDIS_URL` in SSM. Leave it unset locally so dev keeps the default
      file-system cache.
- [ ] Test: run 2 instances, edit a cause through the admin page on one, and
      check the other instance shows the change straight away.

**Done when:** a `revalidateTag` on any instance is seen by all instances.

---

## Phase 4 — Database sizing & connections (`infra/rds.tf`)

- [ ] Change `db_instance_class` from `db.t4g.micro` to **`db.t4g.medium`**.
- [ ] Set the pool size explicitly in `DATABASE_URL`:
      `...?connection_limit=10&pool_timeout=20`.
      Budget: `connection_limit × processes per instance × asg_max_size` must stay
      well under RDS `max_connections`. Leave room for migrations and admin
      scripts.
- [ ] Turn on Performance Insights (`performance_insights_enabled = true`, free
      7-day retention) to find slow queries.
- [ ] Add CloudWatch alarms for `CPUUtilization > 70%`, `DatabaseConnections`
      approaching the limit, `FreeableMemory` running low, and `FreeStorageSpace`.
- [ ] Check indexes on the busiest queries: cause listing/discover, leaderboard,
      donations by cause, and notifications.

---

## Phase 5 — One process per instance, CloudFront in front

**Merge PM2 apps** ([`ecosystem.scaled.config.js`](../ecosystem.scaled.config.js)):

- [ ] Replace the two apps (`frontend`:3000, `api`:4000) with one app on port 3000:
      `instances: 2, exec_mode: "cluster"`. `middleware.ts` already splits
      domains by the `Host` header, as [`ecosystem.config.js`](../ecosystem.config.js)
      explains.
- [ ] In `infra/alb.tf`, keep one target group (port 3000) and point both
      hostnames at it. Remove the `api` target group and the port 4000
      ingress rule in `infra/security_groups.tf`.
- [ ] Update `scripts/remote-deploy-scaled.sh`, `scripts/bootstrap-instance.sh`,
      and `scripts/rollback-scaled.sh` for the single process name.

**CloudFront** (`infra/cdn.tf`):

- [ ] Add an `aws_cloudfront_distribution` with the ALB as origin, using the
      `www` and `apps` aliases and an ACM cert in `us-east-1`.
- [ ] Cache behaviors:
  - `/_next/static/*` and public assets: cache for a long time (immutable).
  - `/_next/image*`: cache, with the query string as part of the cache key.
  - Default: `CachingDisabled` + `AllViewerExceptHostHeader`, so auth, server
    actions and dynamic pages pass through to the ALB.
- [ ] Keep the 8 KB request-body WAF limit in mind (see the Sentry comment in
      `next.config.mjs`). Server actions allow 20 MB bodies, so exclude those
      paths from that rule.
- [ ] Optional: limit ALB access to CloudFront only (managed prefix list on
      `aws_security_group.alb`).

---

## Phase 6 — Go live

- [ ] Load-test the full stack in staging. Record p95 latency and the requests
      per second each instance handles.
- [ ] Migrate the database from the single box to RDS (`pg_dump` → `pg_restore`;
      see `scripts/backup-db.sh` / `scripts/sync-db.sh`). Plan a short write freeze.
- [ ] Smoke-test with `deploy-scaled.yml` against the ALB DNS name.
- [ ] Cut DNS over to CloudFront and keep the old box running for about 48h as
      a rollback option.
- [ ] Change `deploy-scaled.yml` to run on push, and retire `deploy.yml`
      (see the comment at the top of `deploy-scaled.yml`).

---

## Phase 7 — Growth milestones (do when the numbers say so)

| Trigger                                                    | Action                                                                                                   |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| ~10k monthly users, or DB CPU > 60% sustained              | `multi_az = true` on RDS (removes the DB single point of failure)                                        |
| Connection count near the limit as the ASG grows           | Add **RDS Proxy** in front of RDS and point `DATABASE_URL` at it                                         |
| Admin analytics or leaderboard slow down other queries     | Add an RDS **read replica** and route reporting queries to it (Prisma `@prisma/extension-read-replicas`) |
| Image rendering (sharp) or email sending causes CPU spikes | Move them to an **SQS queue + worker** (separate small ASG or Lambda)                                    |
| ~100k monthly users, or spiky DB load                      | Migrate to **Aurora PostgreSQL Serverless v2** (the DB scales with load)                                 |
| Abuse or bot traffic                                       | AWS WAF rate-based rules on CloudFront                                                                   |
| Slow scale-out (AMI boot + S3 tarball)                     | Consider moving the app tier to **ECS Fargate**                                                          |

---

## Rough monthly cost (us-east-1, check in the AWS Pricing Calculator)

| Item                                     | Phase 1–5 baseline |
| ---------------------------------------- | ------------------ |
| 2× t4g.medium (1 on-demand + Spot above) | ~$35–50            |
| ALB                                      | ~$20–25            |
| RDS db.t4g.medium single-AZ + 20 GB gp3  | ~$55               |
| ElastiCache cache.t4g.small × 2          | ~$45               |
| CloudFront + S3 + data transfer          | ~$10–30            |
| **Total**                                | **~$165–205**      |

Multi-AZ RDS roughly doubles the database line.
