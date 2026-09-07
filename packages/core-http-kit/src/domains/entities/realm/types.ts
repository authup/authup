/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    DomainEntityID,
    EntityRecordMeta,
    EntityRecordResponse,
    IEntityAPI,
} from '../../types-base';
import type { EntityQueryInput } from '../../../helpers';

import type { Realm } from '@authup/core-kit';

// Mirrors `RealmValidator` mounts in @authup/core-kit.
export type RealmCreatePayload = Pick<Realm, 'name'> &
    Partial<Pick<Realm, 'displayName' | 'description'>>;
export type RealmUpdatePayload = Partial<RealmCreatePayload>;
export type RealmSavePayload = RealmCreatePayload;

/**
 * The realm's OpenID surface, derived from the deployment's public url and
 * the realm name. Rides the record read's `meta` only: `data` stays the
 * entity row, and the collection carries none of it.
 */
export type RealmEndpoints = {
    issuer: string,
    openidConfiguration: string,
    jwks: string,
};

export type RealmRecordMeta = EntityRecordMeta & {
    endpoints: RealmEndpoints,
};

export type RealmRecordResponse = EntityRecordResponse<Realm, RealmRecordMeta>;

export interface IRealmAPI extends IEntityAPI<Realm, RealmCreatePayload, RealmUpdatePayload> {
    getOne(id: DomainEntityID<Realm>, record?: EntityQueryInput<Realm>) : Promise<RealmRecordResponse>;

    createOrUpdate(idOrName: string, data: RealmSavePayload) : Promise<EntityRecordResponse<Realm>>;
}
