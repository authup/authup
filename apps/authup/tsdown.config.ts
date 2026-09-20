import { defineConfig } from 'tsdown';

export default defineConfig({
    entry: 'src/index.ts',
    format: 'esm',
    sourcemap: true,
    // `dev/source.ts` imports vite through a bare `await import('vite')`
    // specifically so it is resolved at RUNTIME rather than pulled in at
    // build time: dev mode is reached only when a source checkout was found,
    // and whoever holds that checkout already has vite installed. Without
    // this, rolldown inlines vite's whole toolchain (esbuild, lightningcss,
    // rolldown itself) into the published CLI, which both defeats the
    // graceful "vite could not be resolved" failure `loadVite` throws and
    // multiplies the package size for a codepath a published install never
    // reaches.
    //
    // `@napi-rs/keyring` is a native optional dependency reached through an
    // `await import` in `src/host/store/keychain.ts`: a platform with no
    // prebuilt binary must still run every other command.
    deps: { neverBundle: ['vite', '@napi-rs/keyring'] },
});
