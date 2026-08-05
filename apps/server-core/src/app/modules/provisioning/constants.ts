/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TypedToken } from 'eldin';
import type { IRealmProvisioner } from '../../../core/index.ts';

export const ProvisioningInjectionKey = {
    /**
     * Registered by ProvisionerModule.setup iff the loaded provisioning
     * data carries a wildcard realm entry. Resolved lazily (request time)
     * by the realm controller factory, so the HTTP module never depends
     * on provisioning-module boot order.
     */
    WildcardRealmProvisioner: new TypedToken<IRealmProvisioner>('WildcardRealmProvisioner'),
} as const;
