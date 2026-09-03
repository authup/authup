# Introduction

This section will help you spin up Authup as a **docker** container.

## Requirements
The following guide is based on some shared assumptions:

- Docker `v20.x` is [installed](https://docs.docker.com/get-docker/)
- Min. `2` cores
- Min. `5G` hard disk
- One available port on the host system if you want to map the service to your local machine (default: `3000`)
- A reachable PostgreSQL or MySQL database. The image runs in production mode, which does not support SQLite, so it does not start until a server database is configured, via `DB_*` or a `db:` block in `authup.yml` (see [Database](./configuration-server-core-database.md)). The [Boot up](#step-3-boot-up) example below brings one up alongside Authup
- This guide assumes [Compose v2](https://docs.docker.com/compose/compose-file/)


## Step. 1: Create a new project

Create and change into a new directory.

```bash
$ mkdir authup && cd authup
```

## Step. 2: Configuration

`PORT` and `HOST` are honored inside the container. The image defaults them to
`3000` and `0.0.0.0`, so the rule when the container is run is as follows:
- The API listens on port `3000` and the examples publish it unchanged (`"3000:3000"`). Setting `PORT=4000` under `environment` moves the listener to `4000`, so the mapping must follow it (`"4000:4000"`); the built-in healthcheck follows `PORT` on its own, and the image's `EXPOSE 3000` is metadata that pins nothing. The `start console` role is the exception: each console binds its own port (`3020` auth, `3021` admin, `3022` account), see [Console Replicas](./console-replicas.md).
- **Publish the port the listener binds.** A mapping that publishes a different port (`"8080:3000"`) leaves `PUBLIC_URL` naming a port nothing listens on inside the container, and the auth console renders its pages by calling the API at that address, so `/console/auth/*` answers `502` while the API and the two static consoles work. To publish on a different host port, move the listener with `PORT` and map that port to itself.


Follow the instructions for [configuring](./configuration.md) Authup using a configuration file or via environment variables.
In case of a configuration file, mount it at `/etc/authup/authup.yml` with a `volumes` entry on the `authup` service.


## Step. 3: Boot up

One authup container runs the whole deployment. It serves the API and every
console, with PostgreSQL alongside it:

```yaml
version: '3.8'

volumes:
    postgres_data:

services:
    authup:
        image: authup/authup:latest
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
        restart: unless-stopped
        volumes:
            - postgres_data:/var/lib/postgresql/data
        environment:
            - POSTGRES_PASSWORD=postgres
            - POSTGRES_USER=postgres
            - POSTGRES_DB=postgres
```

Start it with:

```bash
docker compose up -d
```

The authup image keeps no durable state, so there is nothing to persist: every
durable value lives in the database. Mount `/etc/authup` to supply the
configuration file and the provisioning directory, and `/var/log/authup` only
if you want the log files outside the container. The console transport writes
to stdout regardless, so `docker compose logs` works without it.

The container command is the CLI's own argument list (`start`, `start worker`,
`migration run`, ...), and `start` is the image's default command. The former
`server/core` prefix is deprecated: it is still accepted with a notice on
stderr for the rest of the 1.0.0-beta line and is removed in v1.0.0.

`PUBLIC_URL` is the address the browser reaches the container at, and the
consoles derive the API address from it, so it must name the published port.
That is the same port the listener binds, per the rule in Step 2.

Now all should be set up, and you are ready to go :tada:

It serves:
- API: `http://localhost:3000/`
- Auth console (login, consent, register, password recovery): served under `http://localhost:3000/console/auth/`
- Admin console: `http://localhost:3000/console/admin`
- Account console: `http://localhost:3000/console/account`

::: warning The `client/admin-console` service was retired
The admin console used to be a second container. It is now a console service
composed into `start`, and `client/admin-console start` is an unknown command
to the CLI, which prints its usage and exits `1`. See [Upgrading](./upgrading.md).
:::

It is recommended to operate the service behind a reverse proxy. For example [nginx](./nginx.md).
