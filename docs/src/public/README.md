# Public assets

Files in this directory are served from the root of the docs site.

## Generated: `schema/config.json`

The JSON Schema of `authup.yml`, served at `https://authup.org/schema/config.json`
so the `# yaml-language-server: $schema=` line of a configuration file resolves.

It is GENERATED and not committed: `.github/workflows/docs.yml` builds the CLI and
writes the file before the site is built, so the published document can never lag
behind the configuration keys. Its shape is pinned by
`packages/server-config/test/unit/schema.spec.ts`.

To serve it while working on the docs locally, write it yourself:

```shell
npx nx build authup
node apps/authup/dist/index.mjs config schema > docs/src/public/schema/config.json
```
