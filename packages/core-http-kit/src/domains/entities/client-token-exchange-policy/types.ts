/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IEntitySchemaAPI } from '../../stats';
import type { IEntityAPI } from '../../types-base';

import type { ClientTokenExchangePolicy } from '@authup/core-kit';

// Mirrors `ClientTokenExchangePolicyValidator` mounts in @authup/core-kit.
export type ClientTokenExchangePolicyCreatePayload = Pick<ClientTokenExchangePolicy, 'clientId' | 'audience' | 'capabilityTypes' | 'maxLifetime'> &
    Partial<Pick<ClientTokenExchangePolicy, 'subjectRealmScope'>>;
export type ClientTokenExchangePolicyUpdatePayload = Partial<Pick<
    ClientTokenExchangePolicy,
    'audience' | 'capabilityTypes' | 'maxLifetime' | 'subjectRealmScope'
>>;

export interface IClientTokenExchangePolicyAPI extends IEntityAPI<
    ClientTokenExchangePolicy,
    ClientTokenExchangePolicyCreatePayload,
    ClientTokenExchangePolicyUpdatePayload
>,
    IEntitySchemaAPI {}
