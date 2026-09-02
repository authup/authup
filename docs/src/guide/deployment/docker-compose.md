# Introduction

This section will help you set up Authup in a **docker-compose** environment.

## Requirements
The following guide is based on some shared assumptions:

- Min. `2` cores
- Min. `5G` hard disk
- Docker `v20.x` is [installed](https://docs.docker.com/get-docker/)
- One available port on the host system if you want to map the service to your local machine (default: `3000`)
- This guide assumes [Compose v2](https://docs.docker.com/compose/compose-file/)



## Quick Start

This section contains multiple examples for how to deploy and configure authup using docker-compose. The different 
examples show how to configure authup using the options described in the [configuration](./configuration) section. Simply
paste and modify the example you want to use into a `docker-compose.yml` file.

The following example shows a sensible default configuration for getting started with Authup.
This starts the one service a deployment needs: `server/core` serves the API and both consoles
(the admin console at `/console/admin`, the account console at `/console/account`).

```yaml
version: '3.8'

volumes:
    authup:

services:
  server-core:
      image: authup/authup:latest
      pull_policy: always
      container_name: server-core
      restart: unless-stopped
      volumes:
        # Docker managed volume
        - authup:/var/lib/authup
        # storage in mounted volume
        #- ./writable:/var/lib/authup
      ports:
        - "3001:3000"
      environment:
        - PUBLIC_URL=http://localhost:3000
      command: server/core start
      networks:
          authup:

networks:
    authup:
        driver: bridge
        driver_opts:
            com.docker.network.bridge.name: authup
        ipam:
            driver: default
            config:
                - subnet: 172.23.1.0/24
```

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
`NUXT_PUBLIC_*` environment variables. See
[Upgrading](./upgrading.md#the-admin-console-is-served-by-server-core).
:::

## Configuration

The following examples show different ways to configure and use the Authup service using docker-compose. For more general
information about how to configure Authup, see the [configuration](./configuration) section.

## Reverse Proxy

It is recommended to operate the service behind a reverse proxy. For example [nginx](./nginx.md).

### Environment variables

The following example shows how to configure the Authup service using environment variables. This will start only the
main backend service and forward it to the port `3001` on the local machine.

```yaml
version: '3.8'

volumes:
    authup:

services:
  authup:
    image: authup/authup:latest
    container_name: authup
    restart: unless-stopped
    volumes:
      - authup:/var/lib/authup
    ports:
      - "3001:3000"
    environment:
        - PUBLIC_URL=http://localhost:3000
        - USER_ADMIN_PASSWORD=test-password
    command: server/core start
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
configuration file is mounted into the container under `/usr/src/app` which is the default location for 
configuration files.

```yaml
version: '3.8'

services:
  authup:
    image: authup/authup:latest
    container_name: authup
    restart: unless-stopped
    volumes:
      - ./authup.yml:/usr/src/app/authup.yml
    ports:
      - "3001:3000"
    environment:
      - PUBLIC_URL=http://localhost:3000
    command: server/core start

```


### Multiple services

This shows an example of how to run authup alongside other services (postgres & redis) and connect to them.

```yaml
version: '3.8'

volumes:
    authup_data:
    postgres_data:
    redis_data:

services:
    server-core:
        image: authup/authup:latest
        container_name: server-core
        restart: unless-stopped
        volumes:
            - authup_data:/var/lib/authup
        ports:
            - "3001:3000"
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
        command: server/core start

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


