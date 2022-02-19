// rollup.config.js
import fs from 'fs';

import vue from 'rollup-plugin-vue2';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import babel from '@rollup/plugin-babel';
import json from '@rollup/plugin-json';

import typescriptTransformer from 'ttypescript';
import typescript from 'rollup-plugin-typescript2';

import includePaths from 'rollup-plugin-includepaths';
import postcss from 'rollup-plugin-postcss';

const includePathOptions = {
    include: {
        vue: 'node_modules/vue/dist/vue.common.js',
    },
    external: ['vue', 'vuelidate', 'bootstrap-vue'],
};

// Get browserslist config and remove ie from es build targets
const browserList = fs.readFileSync('./.browserslistrc')
    .toString()
    .split('\n')
    .filter((entry) => entry && entry.substring(0, 2) !== 'ie');

// Extract babel preset-env config, to combine with esbrowserslist
// eslint-disable-next-line @typescript-eslint/no-var-requires
const babelPresetEnvConfig = require('./babel.config')
    .presets.filter((entry) => entry[0] === '@babel/preset-env')[0][1];

const baseConfig = {
    input: 'src/entry.ts',
    plugins: {
        replace: {
            'process.env.NODE_ENV': 'production',
            preventAssignment: true,
        },
        vue: {
            css: true,
            template: {
                isProduction: true,
            },
        },
        postVue: [
            resolve({
                extensions: ['.js', '.jsx', '.ts', '.tsx', '.vue'],
                preferBuiltins: true,
            }),
            commonjs(),
        ],
        babel: {
            exclude: 'node_modules/**',
            extensions: ['.js', '.jsx', '.ts', '.tsx', '.vue'],
            babelHelpers: 'bundled',
        },
    },
};

// ESM/UMD/IIFE shared settings: externals
// Refer to https://rollupjs.org/guide/en/#warning-treating-module-as-external-dependency
const external = [
    // list external dependencies, exactly the way it is written in the import statement.
    // eg. 'jquery'
    'vue',
    'bootstrap-vue',
    'vuelidate',
];

// UMD/IIFE shared settings: output.globals
// Refer to https://rollupjs.org/guide/en#output-globals for details
const globals = {
    // Provide global variable names to replace your external imports
    // eg. jquery: '$'
    vue: 'vue',
};

// Customize configs for individual targets
const buildFormats = [];
const esConfig = {
    ...baseConfig,
    input: 'src/entry.esm.ts',
    external,
    output: {
        file: 'dist/index.esm.js',
        format: 'esm',
        exports: 'named',
        assetFileNames: '[name]-[hash][extname]',
    },
    plugins: [
        json(),
        replace(baseConfig.plugins.replace),
        postcss({
            extract: true,
        }),
        vue(baseConfig.plugins.vue),
        ...baseConfig.plugins.postVue,
        // Only use typescript for declarations - babel will
        // do actual js transformations
        typescript({
            typescript: typescriptTransformer,
            useTsconfigDeclarationDir: true,
            emitDeclarationOnly: true,
            tsconfig: 'tsconfig.build.json',
        }),
        babel({
            ...baseConfig.plugins.babel,
            presets: [
                [
                    '@babel/preset-env', {
                        ...babelPresetEnvConfig,
                        targets: browserList,
                    },
                ],
            ],
        }),
    ],
};
buildFormats.push(esConfig);

const umdConfig = {
    ...baseConfig,
    external,
    output: {
        compact: true,
        file: 'dist/index.ssr.js',
        format: 'cjs',
        name: 'TypescriptAuth',
        exports: 'auto',
        assetFileNames: '[name]-[hash][extname]',
        globals,
    },
    plugins: [
        json(),
        replace(baseConfig.plugins.replace),
        postcss({
            extract: true,
        }),
        vue({
            ...baseConfig.plugins.vue,
            template: {
                ...baseConfig.plugins.vue.template,
                optimizeSSR: true,
            },
        }),
        includePaths(includePathOptions),
        ...baseConfig.plugins.postVue,
        babel(baseConfig.plugins.babel),
    ],
};

buildFormats.push(umdConfig);

// Export config
export default buildFormats;
