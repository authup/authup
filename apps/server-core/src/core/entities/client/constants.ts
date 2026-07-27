/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionName } from '@authup/core-kit';

/**
 * The client read-permission disjunction: holding ANY of these grants
 * read access to client rows. Shared between `ClientService`'s
 * getMany/getOne pre-gates and the schema-level `secret` visibility
 * gate (issue #3322) — the two MUST evaluate the same disjunction, or
 * listability and secret visibility silently diverge.
 */
export const CLIENT_READ_PERMISSIONS : PermissionName[] = [
    PermissionName.CLIENT_READ,
    PermissionName.CLIENT_UPDATE,
    PermissionName.CLIENT_DELETE,
];
