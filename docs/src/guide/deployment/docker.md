# Introduction

This section will help you spin up Authup as a **docker** container.

## Requirements
The following guide is based on some shared assumptions:

- Docker `v20.x` is [installed](https://docs.docker.com/get-docker/)
- Min. `2` cores
- Min. `5G` hard disk
- One available port on the host system if you want to map the service to your local machine (default: `3000`)


## Step. 1: Create a new project

Create and change into a new directory.

```bash
$ mkdir authup && cd authup
```

## Step. 2: Configuration

`PORT` and `HOST` are honored inside the container. The image defaults them to
`3000` and `0.0.0.0`, so the rule when the container is run is as follows:
- By default the API listens on the internal port `3000` and is published on another external port with `-p <port>:3000`. Setting `-e PORT=4000` moves the listener, and the built-in healthcheck follows `PORT`; the image's `EXPOSE 3000` is metadata and pins nothing. The `start console` role is the exception: each console binds its own port (`3020` auth, `3021` admin, `3022` account), see [Console Replicas](./console-replicas.md).


Follow the instructions for [configuring](./configuration.md) Authup using a configuration file or via environment variables.
In case of a configuration file, mount it into the container's working directory using `-v ./authup.yml:/usr/src/app/authup.yml`.


## Step. 3: Boot up

One container runs the whole deployment. It serves the API and every console:

```shell
docker run \
  -v authup:/var/lib/authup \
  -p 3001:3000 \
  -e PUBLIC_URL=http://localhost:3001 \
  authup/authup:latest start
```

The container command is the CLI's own argument list (`start`, `start worker`,
`migration run`, ...), and `start` is the image's default command. The former
`server/core` prefix is deprecated: it is still accepted with a notice on
stderr for the rest of the 1.0.0-beta line and is removed in v1.0.0.

`PUBLIC_URL` is the address the browser reaches the container at. The
consoles derive the API address from it, so with the port published as
`3001` it must name `3001`, not the container-internal `3000`.

Now all should be set up, and you are ready to go :tada:

This will launch the following with default settings:
- API: `http://localhost:3001/`
- Auth console (login, consent, register, password recovery): `http://localhost:3001/console/auth`
- Admin console: `http://localhost:3001/console/admin`
- Account console: `http://localhost:3001/console/account`

::: warning The `client/admin-console` service was retired
The admin console used to be a second container. It is now a console service
composed into `start`, and `client/admin-console start` is an unknown command
to the CLI, which prints its usage and exits `1`. See [Upgrading](./upgrading.md).
:::

It is recommended to operate the service behind a reverse proxy. For example [nginx](./nginx.md).
