/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { GlobalRoleProvisioningRelationsValidator } from './global-relations-validator.ts';
import type { RoleProvisioningRelationsValidator } from './relations-validator.ts';
import { RoleProvisioningValidator } from './validator.ts';

/**
 * A role declared at the top level, which has no realm.
 */
export class GlobalRoleProvisioningValidator extends RoleProvisioningValidator {
    protected createRelationsValidator(): RoleProvisioningRelationsValidator {
        return new GlobalRoleProvisioningRelationsValidator();
    }
}
