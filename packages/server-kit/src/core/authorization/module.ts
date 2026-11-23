/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthorizationEvaluatorInput, IPermissionEvaluator } from '@authup/access';
import { createAuthorizationEvaluator, isAuthorizationCatalogStaleError } from '@authup/access';
import type { AuthorizationCatalogCacheOptions, IAuthorizationCatalogCache } from './types.ts';

type Catalog = AuthorizationEvaluatorInput['catalog'];

/**
 * 60 seconds: the backstop the server's own tagged read cache keeps for
 * the catalog reads, so a resource server lags a policy edit no longer
 * than the server can, and a busy one reads the catalog once a minute.
 */
export const AUTHORIZATION_CATALOG_CACHE_MAX_AGE = 60_000;

/**
 * The authorization catalog of a resource server, read once per `maxAge`.
 * A stale catalog is dropped only by the caller that found it stale on the
 * read it used, so concurrent stale callers share one refetch.
 */
export class AuthorizationCatalogCache implements IAuthorizationCatalogCache {
    protected options: AuthorizationCatalogCacheOptions;

    protected current: Promise<Catalog> | undefined;

    /**
     * When the current read resolved; undefined while it is pending, which
     * never expires.
     */
    protected readAt: number | undefined;

    protected maxAge: number;

    constructor(options: AuthorizationCatalogCacheOptions) {
        const maxAge = options.maxAge ?? AUTHORIZATION_CATALOG_CACHE_MAX_AGE;

        if (
            typeof maxAge !== 'number' ||
            Number.isNaN(maxAge) ||
            maxAge < 0
        ) {
            throw new TypeError('The catalog cache maxAge must be a number of milliseconds >= 0, or Infinity.');
        }

        this.options = options;
        this.maxAge = maxAge;
    }

    get(): Promise<Catalog> {
        if (
            this.current &&
            typeof this.readAt !== 'undefined' &&
            Date.now() - this.readAt >= this.maxAge
        ) {
            this.current = undefined;
        }

        if (!this.current) {
            const read = this.options.read();

            this.current = read;
            this.readAt = undefined;

            read.then(() => {
                if (this.current === read) {
                    this.readAt = Date.now();
                }
            }, () => {
                if (this.current === read) {
                    this.current = undefined;
                }
            });
        }

        return this.current;
    }

    invalidate(): void {
        this.current = undefined;
    }

    async createEvaluator(input: Omit<AuthorizationEvaluatorInput, 'catalog'>): Promise<IPermissionEvaluator> {
        const read = this.get();

        try {
            return await createAuthorizationEvaluator({ ...input, catalog: await read }, this.options.evaluator);
        } catch (e) {
            if (!isAuthorizationCatalogStaleError(e)) {
                throw e;
            }
        }

        if (this.current === read) {
            this.current = undefined;
        }

        return createAuthorizationEvaluator({ ...input, catalog: await this.get() }, this.options.evaluator);
    }
}
