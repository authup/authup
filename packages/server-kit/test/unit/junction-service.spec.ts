/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/* eslint-disable max-classes-per-file */

import { describe, expect, it } from 'vitest';
import { JunctionEntityService } from '../../src/core/index.ts';

class ColumnJunction extends JunctionEntityService {
    protected readonly ownerRealm = { key: 'roleRealmId' } as const;

    realm(entity: Record<string, any>) {
        return this.junctionResourceRealm(entity);
    }
}

class FixedJunction extends JunctionEntityService {
    protected readonly ownerRealm = { realm: 'blog' } as const;

    realm(entity: Record<string, any>) {
        return this.junctionResourceRealm(entity);
    }
}

class ResolvedJunction extends JunctionEntityService {
    protected readonly ownerRealm = { realm: (entity: Record<string, any>) => entity.postRealm ?? null };

    realm(entity: Record<string, any>) {
        return this.junctionResourceRealm(entity);
    }
}

class RealmlessJunction extends JunctionEntityService {
    protected readonly ownerRealm = { realm: false } as const;

    realm(entity: Record<string, any>) {
        return this.junctionResourceRealm(entity);
    }
}

// @ts-expect-error a junction must declare where its owner realm comes from
class UndeclaredJunction extends JunctionEntityService {}

class BothJunction extends JunctionEntityService {
    // @ts-expect-error a column and a resolved realm exclude each other
    protected readonly ownerRealm = { key: 'roleRealmId', realm: 'blog' };
}

describe('JunctionEntityService', () => {
    it('reads the owner realm from the declared column, raw', () => {
        const service = new ColumnJunction();

        expect(service.realm({ roleRealmId: 'r1', realmId: 'other' })).toBe('r1');
        expect(service.realm({ roleRealmId: null })).toBeNull();
        expect(service.realm({})).toBeUndefined();
    });

    it('answers a fixed owner realm for every row', () => {
        const service = new FixedJunction();

        expect(service.realm({ roleRealmId: 'r1' })).toBe('blog');
        expect(service.realm({})).toBe('blog');
    });

    it('resolves the owner realm per row', () => {
        const service = new ResolvedJunction();

        expect(service.realm({ postRealm: 'r2' })).toBe('r2');
        expect(service.realm({})).toBeNull();
    });

    it('answers false for an owner of no realm', () => {
        expect(new RealmlessJunction().realm({ postId: 'p1' })).toBe(false);
    });

    it('keeps the compile-time declarations honest', () => {
        expect(UndeclaredJunction).toBeDefined();
        expect(BothJunction).toBeDefined();
    });
});
