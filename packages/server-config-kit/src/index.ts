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
 * environment readers, the passes over a registry (environment, file tree,
 * defaults, validator mounts, JSON Schema) and the composer that merges
 * several registries into one; WHICH keys exist is the caller's registry,
 * not this package's business.
 *
 * Plan 101 stage C: each server package declares the registry of the keys
 * it reads, and the `authup` CLI composes them.
 */

export * from './compose.ts';
export * from './defaults.ts';
export * from './env.ts';
export * from './file.ts';
export * from './json-schema.ts';
export * from './types.ts';
export * from './validator.ts';
