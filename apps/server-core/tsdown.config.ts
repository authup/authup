import { defineConfig } from 'tsdown';
import swc from 'unplugin-swc';

export default defineConfig({
    entry: ['src/**/*.ts'],
    format: 'esm',
    unbundle: true,
    dts: false,
    sourcemap: true,
    shims: true,
    clean: true,
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
