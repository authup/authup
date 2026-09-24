/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EventScope } from '../event';
import type { Realm } from '../realm';

/**
 * Daily count of security events per (realm, scope, name, refType).
 */
export interface EventAggregate {
    id: string;

    /**
     * UTC calendar day, `YYYY-MM-DD`.
     */
    date: string;

    realmId: Realm['id'] | null;

    realm?: Realm | null;

    scope: `${EventScope}`;

    name: string;

    refType: string | null;

    count: number;

    createdAt: string;
}
