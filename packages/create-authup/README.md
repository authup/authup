<p align="center">
    <img src="https://raw.githubusercontent.com/authup/authup/master/.github/assets/logo.svg" alt="Authup logo" width="96" height="96" />
</p>

<h1 align="center">create-authup</h1>

<p align="center">
    <b>Answer a few questions and get the deployment files for Authup: docker run, compose, Helm or bare metal.</b><br>
    No hand-assembled env files, no copied compose snippets, no guessing which keys a release understands.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/create-authup"><img src="https://img.shields.io/npm/v/create-authup" alt="npm version" /></a>
    <a href="https://github.com/authup/authup/actions/workflows/main.yml"><img src="https://github.com/authup/authup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a> · <a href="#usage">Usage</a> · <a href="#targets">Targets</a> · <a href="https://authup.org/guide/deployment/">Documentation</a>
</p>

---

## Why create-authup?

A first Authup deployment means picking the right environment variables for the image, wiring a database, deciding on Redis, and getting the details right that only show up later: a public URL that is also the OpenID Connect issuer, a proxy hop count so client addresses cannot be spoofed, secrets that should not be world-readable. The wizard asks for the decisions and writes the files.

| Concern | Without it | With create-authup |
|---|---|---|
| **Configuration keys** | Copied from docs that may describe another release | Its test suite checks every key it writes against the configuration schema and the environment variables of its own release |
| **Versions** | `latest`, or a tag you look up | The image tag and the `authup` dependency are pinned exactly to the wizard's own version |
| **Proxy trust** | Authup's default trusts every `X-Forwarded-For` hop | `TRUST_PROXY` (`core.trustProxy` on bare metal) is written as the number of proxies the deployment has, or `false`; the Helm values leave it to the chart |
| **Secrets** | An env file with the default `0644` mode | Files holding a password are written `0600`, also when overwritten |
| **Scale-out** | A split topology you assemble by hand | Worker and console services as their own containers, with Redis turned on and, for compose, an nginx in front |

## Installation

Nothing to install; run it with npm:

```shell
npm create authup@latest
```

This runs the `create-authup` binary in the current directory. Use `@latest` to scaffold the current release, since the version you run is the version the files pin. The wizard needs Node.js `^22.13.0 || ^23.5.0 || >=24.0.0` and has no runtime dependencies.

## Usage

```shell
npm create authup@latest
npm create authup@latest -- --force
npx create-authup --help
```

| Flag | Description |
|---|---|
| `--force` | Overwrite files that already exist. Without it the wizard lists the conflicts, writes nothing and exits with 1 |
| `--help` | Print the usage |

Any other flag or a positional argument is refused. A file name that exists as a directory is never written over, `--force` or not.

### Questions

Asked in this order, with the default in brackets; some are only asked when they apply:

1. **Deployment target**: `docker`, `compose`, `helm` or `bare-metal` [`compose`], by name or number.
2. **Public URL**: the address a browser reaches Authup at, which is the OpenID Connect issuer and the base of every console URL. No credentials, query or fragment; for `helm` no path either.
3. **cert-manager** (`helm` over https only): request the ingress certificate from cert-manager instead of expecting a `<hostname>-tls` secret [no].
4. **Database**: `postgres` or `mysql`, plus `sqlite` for `bare-metal` [`postgres`]. For `compose` and `helm` it asks whether to run the database alongside Authup [yes]; then only a password is asked. Otherwise: host (`127.0.0.1` on bare metal), port (5432 or 3306), username [`authup`], password and database name [`authup`].
5. **User registration** [no] and **password recovery** [no]. When either is on, the SMTP connection URL (`smtp://` or `smtps://`); with registration on, whether to verify email addresses [yes].
6. **Admin password**: required, 3 to 256 characters, and never `start123`, the provisioning default.
7. **Worker and consoles as separate services** (`compose` and `helm` only) [no, no].
8. **Redis** [no]: asked only when nothing is split, since a split turns it on. `compose` and `helm` use the bundled `redis://redis:6379`; `docker` and `bare-metal` ask for the URL.

Passwords are not echoed on a terminal. A value is refused when it holds a single quote together with a literal `\n` or `\r` sequence, because such a value has no `.env` representation that reads back unchanged.

## Targets

| Target | Files | Next steps the wizard prints |
|---|---|---|
| `docker` | `authup.env` | `docker run -d --name authup --restart unless-stopped --env-file authup.env -p <port>:3000 authup/authup:<version> start` |
| `compose` | `docker-compose.yml`, `.env`, and `nginx.conf` with a console split | `docker compose up -d`, preceded by `docker compose run --rm authup migration run` with a worker split |
| `helm` | `values.yaml` | `helm repo add authup https://helm.authup.org`, `helm install authup authup/authup -f values.yaml` |
| `bare-metal` | `package.json`, `authup.yml`, `.env` | `npm install`, `npx authup config validate`, `npm start` |

- **The port follows the public URL.** An explicit http port (`http://host:8080`) is dialed directly, so it is the port published or listened on. https or a default port means a reverse proxy owns the port, and Authup listens on 3000.
- **Every file carries commented placeholders** for `TRUSTED_ORIGINS`, `SECRETS_ENCRYPTION_KEY` and the configuration file mount.
- **`bare-metal` writes a `package.json`** named `authup-deployment` with `"start": "authup start"` and the `authup` dependency pinned to the wizard's version; the structure goes into `authup.yml` and the secrets into `.env`.

## Notes

- **The `docker` target refuses SQLite.** The image runs in production mode, which refuses the SQLite driver, so the database must exist already; only `bare-metal` offers SQLite.
- **The Helm values name no image tag.** The chart's version decides the release there, and the file states the chart version it needs (0.4.0 or later).
- **A split needs Redis.** With a worker or console split the console sign-in and the token blocklist cross replicas through the cache, so Redis is added and the wizard says so.
- **It only writes files.** Nothing is started; every file it writes runs the `authup` CLI or the `authup/authup` image.

## License

Made with 💚

Published under the [Apache 2.0 License](./LICENSE).
