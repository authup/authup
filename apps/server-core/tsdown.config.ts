import { defineConfig } from 'tsdown';
import swc from 'unplugin-swc';

export default defineConfig({
    entry: {
        index: 'src/index.ts',
        cli: 'src/cli/index.ts',
    },
    format: 'esm',
    sourcemap: true,
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
