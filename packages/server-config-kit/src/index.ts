/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The config schema MECHANISM: generic over any config type, and carrying
 * `@authup/kit` as its ONE internal dependency (a foundation package holding
 * `destr` and `nanoid`), so a server package can read its own configuration
 * without depending on server-core and without inheriting server-kit's tail
 * (native @node-rs/bcrypt and jsonwebtoken, winston, redis, the socket.io
 * emitter, @rapiq/core). That tail is what `test/unit/dependencies.spec.ts`
 * pins. What it holds is the declaration shape, the
 * environment readers and the passes over a registry (environment, file
 * tree, defaults, validator mounts, JSON Schema); WHICH keys exist is the
 * caller's registry, not this package's business.
 *
 * For authup itself that registry is `@authup/server-config`, which declares
 * every key of `authup.yml` once and lets each service SELECT the keys it
 * reads (plan 101 stage C).
 *
 * One folder per concern: `schema/` declares, `entry/` is the single-key
 * primitive, `source/` is where values come from, and `json-schema/` +
 * `validation/` are the two things a registry is turned into.
 */

export * from './constants.ts';
export * from './entry/index.ts';
export * from './json-schema/index.ts';
export * from './schema/index.ts';
export * from './source/index.ts';
export * from './types.ts';
export * from './validation/index.ts';
