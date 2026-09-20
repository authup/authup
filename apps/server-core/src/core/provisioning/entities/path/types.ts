/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { Path, Realm } from '@authup/core-kit';
import type { BaseProvisioningEntity } from '../types.ts';

export type PathProvisioningEntity = BaseProvisioningEntity<Path> & {
    attributes: {
        /**
         * The full slash path of the folder. The chain above it is derived
         * from this value, so a file never spells `name` or `parentId`.
         */
        path: string,

        displayName?: string | null,

        description?: string | null,

        /**
         * Stamped by the realm synchronizer from the realm the entry is
         * nested in; a file never carries it.
         */
        realmId?: Realm['id'],
    }
};
