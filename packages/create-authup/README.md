# create-authup

Interactive wizard writing the deployment files for one authup installation: a `docker run` env file, a docker compose project, helm values, or a bare-metal project.

`npm create authup@latest` (npm resolves the `create-authup` package) asks a
handful of questions and writes the files for one of four targets into the
current directory. It scaffolds only. The `authup` CLI, or the `authup/authup`
image, is what runs the result; every file it writes does nothing but invoke
one of the two.

| Target | Files written | Next step |
|---|---|---|
| `docker` | `authup.env` | `docker run -d --name authup --restart unless-stopped --env-file authup.env -p <port>:3000 authup/authup:<version> start` |
| `compose` | `docker-compose.yml`, `.env` (plus `nginx.conf` and an nginx service under a console split) | `docker compose up -d` (with a worker split, `docker compose run --rm authup migration run` first) |
| `helm` | `values.yaml` | `helm repo add authup https://helm.authup.org`, then `helm install authup authup/authup -f values.yaml` |
| `bare-metal` | `package.json`, `authup.yml`, `.env` | `npm install`, `npx authup config validate`, `npm start` |

The prompt flow asks for the target, the public URL (the issuer, from which
every console url derives), the database (postgres or mysql, bundled alongside
or external; sqlite for bare metal only), whether registration and password
recovery are on and, when either is, the SMTP connection URL and whether
registration verifies email addresses, the admin password (the provisioning
default `start123`, a blank value and a value carrying both quote kinds are
refused; passwords are not echoed while typed), for helm over https whether
cert-manager issues the certificate, and for compose and helm whether the
worker and the consoles run as their own services. Any split turns redis on,
since a sign-in then crosses two API replicas through the cache; otherwise
redis is a question of its own.

The public URL decides two more things without a question. An explicit http
port is dialed directly, so it becomes the published or listen port; https or
a default port means a reverse proxy in front, and the listener stays on 3000.
`TRUST_PROXY` (`core.trustProxy` on bare metal) is written as the number of
proxies the deployment knows about, or `false` when nothing is in front, since
authup's own default trusts every `X-Forwarded-For` hop. Every emitted file
carries commented placeholders for `TRUSTED_ORIGINS`, `SECRETS_ENCRYPTION_KEY`
and the configuration file mount, so the options a real deployment reaches for
next are one uncomment away.

Two flags: `--force` overwrites files that already exist (without it the
conflicts are listed, nothing is written and the process exits 1), `--help`
prints the usage.

Versions are pinned to the wizard's own version: the image tag and the
`authup` dependency are both exactly `pkg.version`, never `latest` and never a
range, so run `npm create authup@latest` to scaffold the current release. Helm
is the exception and names no tag at all: the chart's `appVersion` owns the
image, so the chart version is what selects the release there. An emitted
`authup.yml` is checked with `npx authup config validate`, and the emitted helm
values are validated in this package's test suite against the chart's own
`values.schema.json`, vendored under `test/fixtures/`.

The package holds zero runtime dependencies: prompts ride
`node:readline/promises`, flags `node:util.parseArgs`, and every emitted
document is a plain string template. It never runs a service.

The deployment guides describe each target in full:
https://authup.org/guide/deployment/
