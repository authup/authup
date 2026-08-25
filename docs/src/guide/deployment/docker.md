# Introduction

This section will help you spin up Authup as a **docker** container.

## Requirements
The following guide is based on some shared assumptions:

- Docker `v20.x` is [installed](https://docs.docker.com/get-docker/)
- Min. `2` cores
- Min. `5G` hard disk
- One available port on the host system if you want to map the service to your local machine (default: `3001`)


## Step. 1: Create a new project

Create and change into a new directory.

```bash
$ mkdir authup && cd authup
```

## Step. 2: Configuration

::: warning
It is important to mention that in the docker environment the configuration for the `PORT` option is ignored.
:::

So when the authup container is run, the rule is as follows:
- The service always runs on the internal port `3000` and can be mounted on another external port (`-p <port>:3000`)


Follow the instructions for [configuring](./configuration.md) Authup using a configuration file or via environment variables.
In case of a configuration file, mount it into the container's working directory using `-v ./authup.server.core.conf:/usr/src/app/authup.server.core.conf`.


## Step. 3: Boot up

One container runs the whole deployment. It serves the API and both consoles:

```shell
docker run \
  -v authup:/var/lib/authup \
  -p 3001:3000 \
  authup/authup:latest server/core start
```

Now all should be set up, and you are ready to go :tada:

This will launch the following with default settings:
- API: `http://localhost:3001/`
- Admin console: `http://localhost:3001/admin`
- Account console: `http://localhost:3001/account`

::: warning The `client/admin-console` service was retired
The admin console used to be a second container. It is now served by
`server/core`, and `client/admin-console start` exits with an error naming
the replacement. See
[Upgrading](./upgrading.md#the-admin-console-is-served-by-server-core).
:::

It is recommended to operate the service behind a reverse proxy. For example [nginx](./nginx.md).
