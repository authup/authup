/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { Scope } from '@authup/core-kit';
import type { ObjectLiteral } from '@authup/kit';
import type { ProvisioningContainer } from '../../types.ts';

export type ScopeProvisioningContainer = ProvisioningContainer<Partial<Scope>, ObjectLiteral>;
