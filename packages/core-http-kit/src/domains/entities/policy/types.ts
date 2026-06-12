/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type { BuildInput } from 'rapiq';

import type { BuiltInPolicies } from '@authup/access';
import type { Policy } from '@authup/core-kit';

export type PolicyAPICheckResponse = {
    status: 'success' | 'error',
    data?: Record<string, any>
};

export type PolicyResponse = Policy & Record<string, any>;

export type BuiltInPolicyResponse<
    T extends Record<string, any> = Record<string, any>,
> = Omit<Policy, 'type'> & BuiltInPolicies<T>;

// Mirrors `PolicyValidator` mounts in @authup/core-kit. Policies carry dynamic per-type
// attributes loaded as extra-attributes; the `& Record<string, any>` keeps those open.
type PolicyValidatedFields = Pick<Policy, 'name' | 'type'> &
    Partial<Pick<Policy, 'display_name' | 'invert' | 'parent_id' | 'realm_id'>>;
export type PolicyCreatePayload = PolicyValidatedFields & Record<string, any>;
export type PolicyUpdatePayload = Partial<PolicyValidatedFields> & Record<string, any>;
export type PolicySavePayload = PolicyCreatePayload;

export type BuiltInPolicyCreatePayload<
    T extends Record<string, any> = Record<string, any>,
> = Omit<PolicyValidatedFields, 'type'> & BuiltInPolicies<T>;
export type BuiltInPolicyUpdatePayload<
    T extends Record<string, any> = Record<string, any>,
> = Partial<Omit<PolicyValidatedFields, 'type'>> & Partial<BuiltInPolicies<T>>;

export interface IPolicyAPI {
    getMany<OUTPUT extends PolicyResponse = PolicyResponse>(
        data?: BuildInput<Policy & { parent_id?: string | null }>,
    ) : Promise<EntityCollectionResponse<OUTPUT>>;
    delete<OUTPUT extends PolicyResponse = PolicyResponse>(id: Policy['id']) : Promise<EntityRecordResponse<OUTPUT>>;
    getOne<OUTPUT extends PolicyResponse = PolicyResponse>(id: Policy['id'], record?: BuildInput<Policy>) : Promise<EntityRecordResponse<OUTPUT>>;
    getOneExpanded<OUTPUT extends PolicyResponse = PolicyResponse>(id: Policy['id'], record?: BuildInput<Policy>) : Promise<EntityRecordResponse<OUTPUT>>;
    create<INPUT extends PolicyCreatePayload = PolicyCreatePayload, OUTPUT extends PolicyResponse = PolicyResponse>(
        data: INPUT,
    ) : Promise<EntityRecordResponse<OUTPUT>>;
    createBuiltIn(data: BuiltInPolicyCreatePayload) : Promise<EntityRecordResponse<BuiltInPolicyResponse>>;
    update<INPUT extends PolicyUpdatePayload = PolicyUpdatePayload, OUTPUT extends PolicyResponse = PolicyResponse>(
        id: Policy['id'],
        data: INPUT,
    ) : Promise<EntityRecordResponse<OUTPUT>>;
    updateBuiltIn(id: Policy['id'], data: BuiltInPolicyUpdatePayload) : Promise<EntityRecordResponse<BuiltInPolicyResponse>>;
    createOrUpdate<INPUT extends PolicyCreatePayload = PolicyCreatePayload, OUTPUT extends PolicyResponse = PolicyResponse>(
        idOrName: string,
        data: INPUT,
    ) : Promise<EntityRecordResponse<OUTPUT>>;
    createOrUpdateBuiltin(idOrName: string, data: BuiltInPolicyCreatePayload) : Promise<EntityRecordResponse<BuiltInPolicyResponse>>;
    check(idOrName: string, data?: Record<string, any>) : Promise<PolicyAPICheckResponse>;
}
