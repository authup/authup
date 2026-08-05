/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '@authup/core-kit';
import type { RootProvisioningEntity } from './entities/index.ts';
import type { IContainer } from 'eldin';

export interface IProvisioningSource {
    load(container: IContainer) : Promise<RootProvisioningEntity>;
}

/**
 * A provisioner invoked for one realm: at startup (backfill over every
 * existing realm) and on runtime realm creation (`RealmService.save`).
 * Implementations must be idempotent; a failure must never fail realm
 * creation (the caller logs and continues).
 */
export interface IRealmProvisioner {
    ensureForRealm(realm: Realm): Promise<void>;
}

export interface IProvisioningSynchronizer<T> {
    synchronize(input: T) : Promise<T>;
    synchronizeMany(input: T[]) : Promise<T[]>;
}
