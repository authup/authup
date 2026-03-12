# Introduction

This section will help you spin up Authup as a **docker** container.

## Requirements
The following guide is based on some shared assumptions:

- Docker `v20.x` is [installed](https://docs.docker.com/get-docker/)
- Min. `2` cores
- Min. `5G` hard disk
- Up to two available ports on the host system if you want to map the services to your local machine (default: `3000` and `3001`)


## Step. 1: Create a new project

Create and change into a new directory.

```bash
$ mkdir authup && cd authup
```

## Step. 2: Configuration

::: warning
It is important to mention that in the docker environment the configuration for the `PORT` option is ignored.
:::

So when authup container is run, the rules are as follows:
- If only **one service** is started, it always runs on the internal port `3000` and can be mounted on another external port ( `-p <port>:3000`)


Follow the instructions for [configuring](./configuration.md) Authup using a configuration file or via environment variables.
In case of a configuration file, place it in the root directory.


## Step. 3: Boot up

To start each service, the following command should be executed depending on the service:

**`API`**
```shell
docker run \
  -v authup:/usr/src/writable \
  -p 3001:3000 \
  authup/authup:latest server/core start
```

**`UI`**
```shell
docker run \
  -p 3000:3000 \
  authup/authup:latest client/web start
```

Now all should be set up, and you are ready to go :tada:

This will lunch the following application with default settings:
- UI: `http://localhost:3000/`
- API: `http://localhost:3001/`

It is recommended to operate the services behind a reverse proxy. For example [nginx](./nginx.md).
