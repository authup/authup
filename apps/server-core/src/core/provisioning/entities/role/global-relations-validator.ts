/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RoleProvisioningRelationsValidator } from './relations-validator.ts';

/**
 * The relations of a role declared at the top level, which has no realm.
 */
export class GlobalRoleProvisioningRelationsValidator extends RoleProvisioningRelationsValidator {
    protected isGlobal(): boolean {
        return true;
    }
}
