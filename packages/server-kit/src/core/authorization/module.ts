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
 * The authorization catalog of a resource server, read once per process.
 * A stale catalog is dropped only by the caller that found it stale on the
 * read it used, so concurrent stale callers share one refetch.
 */
export class AuthorizationCatalogCache implements IAuthorizationCatalogCache {
    protected options: AuthorizationCatalogCacheOptions;

    protected current: Promise<Catalog> | undefined;

    constructor(options: AuthorizationCatalogCacheOptions) {
        this.options = options;
    }

    get(): Promise<Catalog> {
        if (!this.current) {
            const read = this.options.read();

            this.current = read;

            read.catch(() => {
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
