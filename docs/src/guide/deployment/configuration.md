# Configuration

The configuration is similar for both Bare Metal and Docker variants.
In both cases, configuration can be done via configuration file, environment variables, or both.

In general **no** configuration file is required!
All options have either sensible default values or are generated automatically 🔥.

## Layers & Precedence

Configuration is layered. From lowest to highest precedence:

1. **Built-in defaults**
2. **Configuration file(s)**
3. **Environment variables** — an environment variable always beats the file value for the same option.

A variable set to an empty value counts as unset, so it leaves the file value (or
the default) standing rather than overriding it with nothing. To turn an optional
service off, say so: `REDIS=false`, not `REDIS=`.

## Configuration File

One file holds the configuration: `authup.yml`, discovered in the **current working
directory** of the process. Every CLI command (`start`, `core`, `console`,
`migration`, `healthcheck`, `config`) honors it, and the lookup can be redirected with
two global CLI flags:

- `--configDirectory <path>`: directory to search instead of the cwd.
- `--configFile <path>`: load one (or more) explicit file(s) instead of discovering.

`migration generate` is the one exception: it is a development tool for a
repository checkout, targets the local compose databases and ignores both flags.

The extensions discovered are `yml`, `yaml`, `json`, `js`, `mjs`, `cjs`, `ts` and
`mts`. Some options (nested middleware option objects, custom logger setups, ...)
cannot be expressed in YAML: use the `js`/`ts` variant for those.

Deployment-wide options sit at the top level, and everything a single service reads
sits in that service's own section. `server/core` reads `core`; each console
service reads `authConsole`, `adminConsole` or `accountConsole`,
plus the top level and `theme`. One document configures all of them, whether they run
in one process (`authup start`) or in several:

```yaml
# yaml-language-server: $schema=https://authup.org/schema/config.json
publicUrl: https://idp.example.com
env: production

db:
  type: postgres
  host: 127.0.0.1
redis: redis://127.0.0.1
smtp:
  host: smtp.example.com

trustedOrigins:
  - https://app.example.com

theme:
  directoryPath: /etc/authup/theme

core:
  port: 3000
  host: 0.0.0.0
  registrationEnabled: true
adminConsole:
  enabled: true
accountConsole:
  enabled: true
```

The first line is a comment for your editor. A YAML language server resolves the
schema from it and gives you completion and validation while you type; the same
document is printed by `authup config schema`.

Every option not documented as living elsewhere belongs under `core`. The
[server/core page](./configuration-server-core) shows each option at its place.

A `client.admin-console` section is no longer read. The admin console is served by
`@authup/server-admin-console` and configured under `adminConsole`; see
[Admin Console](./configuration-client-admin-console).

::: warning YAML has teeth
Two kinds of value need quoting, and neither of them fails loudly:

- A scalar starting with `*` is an **alias reference**, not a string. A bare-host
  wildcard origin has to be quoted: `- "*.example.com"`.
- `no`, `yes`, `on` and `off` are **booleans** in YAML 1.1 parsers. This is the
  Norway problem: the country code `no` reads back as `false`. Quote any password,
  host or name that happens to look like one: `"no"`.

The `$schema` line above and `authup config validate` catch most of it before a
deployment does.
:::

## Checking the Configuration

Two commands read exactly what the server reads:

```shell
$ authup config validate
$ authup config schema
```

`authup config validate` loads the configuration file and the environment, normalizes
the result and reports what does not hold: one line per issue, exit code `1`. A
configuration that holds prints nothing and exits `0`. Both CLI flags apply, so a file
can be checked before it is deployed.

It reports an option the file places where nothing reads it, too. The server itself
skips such a key in silence, so that a file written for a newer version still boots,
which makes an option left at a retired location indistinguishable from one that was
never set. A key prefixed `x-` is never reported, so a document shared with another
tool can carry its own.

`authup config schema` prints the JSON Schema (draft-07) document describing the file:
every option at its place in the tree, with its description, its default and the name of
its environment variable (`x-authup-env`). It covers the whole document, the sections a
console service reads included, and it is what gets published at the URL the `$schema`
line above names.

## Component-Wise

- [server/core](./configuration-server-core) This page describes the configuration of the main backend service.
- [Admin Console](./configuration-client-admin-console) This page describes the administration console service, published at `/console/admin`, and how to host its bundle standalone.
- [Account Console](./account-console) This page describes the self-service console service, published at `/console/account`.
