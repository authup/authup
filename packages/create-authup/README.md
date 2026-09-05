# create-authup

Interactive wizard writing the deployment files for one authup installation: a `docker run` env file, a docker compose project, helm values, or a bare-metal project.

`npm create authup@latest` (npm resolves the `create-authup` package) asks a
handful of questions and writes the files for one of four targets into the
current directory. It scaffolds only. The `authup` CLI, or the `authup/authup`
image, is what runs the result; every file it writes does nothing but invoke
one of the two.

| Target | Files written | Next step |
|---|---|---|
| `docker` | `authup.env` | `docker run --env-file authup.env -p 3000:3000 authup/authup:<version> start` |
| `compose` | `docker-compose.yml`, `.env` | `docker compose up -d` (with a worker split, `docker compose run --rm authup migration run` first) |
| `helm` | `values.yaml` | `helm repo add authup https://helm.authup.org`, then `helm install authup authup/authup -f values.yaml` |
| `bare-metal` | `package.json`, `authup.yml`, `.env` | `npm install`, `npx authup config validate`, `npm start` |

The prompt flow asks for the target, the public URL (the issuer, from which
every console url derives), the database (postgres or mysql, bundled alongside
or external; sqlite for bare metal only), whether registration and password
recovery are on and, when either is, the SMTP connection URL, the admin
password (the provisioning default `start123` and an empty value are refused),
and for compose and helm whether the worker and the consoles run as their own
services. Any split turns redis on, since a sign-in then crosses two API
replicas through the cache; otherwise redis is a question of its own.

Two flags: `--force` overwrites files that already exist (without it the
conflicts are listed, nothing is written and the process exits 1), `--help`
prints the usage.

Versions are pinned to the wizard's own version: the image tag and the npm
range are both `pkg.version`, never `latest`, so run `npm create authup@latest`
to scaffold the current release. An emitted `authup.yml` is checked with
`npx authup config validate`.

The package holds zero runtime dependencies: prompts ride
`node:readline/promises`, flags `node:util.parseArgs`, and every emitted
document is a plain string template. It never runs a service.

The deployment guides describe each target in full:
https://authup.org/guide/deployment/
