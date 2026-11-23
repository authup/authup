/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    AuthorizationEvaluatorInput,
    AuthorizationEvaluatorOptions,
    IPermissionEvaluator,
} from '@authup/access';

export type AuthorizationCatalogCacheOptions = {
    /**
     * Reads the catalog `GET /authorization` serves, with the resource
     * server's own credential (e.g. `client.authorization.get()`).
     */
    read: () => Promise<AuthorizationEvaluatorInput['catalog']>,
    /**
     * How long a catalog read is served, in milliseconds (default
     * {@link AUTHORIZATION_CATALOG_CACHE_MAX_AGE}); the next caller after it
     * reads again. A policy edited on the server is not seen before. Pass
     * `Infinity` to keep the catalog until a stale grant or `invalidate()`.
     */
    maxAge?: number,
    /**
     * Handed to every `createAuthorizationEvaluator` call.
     */
    evaluator?: AuthorizationEvaluatorOptions,
};

export interface IAuthorizationCatalogCache {
    /**
     * The catalog, read once per `maxAge`. Concurrent callers share one
     * read; a failed read is not kept.
     */
    get(): Promise<AuthorizationEvaluatorInput['catalog']>;

    /**
     * Drop the cached catalog, so the next caller reads it again.
     */
    invalidate(): void;

    /**
     * An evaluator over the cached catalog. A catalog the grants outdate
     * (`AuthorizationCatalogStaleError`) is read again once; still stale,
     * the error propagates.
     */
    createEvaluator(input: Omit<AuthorizationEvaluatorInput, 'catalog'>): Promise<IPermissionEvaluator>;
}
