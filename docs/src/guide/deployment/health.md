# Health endpoints

Every authup listener answers two anonymous paths, `GET` and `HEAD` alike:

| Path | Question | Use it for |
|------|----------|------------|
| `/livez` | Does the process answer? | A liveness probe: failing it restarts the process |
| `/readyz` | Can the process serve? | A readiness probe, a load balancer health check, `depends_on: service_healthy` |

Both answer 200 or 503 with a small JSON report and `Cache-Control: no-store`.
The report names each check and whether it passed, and nothing else: no
version and no error text.

```json
{
    "healthy": false,
    "checks": [
        { "name": "database", "ok": false },
        { "name": "shutdown", "ok": true }
    ]
}
```

`GET /` on the API stays the status document. It never checks a dependency,
so do not probe it.

## What each role checks

| Role | `/livez` fails when | `/readyz` fails when |
|------|---------------------|----------------------|
| API (`authup start`, `authup start core`) | never | the database does not answer within one second, or the process received its stop signal |
| Worker (`authup start worker`) | a sweep is hung (one pass running for more than 30 minutes) | a sweep is overdue (five minutes without a completed pass) or hung |
| Consoles (`authup start console`) | never | never |

`/livez` deliberately checks no dependency. A database outage is not fixed by
a restart, and a liveness probe that fails on it would restart every replica
in a loop for as long as the outage lasts.

Redis is not a readiness check. It is shared by every replica, so failing on
it would take all of them out of rotation at once. A Redis outage is logged
instead.

A console reports no dependency of its own. When the API is unreachable, the
page renders that error; the console itself can still serve.

The database result is reused for one second, so probing more often than that
does not add load.

## During startup

The listener binds last, after database migrations and provisioning, so
neither path answers while the process boots. Give an orchestrator a startup
window that covers your longest migration:

- Kubernetes: a `startupProbe` on `/livez` whose `failureThreshold` times
  `periodSeconds` exceeds it. Liveness is not evaluated until it passes. Use
  `/livez`, not `/readyz`: once the listener is up, a database outage must
  not count against the startup window and restart the pod.
- Docker: the image `HEALTHCHECK` allows ten retries ten seconds apart.

Running migrations as their own step (`authup migration run`, with
`MIGRATION_ENABLED=false` on the API) keeps the boot short. See the
[Worker](./worker.md) guide.

## During shutdown

On `SIGTERM` or `SIGINT` the API's `/readyz` answers 503 at once. By default
the listener closes right after. Set `core.shutdownDelay` (env
`SHUTDOWN_DELAY`, seconds) to keep serving for that long first, so a load
balancer notices the 503 and stops routing to the process before its socket
closes:

```dotenv
SHUTDOWN_DELAY=5
```

The orchestrator's stop timeout has to exceed the delay plus the teardown
(`terminationGracePeriodSeconds` in Kubernetes, `stop_grace_period` in
Compose). A second signal during the delay exits immediately.

## Probes

`authup healthcheck` and the image `HEALTHCHECK` request `/readyz` on
`core.port`. Kubernetes probes for the API:

```yaml
startupProbe:
    httpGet:
        path: /livez
        port: 3000
    periodSeconds: 5
    failureThreshold: 60
livenessProbe:
    httpGet:
        path: /livez
        port: 3000
    periodSeconds: 30
readinessProbe:
    httpGet:
        path: /readyz
        port: 3000
    periodSeconds: 10
```

Under Docker Swarm or an autoheal container, which replace an unhealthy
container, the image healthcheck turns a database outage into a restart loop.
Override it there with a check against `/livez`.
