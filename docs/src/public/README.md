# Public assets

Files in this directory are served from the root of the docs site.

## Generated: `schema/config.json`

The JSON Schema of `authup.yml`, served at `https://authup.org/schema/config.json`
so the `# yaml-language-server: $schema=` line of a configuration file resolves.

It is GENERATED from the server-core config registry, not hand-edited. Rebuild it
with `npm run build:config-schema -w apps/server-core` (the server-core build runs
it as its last step) and commit the result; a stale copy fails
`apps/server-core/test/unit/config/schema.spec.ts`. It is committed rather than
generated at deploy time because the documentation workflow builds the
documentation alone.

## Pending: `hero-admin.png`

`Hero.vue` expects an admin-UI screenshot at this path:

```
docs/src/public/hero-admin.png
```

Suggested specs:

- Aspect ratio close to `16:10` (the hero card uses `aspect-ratio: 16 / 10`).
- Width ≥ `1200px` for retina.
- Show a representative admin screen — user list, role editor or realm overview.
- Trim browser chrome (the hero already provides a traffic-light window frame).

Until the file is added, `Hero.vue` shows a CSS skeleton placeholder.
