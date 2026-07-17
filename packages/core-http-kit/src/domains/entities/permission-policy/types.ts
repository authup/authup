/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IEntityAPISlim } from '../../types-base';

import type { PermissionPolicy } from '@authup/core-kit';

// Mirrors `PermissionPolicyValidator` mounts in @authup/core-kit.
export type PermissionPolicyCreatePayload = Pick<PermissionPolicy, 'permissionId' | 'policyId'>;
export type PermissionPolicyUpdatePayload = Partial<PermissionPolicyCreatePayload>;

export interface IPermissionPolicyAPI extends IEntityAPISlim<PermissionPolicy, PermissionPolicyCreatePayload> {}
