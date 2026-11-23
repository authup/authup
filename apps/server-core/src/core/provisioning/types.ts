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

/**
 * Handed down by a synchronizer that owns a set of entities (a realm), so
 * the relations between them are bound only once every one of them exists.
 */
export type ProvisioningSynchronizeContext = {
    /**
     * Queue a relation binding for after the entities of the set.
     */
    defer(task: () => Promise<void>): void,
};

/**
 * Gives a client-owned permission or role stored without a realm the realm
 * of its client in every row that refers to it, so a realm-scoped read or
 * delete of those rows reaches them. The row itself is the caller's.
 */
export interface IProvisioningRealmRepairer {
    repairPermission(id: string, realmId: string): Promise<void>;
    repairRole(id: string, realmId: string): Promise<void>;
}

export interface IProvisioningSynchronizer<T> {
    synchronize(input: T, context?: ProvisioningSynchronizeContext) : Promise<T>;
    synchronizeMany(input: T[], context?: ProvisioningSynchronizeContext) : Promise<T[]>;
}
