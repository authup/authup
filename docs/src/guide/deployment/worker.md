# Worker

`authup start` normally runs everything in one process: `server-core` answers
the API, the console services serve their pages on the same listener, and a set
of cron sweeps runs in the background. Those sweeps can be moved into a
separate process, the **worker**, so the API replicas only serve requests. The
consoles can be moved out the same way, an API set running `start core` next
to a console set running `start console`; see
[Console Replicas](./console-replicas.md).

::: tip Wizard
The compose and helm targets of `npm create authup@latest` ask whether the
sweeps run in a worker of their own. Answering yes emits the worker service
shown below; the compose target also sets `WORKER_ENABLED=false` and
`MIGRATION_ENABLED=false` on the API service, while the helm target enables
the chart's worker deployment and its migration job.
:::

The worker is the same image and the same binary, started in a different role:

```bash
authup start worker
```

In a container the command is `start worker`; on bare metal it is a second
`authup` process next to the one running `start`. Without the role the API
runs the worker alongside itself.

## What it runs

The worker process boots the background sweeps and the modules they stand on,
plus one small health listener (see [Health](#health)). It serves no API
request and runs no migration.

Three components run today, each once a minute:

| Component | What it does |
|-----------|--------------|
| OAuth2 cleaner | Removes expired rows from `auth_sessions` and `auth_session_tokens` |
| Event cleaner | Removes expired rows from `auth_events`, per the retention settings |
| Event aggregator | Writes the daily counts in `auth_event_aggregates` the dashboard reads |

The event cleaner is only scheduled while the audit log is on and at least one
applicable retention window is greater than zero; the entity-event window only
counts when `EVENT_LOG_ENTITY_ENABLED` is true as well. The event aggregator
runs while the audit log is on. A deployment with `EVENT_LOG_ENABLED=false`
runs the OAuth2 cleaner alone.

Both delete in bounded batches and stop when another process already removed
the rows they selected, so running the sweeps in more than one process is
safe. It is also pointless: one worker keeps up with any number of API
replicas. Run a single instance.

The worker does not provision. The realms, clients, permissions and the admin
user are still written by the API process on startup.

## When to deploy one

Most deployments do not need a worker. A single `authup start` process
already runs the sweeps, and so does every replica of it.

Deploy a worker when you run more than one API replica and want the sweeps to
happen once rather than N times, or when you want the API replicas to hold no
scheduled work at all, so scaling them up and down never affects retention.

## Health

The worker answers `GET /` (and `HEAD /`) on its own port with a JSON report
of its sweeps, and every other path with 404. There is no routing and no
authentication behind it.

```json
{
    "healthy": true,
    "components": [
        { "name": "oauth2-cleaner", "lastSuccessAt": "2026-09-25T10:00:00.000Z", "overdue": false }
    ]
}
```

The status is 200 while every sweep has completed a pass within the last five
minutes, and 503 once one has not (five missed one-minute ticks, counted from
startup until the first success). A sweep that keeps failing, for example
because the database is unreachable, turns the worker unhealthy.

The port is `core.worker.port` (env `WORKER_PORT`), bound on `core.host`.
Unset, it is the same port as `core.port` (env `PORT`), which is what the
image healthcheck and `authup healthcheck` probe, so a worker container needs
nothing extra. Set `WORKER_PORT` only when the worker runs on the same host
as another role and needs a port of its own; neither probe follows it, so do
not set it in a container that relies on the image healthcheck.

## Turning the sweeps off in the API

`core.worker.enabled` reads the same in both modes. Under the default mode it
says whether the API runs the worker alongside itself, so a plain `start` needs
nothing set. The API side is where you hand the sweeps over:

::: code-group

```dotenv [.env]
WORKER_ENABLED=false
```

```yaml [authup.yml]
core:
  worker:
    enabled: false
```

:::

Set that on every API replica, and only once a worker is actually running. With
it set and no worker, nothing sweeps: expired sessions, tokens and audit events
accumulate until a process that runs the sweeps starts.

Worker mode requires the key. `start worker` refuses to boot while
`core.worker.enabled` is false, naming the key in the error, rather than coming
up idle and sweeping nothing. A worker that reads the same `authup.yml` as the
API replicas therefore has to override it in its own environment:

```dotenv
WORKER_ENABLED=true
```

## Schema ownership

One process must own the schema, and the worker is never that process. It
verifies at startup that no migration is pending and refuses to boot
otherwise, rather than applying DDL of its own. That holds regardless of
`migrationEnabled`, which the worker does not consult. SQLite is the one
exception: it ships no migrations at all, so a SQLite worker synchronizes its
schema like every other process.

So a deployment that adds a worker also has to decide who migrates. The
recommendation is to let neither long-running process do it:

1. Run `authup migration run` (container command: `migration run`)
   as a one-off step, and let it finish.
2. Start the API replicas and the worker.

Set `MIGRATION_ENABLED=false` on the API replicas to make that ordering
explicit. Startup then verifies the schema instead of migrating it, and a
replica that comes up against an out-of-date database fails loudly instead of
racing its siblings for the DDL. The `migration` CLI command is unaffected by
the flag, and SQLite ignores it entirely (it has no migrations and always
synchronizes its schema).

Keeping the default `MIGRATION_ENABLED=true` on the API is fine for a single
replica. It is the multi-replica rollout where concurrent boots would each try
to apply the same migration.

## Docker Compose

The worker is the same image and the same configuration as the API. Give it
the database and Redis settings the API has and add the command. The image
healthcheck works unchanged, since it probes the worker's health listener.

```yaml
version: '3.8'

services:
    server-core:
        image: authup/authup:latest
        container_name: server-core
        restart: unless-stopped
        ports:
            - "3000:3000"
        environment:
            - PUBLIC_URL=http://localhost:3000
            - DB_TYPE=postgres
            - DB_HOST=postgres
            - DB_PORT=5432
            - DB_USERNAME=postgres
            - DB_PASSWORD=postgres
            - DB_DATABASE=postgres
            - REDIS=redis://redis:6379
            # the sweeps run in the worker below
            - WORKER_ENABLED=false
        command: start

    # one instance is enough, whatever the API scales to
    server-core-worker:
        image: authup/authup:latest
        container_name: server-core-worker
        restart: unless-stopped
        environment:
            - DB_TYPE=postgres
            - DB_HOST=postgres
            - DB_PORT=5432
            - DB_USERNAME=postgres
            - DB_PASSWORD=postgres
            - DB_DATABASE=postgres
            - REDIS=redis://redis:6379
        command: start worker
```

The worker needs no published port of its own. It does need the same
database as the API, since the sweeps are plain deletes against the shared
schema. This split is for the server databases (MySQL and Postgres): a SQLite
worker container would open its own database file inside the container and
sweep nothing of the API's data, so a SQLite deployment keeps the sweeps in
the API process instead. Neither container carries a volume: the image keeps
no durable state, and the worker's rotating file logs under
`LOG_DIRECTORY_PATH` are ephemeral without one. Mount `/var/log/authup` to
keep them; the console output for `docker logs` remains either way.

## Kubernetes

The same split, with the migration step as its own object:

- A `Job` running `migration run`, as a pre-install and pre-upgrade
  hook so it completes before the workloads roll.
- The API `Deployment`, with `WORKER_ENABLED=false` and
  `MIGRATION_ENABLED=false`. Any number of replicas.
- The worker `Deployment`, `replicas: 1`, command
  `start worker`, with an `httpGet` readiness probe on `/` at the worker port
  and no liveness probe.
  Give it `WORKER_ENABLED=true` when it shares the API's `ConfigMap`, which
  sets that key to false.

```yaml
readinessProbe:
    httpGet:
        path: /
        port: 3000
    periodSeconds: 30
```

Use the health endpoint for readiness, not liveness. Its most likely 503 is a
database the sweeps cannot reach, which a restart does not fix: as a liveness
probe it would put the pod into a restart loop for as long as the database is
down. As a readiness probe it marks the worker not ready, which surfaces the
failure without killing the process, and the sweeps resume on the next tick
once the database is back. A process that dies is restarted by the kubelet
regardless.
