/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DomainType } from '../contstants';
import type { DomainEventBaseContext } from '../types-base';

export interface Realm {
    id: string;

    name: string;

    description: string | null;

    drop_able: boolean;

    created_at: string;

    updated_at: string;
}

export type RealmEventContext = DomainEventBaseContext & {
    type: `${DomainType.REALM}`,
    data: Realm
};
