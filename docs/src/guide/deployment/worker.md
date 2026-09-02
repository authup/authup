# Worker

`server-core` normally runs everything in one process: it serves the API and
the consoles, and it also runs a set of cron sweeps in the background. Those
sweeps can be moved into a separate process, the **worker**, so the API
replicas only serve requests.

The worker is the same image and the same binary, started with a different
subcommand:

```bash
authup worker
```

In a container that is `server/core worker`; on bare metal it is a second
`authup` process next to the one running `start`.

## What it runs

The worker process boots the background components and the modules they stand
on, and nothing else. There is no HTTP listener, so it serves no request and
opens no port.

Two sweeps run today, both once a minute:

| Sweep | What it removes |
|-------|-----------------|
| OAuth2 cleaner | Expired rows from `auth_sessions` and `auth_session_tokens` |
| Event cleaner | Expired rows from `auth_events`, per the retention settings |

The event cleaner is only scheduled while the audit log is on and at least one
applicable retention window is greater than zero; the entity-event window only
counts when `EVENT_LOG_ENTITY_ENABLED` is true as well. A deployment with
`EVENT_LOG_ENABLED=false` runs the OAuth2 cleaner alone.

Both delete in bounded batches and stop when another process already removed
the rows they selected, so running the sweeps in more than one process is
safe. It is also pointless: one worker keeps up with any number of API
replicas. Run a single instance.

The worker does not provision. The realms, clients, permissions and the admin
user are still written by the API process on startup.

## When to deploy one

Most deployments do not need a worker. A single `server/core start` process
already runs the sweeps, and so does every replica of it.

Deploy a worker when you run more than one API replica and want the sweeps to
happen once rather than N times, or when you want the API replicas to hold no
scheduled work at all, so scaling them up and down never affects retention.

## Turning the sweeps off in the API

The worker forces its components on, whatever the configuration says. The API
side is where you switch them off:

::: code-group

```dotenv [.env]
COMPONENTS_ENABLED=false
```

```yaml [authup.yml]
core:
  componentsEnabled: false
```

:::

Set that on every API replica, and only once a worker is actually running. With
it set and no worker, nothing sweeps: expired sessions, tokens and audit events
accumulate until a process that runs the components starts.

## Schema ownership

One process must own the schema, and the worker is never that process. It
verifies at startup that no migration is pending and refuses to boot
otherwise, rather than applying DDL of its own. That holds regardless of
`migrationEnabled`, which the worker does not consult. SQLite is the one
exception: it ships no migrations at all, so a SQLite worker synchronizes its
schema like every other process.

So a deployment that adds a worker also has to decide who migrates. The
recommendation is to let neither long-running process do it:

1. Run `authup migration run` (container: `server/core migration run`)
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
the database and Redis settings the API has, add the command, and take away
the healthcheck: the image probes an HTTP port the worker does not open, so
the container would be reported unhealthy forever.

```yaml
version: '3.8'

volumes:
    authup:

services:
    server-core:
        image: authup/authup:latest
        container_name: server-core
        restart: unless-stopped
        volumes:
            - authup:/var/lib/authup
        ports:
            - "3001:3000"
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
            - COMPONENTS_ENABLED=false
        command: server/core start

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
        # the image healthcheck probes an HTTP port this process never opens
        healthcheck:
            disable: true
        command: server/core worker
```

The worker needs no volume and no published port. It does need the same
database as the API, since the sweeps are plain deletes against the shared
schema. This split is for the server databases (MySQL and Postgres): a SQLite
worker container would open its own database file inside the container and
sweep nothing of the API's data, so a SQLite deployment keeps the components
in the API process instead. Note the worker's rotating file logs under
`WRITABLE_DIRECTORY_PATH` are ephemeral without a volume; the console output
for `docker logs` remains.

## Kubernetes

The same split, with the migration step as its own object:

- A `Job` running `server/core migration run`, as a pre-install and pre-upgrade
  hook so it completes before the workloads roll.
- The API `Deployment`, with `COMPONENTS_ENABLED=false` and
  `MIGRATION_ENABLED=false`. Any number of replicas.
- The worker `Deployment`, `replicas: 1`, command `server/core worker`, with
  no readiness or liveness HTTP probe.

Leaving the worker without probes is deliberate. There is no port to probe, and
a liveness probe over `exec` would add little: the sweeps are scheduled inside
the process, and a process that dies is restarted by the kubelet regardless.
What is worth watching is the log, since a sweep that keeps failing (a lost
database connection, for example) is caught and retried on the next tick rather
than crashing the process.
