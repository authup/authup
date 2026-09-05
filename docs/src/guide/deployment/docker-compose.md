# Introduction

This section will help you set up Authup in a **docker-compose** environment.

::: tip Wizard
`npm create authup@latest` writes a `docker-compose.yml` plus the `.env` holding
its secrets from a few prompts (public URL, bundled or external database, admin
password, mail). Answering yes to the worker or console split adds the services
described in [Worker](./worker.md) and [Console Replicas](./console-replicas.md).
:::

## Requirements
The following guide is based on some shared assumptions:

- Min. `2` cores
- Min. `5G` hard disk
- Docker `v20.x` is [installed](https://docs.docker.com/get-docker/)
- One available port on the host system if you want to map the service to your local machine (default: `3000`)
- A reachable PostgreSQL or MySQL database. The image runs in production mode, which does not support SQLite, so it does not start until a server database is configured, via `DB_*` or a `db:` block in `authup.yml`. The [Quick Start](#quick-start) example below brings one up alongside Authup
- This guide assumes [Compose v2](https://docs.docker.com/compose/compose-file/)



## Quick Start

This section contains multiple examples for how to deploy and configure authup using docker-compose. The different 
examples show how to configure authup using the options described in the [configuration](./configuration) section. Simply
paste and modify the example you want to use into a `docker-compose.yml` file.

The following example shows a sensible default configuration for getting started with Authup.
This starts the one Authup container a deployment needs: `start` runs the API
and every console on one listener (the auth console at `/console/auth`, the admin
console at `/console/admin`, the account console at `/console/account`). To run the
consoles as their own service instead, see
[Console Replicas](./console-replicas.md). The `command` is the CLI's own
argument list; `start` is also the image's default command, and the former
`server/core` prefix is deprecated (accepted with a notice on stderr for the
rest of the 1.0.0-beta line, removed in v1.0.0).

The Authup container carries no volume, because the image keeps no durable
state: every durable value lives in the database. The volume in the example
below belongs to the `postgres` service. Mount `/etc/authup` to supply the
configuration file and the provisioning directory (see the examples below),
and `/var/log/authup` only if you want the log files outside the container.
The console transport writes to stdout regardless, so `docker compose logs`
works without it.

```yaml
version: '3.8'

volumes:
    postgres_data:

services:
  server-core:
      image: authup/authup:latest
      pull_policy: always
      container_name: server-core
      restart: unless-stopped
      ports:
        - "3000:3000"
      depends_on:
        - postgres
      environment:
        - PUBLIC_URL=http://localhost:3000
        - DB_TYPE=postgres
        - DB_HOST=postgres
        - DB_PORT=5432
        - DB_USERNAME=postgres
        - DB_PASSWORD=postgres
        - DB_DATABASE=postgres
      command: start

  postgres:
      image: postgres:14
      container_name: postgres
      restart: unless-stopped
      volumes:
        - postgres_data:/var/lib/postgresql/data
      environment:
        - POSTGRES_PASSWORD=postgres
        - POSTGRES_USER=postgres
        - POSTGRES_DB=postgres
```

The credentials above are placeholders that let the example run as pasted. The
`postgres` service publishes no host port, so it is reachable only from the
compose network, but change both halves of the pair before this is anything but
a local trial.

Then start the service using the following command:

```bash
docker compose up -d
```

and check the logs using:

```bash
docker compose logs -f
```

::: warning The `client/admin-console` service was retired
Earlier versions of this example ran a second container for the admin
console. That service no longer exists: remove it, and remove its
`NUXT_PUBLIC_*` environment variables. See [Upgrading](./upgrading.md).
:::

## Configuration

The following examples show different ways to configure and use the Authup service using docker-compose. For more general
information about how to configure Authup, see the [configuration](./configuration) section.

## Reverse Proxy

It is recommended to operate the service behind a reverse proxy. For example [nginx](./nginx.md).

### Environment variables

The following example shows how to configure the Authup service using environment variables, forwarding it to port
`3000` on the local machine.

This example shows only the keys under discussion. Add the `postgres` service,
its top-level `volumes` entry and the `DB_*` variables from the
[Quick Start](#quick-start) to make it start.

```yaml
version: '3.8'

services:
  authup:
    image: authup/authup:latest
    container_name: authup
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
        - PUBLIC_URL=http://localhost:3000
        - USER_ADMIN_PASSWORD=test-password
    command: start
```


### Configuration file

This example shows how to configure the main backend service with non-default
values via a mounted configuration file.

Create a file called `authup.yml` and store it in the same directory. Paste the following content into
the file which will configure the admin user of the API service (the options a service
reads live in its own section, see [configuration](./configuration); environment
variables override file values):

```yaml
core:
  userAdminPassword: test-password
```

In the following compose file example you can see that the
configuration file is mounted into the container under `/etc/authup`, which is where the image
reads it from.

This example shows only the keys under discussion. Add the `postgres` service,
its top-level `volumes` entry and the `DB_*` variables from the
[Quick Start](#quick-start) to make it start.

```yaml
version: '3.8'

services:
  authup:
    image: authup/authup:latest
    container_name: authup
    restart: unless-stopped
    volumes:
      - ./authup.yml:/etc/authup/authup.yml
    ports:
      - "3000:3000"
    environment:
      - PUBLIC_URL=http://localhost:3000
    command: start

```


### Additional services

The Quick Start above already runs a database. This shows how to add further services, such as redis, and
connect authup to them.

```yaml
version: '3.8'

volumes:
    postgres_data:
    redis_data:

services:
    server-core:
        image: authup/authup:latest
        container_name: server-core
        restart: unless-stopped
        ports:
            - "3000:3000"
        depends_on:
            - postgres
            - redis
        environment:
            - PUBLIC_URL=http://localhost:3000
            - DB_TYPE=postgres
            - DB_HOST=postgres
            - DB_PORT=5432
            - DB_USERNAME=postgres
            - DB_PASSWORD=postgres
            - DB_DATABASE=postgres
            - REDIS=redis://redis:6379
        command: start

    postgres:
        image: postgres:14
        container_name: postgres
        restart: unless-stopped
        volumes:
            - postgres_data:/var/lib/postgresql/data
        environment:
            - POSTGRES_PASSWORD=postgres
            - POSTGRES_USER=postgres
            - POSTGRES_DB=postgres

    redis:
        image: redis:latest
        container_name: redis
        restart: unless-stopped
        volumes:
            - redis_data:/data

```

## Troubleshooting
### Authup not reachable for redirect in other services
If you would like to access the Authup instance and your operations require a redirect to the Authup instance, you need to
set the `PUBLIC_URL` environment variable to the service name and port of the Authup service (i.e. `authup:3000`). This will
allow the compose network to resolve the service name to the correct IP address.


