/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The config schema MECHANISM: generic over any config type, and carrying
 * NO `@authup/*` dependency at all, so a server package can read its own
 * configuration without depending on server-core and without inheriting
 * server-kit's tail. What it holds is the declaration shape, the
 * environment readers and the passes over a registry (environment, file
 * tree, defaults, validator mounts, JSON Schema); WHICH keys exist is the
 * caller's registry, not this package's business.
 *
 * For authup itself that registry is `@authup/server-config`, which declares
 * every key of `authup.yml` once and lets each service SELECT the keys it
 * reads (plan 101 stage C).
 */

export * from './defaults.ts';
export * from './env.ts';
export * from './file.ts';
export * from './json-schema.ts';
export * from './types.ts';
export * from './validator.ts';
