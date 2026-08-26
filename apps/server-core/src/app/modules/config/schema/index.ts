/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The config schema MECHANISM, and the extraction boundary for it: the
 * folder is generic over any config type and imports nothing from
 * server-core, so no relative specifier may leave it (bare third-party
 * specifiers and ./ siblings only). What it holds is the declaration
 * shape, the environment readers, and the four passes over a registry
 * (environment, defaults, validator mounts, JSON Schema); WHICH keys
 * exist is the caller's registry, not its business.
 *
 * Plan 101 stage C: D2 lifts the folder into a package so each server
 * package declares its own registry and the CLI composes them.
 */

export * from './defaults.ts';
export * from './env.ts';
export * from './json-schema.ts';
export * from './types.ts';
export * from './validator.ts';
