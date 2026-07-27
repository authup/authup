/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityRecordWrappedResponse, IEntityAPI } from '../../types-base';

import type { Scope } from '@authup/core-kit';

// Mirrors `ScopeValidator` mounts in @authup/core-kit.
export type ScopeCreatePayload = Pick<Scope, 'name'> &
    Partial<Pick<Scope, 'displayName' | 'description' | 'realmId'>>;
export type ScopeUpdatePayload = Partial<ScopeCreatePayload>;
export type ScopeSavePayload = ScopeCreatePayload;

export interface IScopeAPI extends IEntityAPI<Scope, ScopeCreatePayload, ScopeUpdatePayload> {
    createOrUpdate(idOrName: string, data: ScopeSavePayload) : Promise<EntityRecordWrappedResponse<Scope>>;
}
