/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The configuration keys more than one authup server package reads.
 *
 * `@authup/server-config-kit` is the MECHANISM (the declaration shape, the
 * environment readers, the passes over a registry). This package is the one
 * set of KEYS that mechanism is not free to leave to each caller, because
 * more than one caller reads them and none of them may import another.
 */

export * from './constants';
export * from './origins';
export * from './schema';
export * from './types';
