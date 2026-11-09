/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IEntitySchemaAPI } from '../../stats';
import type { IEntityAPI } from '../../types-base';

import type { ClientTokenExchangeCapability } from '@authup/core-kit';

// Mirrors `ClientTokenExchangeCapabilityValidator` mounts in @authup/core-kit.
export type ClientTokenExchangeCapabilityCreatePayload = Pick<ClientTokenExchangeCapability, 'clientId' | 'audience' | 'value' | 'maxAge'> &
    Partial<Pick<ClientTokenExchangeCapability, 'realmScope'>>;
export type ClientTokenExchangeCapabilityUpdatePayload = Partial<Pick<
    ClientTokenExchangeCapability,
    'audience' | 'value' | 'maxAge' | 'realmScope'
>>;

export interface IClientTokenExchangeCapabilityAPI extends IEntityAPI<
    ClientTokenExchangeCapability,
    ClientTokenExchangeCapabilityCreatePayload,
    ClientTokenExchangeCapabilityUpdatePayload
>,
    IEntitySchemaAPI {}
