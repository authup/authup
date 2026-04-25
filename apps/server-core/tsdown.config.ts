import { defineConfig } from 'tsdown';
import swc from 'unplugin-swc';

export default defineConfig({
    entry: ['src/**/*.ts'],
    format: 'esm',
    unbundle: true,
    dts: false,
    sourcemap: true,
    shims: true,
    // The Vite-built UI lives at dist/ui/. tsdown's default `clean: true` would
    // wipe it on every server-only rebuild. Top-level `npm run build` does the
    // full clean via `rimraf ./dist` before this runs.
    clean: false,
    plugins: [
        swc.rolldown({
            jsc: {
                parser: {
                    syntax: 'typescript',
                    decorators: true,
                },
                transform: {
                    legacyDecorator: true,
                    decoratorMetadata: true,
                },
            },
        }),
    ],
});
