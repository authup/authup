/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TypedToken } from 'eldin';
import type { DatabaseLock } from '../../../adapters/database/helpers/index.ts';
import type { IRealmProvisioner } from '../../../core/index.ts';

/**
 * The mutex one provisioning pass holds against every other. The values are
 * arbitrary, but they must stay STABLE across releases: a changed key is a
 * different mutex, so during a rolling deploy the outgoing and the incoming
 * replica would each hold their own and provision at the same time.
 */
export const PROVISIONING_DATABASE_LOCK: DatabaseLock = {
    name: 'authup:provisioning',
    key: [16725, 1],
};

export const ProvisioningInjectionKey = {
    /**
     * Registered by ProvisionerModule.setup iff the loaded provisioning
     * data carries a wildcard realm entry. Resolved lazily (request time)
     * by the realm controller factory, so the HTTP module never depends
     * on provisioning-module boot order.
     */
    WildcardRealmProvisioner: new TypedToken<IRealmProvisioner>('WildcardRealmProvisioner'),
} as const;
