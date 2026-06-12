/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IEntityAPISlim } from '../../types-base';

import type { ClientScope } from '@authup/core-kit';

// Mirrors `ClientScopeValidator` mounts in @authup/core-kit.
export type ClientScopeCreatePayload = Pick<ClientScope, 'client_id' | 'scope_id'>;

export interface IClientScopeAPI extends IEntityAPISlim<ClientScope, ClientScopeCreatePayload> {}
