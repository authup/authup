/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '@authup/core-kit';
import { ValidationError } from '@authup/errors';
import type { IRealmRepository } from './types.ts';

/**
 * Whether a resource of `resourceRealmId` may be referenced from `realmId`:
 * a global resource (null) from anywhere, a realm's own resource only from
 * that realm. Not symmetric: a null `realmId` reaches global resources only.
 */
export function isRealmReachable(
    resourceRealmId: string | null | undefined,
    realmId: string | null | undefined,
) : boolean {
    return !resourceRealmId || resourceRealmId === (realmId ?? null);
}

/**
 * Resolve the realm a request BODY names (id or name). A key that names no
 * realm is a malformed request rather than a missing row, so it is refused
 * with a ValidationError (400) instead of matching nothing.
 */
export async function resolveBodyRealm(
    repository: Pick<IRealmRepository, 'resolve'>,
    key: string,
) : Promise<Realm> {
    const realm = await repository.resolve(key);
    if (!realm) {
        throw new ValidationError(`The realmId '${key}' does not reference an existing realm.`);
    }

    return realm;
}
