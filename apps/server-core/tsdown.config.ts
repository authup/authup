import { defineConfig } from 'tsdown';
import swc from 'unplugin-swc';

export default defineConfig({
    entry: ['src/**/*.ts'],
    format: 'esm',
    unbundle: true,
    dts: false,
    sourcemap: true,
    shims: true,
    // The Vite-built UI lives at dist/ui/. tsdown's default `clean: true`
    // would wipe it on every server-only rebuild. Restrict cleaning to the
    // server-emitted subtrees so dist/ui survives `build:server`, while still
    // removing orphan files from renamed/deleted source modules.
    clean: ['dist/**', '!dist/ui/**'],
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
