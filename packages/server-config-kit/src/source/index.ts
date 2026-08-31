/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Where a configuration VALUE comes from. One module per source, in
 * precedence order (defaults, then the file, then the environment), plus
 * `mergeSchemaData`, which is how a caller layers them.
 */

export * from './defaults.ts';
export * from './env.ts';
export * from './file.ts';
export * from './merge.ts';
