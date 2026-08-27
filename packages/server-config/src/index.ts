/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The WHOLE `authup.yml` document, one module per section.
 *
 * `@authup/server-config-kit` is the MECHANISM (the declaration shape, the
 * environment readers, the passes over a registry). This package is the set
 * of KEYS: every configuration key an authup deployment understands, declared
 * exactly once, with its path, its environment variable, its default, its
 * reader and its zod type.
 *
 * A service does not declare anything. It SELECTS the keys it reads, by name,
 * out of the section schemas below, and its own config type is an
 * intersection of the section types it selected from. So a service cannot
 * mis-declare a path, an environment variable or a reader for a key another
 * service also reads, and it cannot silently forget a key either: the key is
 * either named or it is not read.
 *
 * The types the document uses for its own values are authup's own
 * (`DatabaseConnectionOptions`, `RedisConnectionOptions`,
 * `SMTPConnectionOptions`, `MiddlewareOptions`) rather than borrowed from
 * whichever library eventually consumes the value. This package sits below
 * every server package, so borrowing would drag typeorm, `@authup/server-kit`
 * and six `@routup/*` packages into a static file server that only wants to
 * know where it is published.
 */

export * from './account-console/index.ts';
export * from './admin-console/index.ts';
export * from './auth-console/index.ts';
export * from './constants.ts';
export * from './core/index.ts';
export * from './deployment/index.ts';
export * from './schema.ts';
export * from './theme/index.ts';
export * from './types.ts';
export * from './utils.ts';
