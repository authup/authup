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

## Configuration Files

Configuration files are discovered in the **current working directory** of the process.
Every CLI command (`start`, `migration`, `healthcheck`) honors them, and the lookup
can be redirected with two global CLI flags:

- `--configDirectory <path>` (alias `-cD`) — directory to search instead of the cwd.
- `--configFile <path>` (alias `-cF`) — load one (or more) explicit file(s) instead of discovering.

Two file naming styles are supported (formats: `.conf`, `.json`, `.yml`/`.yaml`, `.js`, `.ts`):

- **Multi-section file** — `authup.conf`: one file for the whole stack, with options
  namespaced per component (`server.core.*`, `client.admin-console.*`). This is the natural
  companion of the `authup` quickstart CLI, which starts both services from one file.
- **Per-component file** — `authup.server.core.conf` / `authup.client.admin-console.conf`:
  the filename carries the namespace, so keys inside are flat.

In `.conf` files, keys are the camelCase option names and dots express nesting:

::: code-group

```dotenv [authup.conf]
server.core.port=3001
server.core.publicUrl=http://localhost:3001

client.admin-console.port=3000

# shared infrastructure sections (apply to server.core)
db.type=postgres
db.host=127.0.0.1
redis=redis://127.0.0.1
```

```dotenv [authup.server.core.conf]
port=3001
publicUrl=http://localhost:3001

db.type=postgres
db.host=127.0.0.1
redis=redis://127.0.0.1
```
:::

The infrastructure options `db`, `redis` & `smtp` may be declared at the top level
(shared), under `server.*` or under `server.core.*` — the most specific declaration wins.

Some options (nested middleware option objects, custom logger setups, ...) cannot be
expressed as flat strings — use the `.js`/`.ts` file variant for those.

## Component-Wise

- [server/core](./configuration-server-core) This page describes the configuration of the main backend service.
- [client/admin-console](./configuration-client-admin-console) This page describes the configuration of the main frontend service.
