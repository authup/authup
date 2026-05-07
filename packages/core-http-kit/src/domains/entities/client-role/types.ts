/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientRole } from '@authup/core-kit';

// Mirrors `ClientRoleValidator` mounts in @authup/core-kit.
export type ClientRoleCreatePayload = Pick<ClientRole, 'client_id' | 'role_id'>;
