/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthorizationCatalog, AuthorizationGrant, IdentityPolicyData } from '@authup/access';
import { isAuthorizationCatalogStaleError, reachesRecord } from '@authup/access';
import { describe, expect, it } from 'vitest';
import { AuthorizationCatalogCache } from '../../src/core/index.ts';

const identity : IdentityPolicyData = {
    id: '245e3c5d-5747-4fbd-8554-c33d34780c58',
    type: 'user',
    realmId: 'c641912c-21e5-4cb4-84b6-169e2b2bb023',
    realmName: 'master',
    clientId: null,
};

function buildCatalog(names: string[]) : AuthorizationCatalog {
    return {
        policies: { binding: { type: 'permissionBinding' } },
        permissions: names.map((name) => ({
            name,
            realmId: null,
            clientId: null,
            decisionStrategy: null,
            policies: ['binding'],
        })),
    };
}

function buildGrant(name: string) : AuthorizationGrant {
    return {
        name,
        realm_id: null,
        client_id: null,
        realm_scope: 'any',
        policies: [],
    };
}

describe('core/authorization/catalog-cache', () => {
    it('reads the catalog once and shares it between concurrent callers', async () => {
        const pending = Promise.withResolvers<AuthorizationCatalog>();
        let reads = 0;
        const cache = new AuthorizationCatalogCache({
            read: () => {
                reads++;

                return pending.promise;
            },
        });

        const all = Promise.all([cache.get(), cache.get(), cache.get()]);

        pending.resolve(buildCatalog(['post_read']));

        const [a, b, c] = await all;

        expect(reads).toBe(1);
        expect(a).toBe(b);
        expect(b).toBe(c);
        expect(await cache.get()).toBe(a);
        expect(reads).toBe(1);
    });

    it('does not keep a failed read', async () => {
        let reads = 0;
        const cache = new AuthorizationCatalogCache({
            read: async () => {
                reads++;

                if (reads === 1) {
                    throw new Error('unreachable');
                }

                return buildCatalog(['post_read']);
            },
        });

        await expect(cache.get()).rejects.toThrow('unreachable');
        await expect(cache.get()).resolves.toEqual(buildCatalog(['post_read']));
        expect(reads).toBe(2);
    });

    it('builds an evaluator over the cached catalog', async () => {
        let reads = 0;
        const cache = new AuthorizationCatalogCache({
            read: async () => {
                reads++;

                return buildCatalog(['post_read']);
            },
        });

        const first = await cache.createEvaluator({ identity, grants: [buildGrant('post_read')] });
        const second = await cache.createEvaluator({ identity, grants: [buildGrant('post_read')] });

        expect(await reachesRecord(first, { name: 'post_read', realm: false })).toBe(true);
        expect(await reachesRecord(second, { name: 'post_read', realm: false })).toBe(true);
        expect(reads).toBe(1);
    });

    it('refetches once when the catalog is stale', async () => {
        const catalogs = [buildCatalog(['post_read']), buildCatalog(['post_read', 'post_update'])];
        let reads = 0;
        const cache = new AuthorizationCatalogCache({ read: async () => catalogs[Math.min(reads++, 1)] });

        await cache.get();

        const evaluator = await cache.createEvaluator({ identity, grants: [buildGrant('post_update')] });

        expect(await reachesRecord(evaluator, { name: 'post_update', realm: false })).toBe(true);
        expect(reads).toBe(2);
        expect(await cache.get()).toBe(catalogs[1]);
    });

    it('shares one refetch between concurrent stale callers', async () => {
        const catalogs = [buildCatalog(['post_read']), buildCatalog(['post_read', 'post_update'])];
        let reads = 0;
        const cache = new AuthorizationCatalogCache({ read: async () => catalogs[Math.min(reads++, 1)] });

        await cache.get();

        await Promise.all([
            cache.createEvaluator({ identity, grants: [buildGrant('post_update')] }),
            cache.createEvaluator({ identity, grants: [buildGrant('post_update')] }),
        ]);

        expect(reads).toBe(2);
    });

    it('throws when the refetched catalog is still stale', async () => {
        let reads = 0;
        const cache = new AuthorizationCatalogCache({
            read: async () => {
                reads++;

                return buildCatalog(['post_read']);
            },
        });

        await expect(cache.createEvaluator({ identity, grants: [buildGrant('post_update')] }))
            .rejects.toSatisfy(isAuthorizationCatalogStaleError);
        expect(reads).toBe(2);
    });

    it('drops the cached catalog on invalidate', async () => {
        let reads = 0;
        const cache = new AuthorizationCatalogCache({
            read: async () => {
                reads++;

                return buildCatalog(['post_read']);
            },
        });

        await cache.get();
        cache.invalidate();
        await cache.get();

        expect(reads).toBe(2);
    });
});
